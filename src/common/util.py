import json


def _res(estado, cuerpo):
    return {
        "statusCode": estado,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(cuerpo, default=str),
    }


def ok(datos=None, estado=200):
    return _res(estado, {"ok": True, "datos": datos})


def error(mensaje, estado=400):
    return _res(estado, {"ok": False, "error": mensaje})


def cuerpo(evento):
    b = evento.get("body") or "{}"
    if isinstance(b, (bytes, bytearray)):
        b = b.decode("utf-8")
    try:
        return json.loads(b)
    except Exception:
        return {}


def param(evento, nombre):
    return (evento.get("pathParameters") or {}).get(nombre)


def consulta(evento, nombre):
    return (evento.get("queryStringParameters") or {}).get(nombre)
