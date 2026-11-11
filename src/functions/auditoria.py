from src.common.auth import usuario_actual
from src.common.db import query_todo, t
from src.common.util import consulta, error, ok


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") not in ("ti", "direccion"):
        return error("Solo TI o Dirección pueden ver la auditoría", 403)
    usuario_f = consulta(evento, "usuarioId") or ""
    entidad = consulta(evento, "entidad") or ""
    items = query_todo(
        t("T_AUDITORIA"),
        KeyConditionExpression="#t = :t",
        ExpressionAttributeNames={"#t": "tipo"},
        ExpressionAttributeValues={":t": "AUD"},
        ScanIndexForward=False,
    )
    if usuario_f:
        items = [i for i in items if i.get("usuarioId") == usuario_f]
    if entidad:
        items = [i for i in items if i.get("entidad") == entidad]
    return ok(items[:300])
