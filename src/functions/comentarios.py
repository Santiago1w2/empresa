import uuid

from src.common.auth import usuario_actual
from src.common.db import t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, notificar
from src.common.util import cuerpo, error, ok, param

ROLES_COMENTARIO_INTERNO = ("docente", "coordinacion", "direccion", "administracion", "ti")


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    solicitud_id = param(evento, "id")
    solicitud = t("T_SOLICITUDES").get_item(Key={"solicitudId": solicitud_id}).get("Item")
    if not solicitud:
        return error("Solicitud no encontrada", 404)
    b = cuerpo(evento)
    texto = (b.get("texto") or "").strip()
    if not texto:
        return error("El comentario no puede estar vacío")
    interno = bool(b.get("interno"))
    if interno and (
        usuario.get("rol") not in ROLES_COMENTARIO_INTERNO
        or usuario["usuarioId"] == solicitud.get("solicitanteId")
    ):
        return error("Sin permiso para comentarios internos", 403)
    comentario = {
        "solicitudId": solicitud_id,
        "creadoEn__id": ahora_iso() + "__" + uuid.uuid4().hex,
        "autorId": usuario["usuarioId"],
        "autorNombre": usuario.get("nombre", ""),
        "autorRol": usuario.get("rol", ""),
        "texto": texto,
        "interno": interno,
    }
    t("T_COMENTARIOS").put_item(Item=comentario)
    enlace = "/solicitudes/" + solicitud_id
    if interno:
        paso = t("T_PASOS").get_item(
            Key={"solicitudId": solicitud_id, "pasoId": "P%02d" % (solicitud.get("pasoActual") or 1)}
        ).get("Item") or {}
        revisor = paso.get("revisorId")
        if revisor and revisor != usuario["usuarioId"]:
            notificar([revisor], "Comentario interno", '"' + solicitud.get("titulo", "") + '": ' + texto[:80], enlace, "revision")
    else:
        destinatarios = []
        if usuario["usuarioId"] != solicitud.get("solicitanteId"):
            destinatarios.append(solicitud["solicitanteId"])
        paso = t("T_PASOS").get_item(
            Key={"solicitudId": solicitud_id, "pasoId": "P%02d" % (solicitud.get("pasoActual") or 1)}
        ).get("Item") or {}
        revisor = paso.get("revisorId")
        if revisor and revisor != usuario["usuarioId"] and revisor != solicitud.get("solicitanteId"):
            destinatarios.append(revisor)
        notificar(destinatarios, "Nuevo comentario en tu solicitud", usuario.get("nombre", "") + ": " + texto[:80], enlace, "mensaje")
    auditar(usuario, "comentar", "solicitud", solicitud_id, {"interno": interno})
    return ok(comentario, 201)
