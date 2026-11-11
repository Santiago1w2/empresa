from src.common.auth import usuario_actual
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, notificar, usuarios_por_rol
from src.common.util import cuerpo, error, ok, param


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    rol = usuario.get("rol")
    if rol == "padre":
        items = query_todo(
            t("T_AUTORIZACIONES"),
            IndexName="por-apoderado",
            KeyConditionExpression="#a = :a",
            ExpressionAttributeNames={"#a": "apoderadoId"},
            ExpressionAttributeValues={":a": usuario["usuarioId"]},
        )
    elif rol in ("direccion", "ti", "administracion"):
        items = scan_todo(t("T_AUTORIZACIONES"))
    else:
        return error("Sin permiso para ver autorizaciones", 403)
    items.sort(key=lambda a: a.get("creadoEn", ""), reverse=True)
    return ok(items)


def decidir(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    autorizacion_id = param(evento, "id")
    aut = t("T_AUTORIZACIONES").get_item(Key={"autorizacionId": autorizacion_id}).get("Item")
    if not aut:
        return error("Autorización no encontrada", 404)
    if aut.get("apoderadoId") != usuario["usuarioId"]:
        return error("Esta autorización no es tuya", 403)
    if aut.get("estado") != "PENDIENTE":
        return error("Esta autorización ya fue decidida")
    b = cuerpo(evento)
    decision = (b.get("decision") or "").lower()
    firma = (b.get("firma") or "").strip()
    if decision not in ("aceptar", "rechazar"):
        return error("Decisión inválida, usa aceptar o rechazar")
    if not firma:
        return error("Se requiere tu nombre completo como firma digital")
    aut["estado"] = "ACEPTADA" if decision == "aceptar" else "RECHAZADA"
    aut["decididoEn"] = ahora_iso()
    aut["firma"] = firma
    t("T_AUTORIZACIONES").put_item(Item=aut)
    solicitud = t("T_SOLICITUDES").get_item(Key={"solicitudId": aut["solicitudId"]}).get("Item")
    if solicitud:
        enlace = "/solicitudes/" + solicitud["solicitudId"]
        if decision == "rechazar":
            solicitud["estado"] = "RECHAZADA"
            solicitud["motivoRechazo"] = "El apoderado " + usuario.get("nombre", "") + " rechazó la autorización"
            solicitud["revisorActualRol"] = ""
            solicitud["actualizadoEn"] = ahora_iso()
            t("T_SOLICITUDES").put_item(Item=solicitud)
            notificar([solicitud["solicitanteId"]], "Apoderado rechazó la autorización", '"' + solicitud["titulo"] + '" fue rechazada', enlace, "alerta")
            for u in usuarios_por_rol("direccion"):
                notificar([u["usuarioId"]], "Autorización rechazada", '"' + solicitud["titulo"] + '" fue rechazada por el apoderado', enlace, "alerta")
        else:
            todas = query_todo(
                t("T_AUTORIZACIONES"),
                IndexName="por-solicitud",
                KeyConditionExpression="#s = :s",
                ExpressionAttributeNames={"#s": "solicitudId"},
                ExpressionAttributeValues={":s": aut["solicitudId"]},
            )
            if todas and all(a.get("estado") == "ACEPTADA" for a in todas):
                solicitud["estado"] = solicitud.get("estadoTrasPadres", "APROBADA")
                solicitud["revisorActualRol"] = ""
                solicitud["actualizadoEn"] = ahora_iso()
                t("T_SOLICITUDES").put_item(Item=solicitud)
                from src.functions.solicitudes import _publicar_evento
                _publicar_evento(solicitud)
                notificar([solicitud["solicitanteId"]], "Autorizaciones completas", '"' + solicitud["titulo"] + '" quedó aprobada', enlace, "exito")
                for u in usuarios_por_rol("direccion"):
                    notificar([u["usuarioId"]], "Solicitud aprobada", '"' + solicitud["titulo"] + '" fue autorizada por los apoderados', enlace)
    auditar(usuario, "autorizar_" + decision, "autorizacion", autorizacion_id, {"solicitud": aut.get("solicitudId")})
    return ok(aut)
