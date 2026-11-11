import os

import boto3

_recurso = None


def _rec():
    global _recurso
    if _recurso is None:
        _recurso = boto3.resource("dynamodb")
    return _recurso


def t(nombre_env):
    return _rec().Table(os.environ[nombre_env])


def query_todo(tabla, **kwargs):
    salida = []
    resp = tabla.query(**kwargs)
    salida.extend(resp.get("Items", []))
    while resp.get("LastEvaluatedKey"):
        resp = tabla.query(**kwargs, ExclusiveStartKey=resp["LastEvaluatedKey"])
        salida.extend(resp.get("Items", []))
    return salida


def scan_todo(tabla, **kwargs):
    salida = []
    resp = tabla.scan(**kwargs)
    salida.extend(resp.get("Items", []))
    while resp.get("LastEvaluatedKey"):
        resp = tabla.scan(**kwargs, ExclusiveStartKey=resp["LastEvaluatedKey"])
        salida.extend(resp.get("Items", []))
    return salida
