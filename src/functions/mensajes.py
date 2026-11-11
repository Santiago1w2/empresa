import uuid

from src.common.auth import usuario_actual
from src.common.db import query_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import notificar
from src.common.util import consulta, cuerpo, error, ok


def _participantes(hilo):
    destinatarios = []
    if hilo.startswith("SOL#"):
        s = t("T_SOLICITUDES").get_item(Key={"solicitudId": hilo[4:]}).get("Item")
        if not s:
            return []
        destinatarios.append(s.get("solicitanteId"))
        if s.get("docenteAsesorId"):
            destinatarios.append(s["docenteAsesorId"])
        for p in query_todo(
            t("T_PASOS"),
            KeyConditionExpression="#s = :s",
            ExpressionAttributeNames={"#s": "solicitudId"},
            ExpressionAttributeValues={":s": s["solicitudId"]},
        ):
            r = p.get("revisorId") or ""
            if r and not r.startswith("ROL#"):
                destinatarios.append(r)
    elif hilo.startswith("PROY#"):
        p = t("T_PROYECTOS").get_item(Key={"proyectoId": hilo[4:]}).get("Item")
        if not p:
            return []
        destinatarios.append(p.get("responsableId"))
        if p.get("docenteAsesorId"):
            destinatarios.append(p["docenteAsesorId"])
        destinatarios += [m.get("usuarioId") for m in p.get("equipo") or []]
    return [d for d in destinatarios if d]


def _puede_acceder(usuario, hilo):
    if usuario.get("rol") in ("ti", "direccion"):
        return True
    return usuario["usuarioId"] in _participantes(hilo)


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    hilo = consulta(evento, "hilo") or ""
    if not hilo:
        return error("Falta el parámetro hilo")
    if not _puede_acceder(usuario, hilo):
        return error("Sin permiso sobre este hilo de consultas", 403)
    items = query_todo(
        t("T_MENSAJES"),
        KeyConditionExpression="#h = :h",
        ExpressionAttributeNames={"#h": "hiloId"},
        ExpressionAttributeValues={":h": hilo},
    )
    items.sort(key=lambda m: m.get("creadoEn__id", ""))
    return ok(items)


def enviar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    b = cuerpo(evento)
    hilo = b.get("hiloId") or ""
    texto = (b.get("texto") or "").strip()
    if not hilo or not texto:
        return error("Hilo y texto son obligatorios")
    if not _puede_acceder(usuario, hilo):
        return error("Sin permiso sobre este hilo de consultas", 403)
    mensaje = {
        "hiloId": hilo,
        "creadoEn__id": ahora_iso() + "__" + uuid.uuid4().hex,
        "autorId": usuario["usuarioId"],
        "autorNombre": usuario.get("nombre", ""),
        "autorRol": usuario.get("rol", ""),
        "texto": texto,
    }
    t("T_MENSAJES").put_item(Item=mensaje)
    destinatarios = [d for d in _participantes(hilo) if d != usuario["usuarioId"]]
    notificar(destinatarios, "Nuevo mensaje", usuario.get("nombre", "") + ": " + texto[:80], "/mensajes?hilo=" + hilo.replace("#", "%23"), "mensaje")
    return ok(mensaje, 201)
