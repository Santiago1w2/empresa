from src.common.auth import usuario_actual
from src.common.db import query_todo, t
from src.common.util import error, ok, param


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    items = query_todo(
        t("T_NOTIFICACIONES"),
        KeyConditionExpression="#u = :u",
        ExpressionAttributeNames={"#u": "usuarioId"},
        ExpressionAttributeValues={":u": usuario["usuarioId"]},
        ScanIndexForward=False,
    )
    return ok({"notificaciones": items[:100], "noLeidas": sum(1 for n in items if not n.get("leida"))})


def leer(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    id_completo = param(evento, "id")
    item = t("T_NOTIFICACIONES").get_item(Key={"usuarioId": usuario["usuarioId"], "creadoEn__id": id_completo}).get("Item")
    if not item:
        return error("Notificación no encontrada", 404)
    item["leida"] = True
    t("T_NOTIFICACIONES").put_item(Item=item)
    return ok(item)
