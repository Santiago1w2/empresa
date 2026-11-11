import os
import re
import uuid

import boto3

from src.common.auth import usuario_actual
from src.common.util import consulta, cuerpo, error, ok


def _cliente():
    return boto3.client("s3")


def subida(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    b = cuerpo(evento)
    nombre = re.sub(r"[^a-zA-Z0-9._-]", "_", (b.get("nombre") or "archivo"))[-80:] or "archivo"
    tipo_contenido = b.get("contentType") or "application/octet-stream"
    key = "archivos/" + usuario["usuarioId"] + "/" + uuid.uuid4().hex[:8] + "-" + nombre
    url = _cliente().generate_presigned_url(
        "put_object",
        Params={"Bucket": os.environ["BUCKET_ARCHIVOS"], "Key": key, "ContentType": tipo_contenido},
        ExpiresIn=900,
    )
    return ok({"key": key, "url": url})


def descarga(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    key = consulta(evento, "key") or ""
    if not key.startswith("archivos/"):
        return error("Clave de archivo inválida")
    url = _cliente().generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["BUCKET_ARCHIVOS"], "Key": key},
        ExpiresIn=900,
    )
    return ok({"url": url})
