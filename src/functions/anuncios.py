import uuid

from src.common.auth import usuario_actual
from src.common.catalogo import obtener_catalogo
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, cumple_segmento, notificar, usuarios_segmento
from src.common.util import consulta, cuerpo, error, ok, param


def _notificar_segmento(anuncio):
    usuarios = usuarios_segmento(anuncio.get("segmento") or {})
    tipo = "urgente" if anuncio.get("prioridad") == "urgente" else "anuncio"
    notificar(
        [u["usuarioId"] for u in usuarios],
        "Nuevo anuncio",
        anuncio.get("titulo", ""),
        "/anuncios/" + anuncio["anuncioId"],
        tipo,
    )


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    categoria = consulta(evento, "categoria") or ""
    solo_no_leidos = consulta(evento, "noLeidos") == "1"
    leidos = {
        l["anuncioId"]
        for l in query_todo(
            t("T_LECTURAS"),
            IndexName="por-usuario",
            KeyConditionExpression="#u = :u",
            ExpressionAttributeNames={"#u": "usuarioId"},
            ExpressionAttributeValues={":u": usuario["usuarioId"]},
        )
    }
    salida = []
    for a in scan_todo(t("T_ANUNCIOS")):
        if a.get("estado") != "PUBLICADO":
            continue
        if not cumple_segmento(usuario, a.get("segmento") or {}):
            continue
        a["leido"] = a["anuncioId"] in leidos
        salida.append(a)
    if categoria:
        salida = [a for a in salida if a.get("categoria") == categoria]
    if solo_no_leidos:
        salida = [a for a in salida if not a["leido"]]
    salida.sort(key=lambda a: a.get("creadoEn", ""), reverse=True)
    salida.sort(key=lambda a: not a.get("fija", False))
    return ok(salida[:100])


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    rol = usuario.get("rol")
    b = cuerpo(evento)
    titulo = (b.get("titulo") or "").strip()
    contenido = (b.get("contenido") or "").strip()
    if not titulo or not contenido:
        return error("Título y contenido son obligatorios")
    catalogo = obtener_catalogo()
    categoria = b.get("categoria") or "Administrativo"
    if categoria not in (catalogo.get("categoriasAnuncio") or []):
        return error("Categoría inválida")
    prioridad = b.get("prioridad") or "normal"
    if prioridad not in ("normal", "importante", "urgente"):
        return error("Prioridad inválida")
    segmento = b.get("segmento") or {}
    if rol == "estudiante":
        if not segmento.get("proyectoId"):
            return error("Los estudiantes publican anuncios dentro de su proyecto")
        p = t("T_PROYECTOS").get_item(Key={"proyectoId": segmento["proyectoId"]}).get("Item")
        if not p:
            return error("Proyecto no encontrado", 404)
        if not (
            p.get("responsableId") == usuario["usuarioId"]
            or any(m.get("usuarioId") == usuario["usuarioId"] for m in p.get("equipo") or [])
        ):
            return error("No perteneces a ese proyecto", 403)
        segmento = {"proyectoId": segmento["proyectoId"]}
    elif rol == "docente":
        if not any([segmento.get("niveles"), segmento.get("grados"), segmento.get("secciones"), segmento.get("proyectoId")]):
            return error("Los docentes segmentan su anuncio por aula (nivel, grado o sección) o proyecto")
    elif rol not in ("coordinacion", "direccion", "administracion", "ti"):
        return error("Tu rol no puede publicar anuncios", 403)
    publicar_en = b.get("publicarEn") or ""
    estado = "PROGRAMADO" if publicar_en and publicar_en > ahora_iso() else "PUBLICADO"
    encuesta = b.get("encuesta") or None
    if encuesta and not (encuesta.get("pregunta") and encuesta.get("opciones")):
        encuesta = None
    anuncio = {
        "anuncioId": uuid.uuid4().hex,
        "titulo": titulo,
        "contenido": contenido,
        "categoria": categoria,
        "prioridad": prioridad,
        "segmento": segmento,
        "fija": bool(b.get("fija", False)),
        "publicarEn": publicar_en,
        "caducaEn": b.get("caducaEn") or "",
        "estado": estado,
        "adjuntos": b.get("adjuntos") or [],
        "encuesta": encuesta,
        "creadoPor": usuario["usuarioId"],
        "creadoPorNombre": usuario.get("nombre", ""),
        "creadoPorRol": rol,
        "creadoEn": ahora_iso(),
    }
    t("T_ANUNCIOS").put_item(Item=anuncio)
    if estado == "PUBLICADO":
        _notificar_segmento(anuncio)
    auditar(usuario, "crear", "anuncio", anuncio["anuncioId"], {"titulo": titulo})
    return ok(anuncio, 201)


def obtener(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    anuncio_id = param(evento, "id")
    anuncio = t("T_ANUNCIOS").get_item(Key={"anuncioId": anuncio_id}).get("Item")
    if not anuncio:
        return error("Anuncio no encontrado", 404)
    if usuario.get("rol") not in ("ti", "direccion") and not cumple_segmento(usuario, anuncio.get("segmento") or {}):
        return error("Este anuncio no está dirigido a ti", 403)
    lecturas = query_todo(
        t("T_LECTURAS"),
        KeyConditionExpression="#a = :a",
        ExpressionAttributeNames={"#a": "anuncioId"},
        ExpressionAttributeValues={":a": anuncio_id},
    )
    anuncio["leido"] = any(l.get("usuarioId") == usuario["usuarioId"] for l in lecturas)
    anuncio["totalLecturas"] = len(lecturas)
    if anuncio.get("encuesta"):
        conteos = {}
        for l in lecturas:
            voto = l.get("voto")
            if voto:
                conteos[voto] = conteos.get(voto, 0) + 1
        anuncio["encuesta"]["resultados"] = conteos
        anuncio["miVoto"] = next((l.get("voto") for l in lecturas if l.get("usuarioId") == usuario["usuarioId"]), None)
    return ok(anuncio)


def leer(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    anuncio_id = param(evento, "id")
    anuncio = t("T_ANUNCIOS").get_item(Key={"anuncioId": anuncio_id}).get("Item")
    if not anuncio:
        return error("Anuncio no encontrado", 404)
    b = cuerpo(evento)
    lectura = t("T_LECTURAS").get_item(Key={"anuncioId": anuncio_id, "usuarioId": usuario["usuarioId"]}).get("Item")
    if not lectura:
        lectura = {"anuncioId": anuncio_id, "usuarioId": usuario["usuarioId"], "leidoEn": "", "voto": ""}
    lectura["leidoEn"] = ahora_iso()
    voto = b.get("voto")
    if voto and anuncio.get("encuesta") and voto in (anuncio["encuesta"].get("opciones") or []):
        lectura["voto"] = voto
    t("T_LECTURAS").put_item(Item=lectura)
    return ok(lectura)


def lecturas(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    anuncio_id = param(evento, "id")
    anuncio = t("T_ANUNCIOS").get_item(Key={"anuncioId": anuncio_id}).get("Item")
    if not anuncio:
        return error("Anuncio no encontrado", 404)
    if usuario.get("rol") not in ("ti", "direccion") and anuncio.get("creadoPor") != usuario["usuarioId"]:
        return error("Sin permiso para ver las lecturas de este anuncio", 403)
    lecturas = query_todo(
        t("T_LECTURAS"),
        KeyConditionExpression="#a = :a",
        ExpressionAttributeNames={"#a": "anuncioId"},
        ExpressionAttributeValues={":a": anuncio_id},
    )
    por_usuario = {l.get("usuarioId"): l for l in lecturas}
    objetivo = usuarios_segmento(anuncio.get("segmento") or {})
    leidos = []
    faltan = []
    for u in objetivo:
        l = por_usuario.get(u["usuarioId"])
        if l:
            leidos.append({"nombre": u.get("nombre", ""), "leidoEn": l.get("leidoEn"), "voto": l.get("voto")})
        else:
            faltan.append(u.get("nombre", ""))
    total = len(objetivo)
    return ok(
        {
            "total": total,
            "leidos": leidos,
            "faltan": faltan,
            "tasa": round(len(leidos) * 100 / total, 1) if total else 0,
        }
    )
