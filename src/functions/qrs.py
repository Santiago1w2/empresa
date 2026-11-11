import uuid

from src.common.auth import usuario_actual
from src.common.db import query_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, cumple_segmento, notificar
from src.common.util import cuerpo, error, ok, param

TIPOS = ("evento", "anuncio", "documento")


def _obtener_qr(codigo):
    return t("T_QRS").get_item(Key={"codigo": codigo or ""}).get("Item")


def _destino(tipo, ref_id):
    if tipo == "evento":
        return t("T_EVENTOS").get_item(Key={"eventoId": ref_id}).get("Item")
    if tipo == "anuncio":
        return t("T_ANUNCIOS").get_item(Key={"anuncioId": ref_id}).get("Item")
    if tipo == "documento":
        return t("T_DOCUMENTOS").get_item(Key={"documentoId": ref_id}).get("Item")
    return None


def _puede_ver(usuario, tipo, destino):
    if tipo == "anuncio" and usuario.get("rol") not in ("ti", "direccion") and destino.get("creadoPor") != usuario["usuarioId"]:
        return cumple_segmento(usuario, destino.get("segmento") or {})
    return True


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    b = cuerpo(evento)
    tipo = b.get("tipo") or ""
    ref_id = (b.get("refId") or "").strip()
    expira_en = (b.get("expiraEn") or "").strip()
    if tipo not in TIPOS or not ref_id:
        return error("tipo (evento, anuncio o documento) y refId son obligatorios")
    destino = _destino(tipo, ref_id)
    if not destino:
        return error("El contenido no existe", 404)
    if not _puede_ver(usuario, tipo, destino):
        return error("No puedes compartir un contenido que no está dirigido a ti", 403)
    qr = {
        "codigo": uuid.uuid4().hex[:12],
        "tipo": tipo,
        "refId": ref_id,
        "titulo": destino.get("titulo") or destino.get("nombre") or "",
        "expiraEn": expira_en,
        "usos": 0,
        "asistencias": [],
        "creadoPor": usuario["usuarioId"],
        "creadoPorNombre": usuario.get("nombre", ""),
        "creadoEn": ahora_iso(),
    }
    t("T_QRS").put_item(Item=qr)
    auditar(usuario, "crear", "qr", qr["codigo"], {"tipo": tipo, "refId": ref_id, "titulo": qr["titulo"]})
    return ok(qr, 201)


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    items = query_todo(
        t("T_QRS"),
        IndexName="por-creador",
        KeyConditionExpression="#c = :c",
        ExpressionAttributeNames={"#c": "creadoPor"},
        ExpressionAttributeValues={":c": usuario["usuarioId"]},
    )
    items.sort(key=lambda q: q.get("creadoEn", ""), reverse=True)
    return ok(items[:100])


def obtener(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    qr = _obtener_qr(param(evento, "id"))
    if not qr:
        return error("QR no encontrado", 404)
    if qr.get("expiraEn") and qr["expiraEn"] < ahora_iso():
        return error("Este QR expiró", 410)
    destino = _destino(qr.get("tipo"), qr.get("refId"))
    if not destino:
        return error("El contenido ya no está disponible", 404)
    if not _puede_ver(usuario, qr.get("tipo"), destino):
        return error("Este QR abre un contenido no dirigido a ti", 403)
    qr["usos"] = (qr.get("usos") or 0) + 1
    t("T_QRS").put_item(Item=qr)
    asistencias = qr.get("asistencias") or []
    es_gestor = (
        usuario["usuarioId"] == qr.get("creadoPor")
        or usuario["usuarioId"] == destino.get("creadoPor")
        or usuario.get("rol") in ("ti", "direccion")
    )
    datos = {
        "qr": {
            "codigo": qr.get("codigo"),
            "tipo": qr.get("tipo"),
            "refId": qr.get("refId"),
            "titulo": qr.get("titulo"),
            "expiraEn": qr.get("expiraEn") or "",
            "creadoPorNombre": qr.get("creadoPorNombre", ""),
        },
        "destino": destino,
        "yaRegistrado": any(a.get("usuarioId") == usuario["usuarioId"] for a in asistencias),
    }
    if qr.get("tipo") == "evento" and es_gestor:
        datos["asistencias"] = asistencias
        datos["totalAsistencias"] = len(asistencias)
    return ok(datos)


def checkin(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    qr = _obtener_qr(param(evento, "id"))
    if not qr:
        return error("QR no encontrado", 404)
    if qr.get("tipo") != "evento":
        return error("Este QR no es de entrada a una actividad")
    if qr.get("expiraEn") and qr["expiraEn"] < ahora_iso():
        return error("Este QR expiró", 410)
    destino = _destino("evento", qr.get("refId"))
    if not destino:
        return error("La actividad ya no está disponible", 404)
    asistencias = qr.get("asistencias") or []
    ya = any(a.get("usuarioId") == usuario["usuarioId"] for a in asistencias)
    if not ya:
        asistencias.append(
            {
                "usuarioId": usuario["usuarioId"],
                "nombre": usuario.get("nombre", ""),
                "rol": usuario.get("rol", ""),
                "grado": usuario.get("grado", ""),
                "seccion": usuario.get("seccion", ""),
                "cuando": ahora_iso(),
            }
        )
        qr["asistencias"] = asistencias[-500:]
        t("T_QRS").put_item(Item=qr)
        auditar(usuario, "registrar-asistencia", "evento", qr.get("refId"), {"qr": qr.get("codigo")})
        if destino.get("creadoPor") and destino.get("creadoPor") != "sistema":
            notificar(
                [destino["creadoPor"]],
                "Asistencia registrada",
                (usuario.get("nombre") or "") + " ingresó a «" + (qr.get("titulo") or "") + "»",
                "/qr/" + qr.get("codigo", ""),
            )
    return ok({"registrado": True, "yaEstaba": ya, "total": len(qr.get("asistencias") or [])})
