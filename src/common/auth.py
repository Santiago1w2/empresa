import base64
import hashlib
import hmac
import json
import os
import time

from src.common.db import t

SECRET = os.environ.get("JWT_SECRET", "santa-anita-conecta-dev")
ITERACIONES = 100000


def _b64(datos):
    return base64.urlsafe_b64encode(datos).rstrip(b"=")


def _b64d(texto):
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def hash_clave(clave, sal_hex=None):
    if sal_hex is None:
        sal_hex = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal_hex), ITERACIONES)
    return sal_hex, dk.hex()


def verificar_clave(clave, sal_hex, hash_hex):
    try:
        _, calculado = hash_clave(clave, sal_hex)
        return hmac.compare_digest(calculado, hash_hex)
    except Exception:
        return False


def crear_token(usuario, horas=24):
    encabezado = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    carga = _b64(json.dumps({
        "sub": usuario["usuarioId"],
        "email": usuario.get("email"),
        "rol": usuario.get("rol"),
        "nombre": usuario.get("nombre"),
        "exp": int(time.time()) + horas * 3600,
    }).encode())
    firma = _b64(hmac.new(SECRET.encode(), encabezado + b"." + carga, hashlib.sha256).digest())
    return (encabezado + b"." + carga + b"." + firma).decode()


def leer_token(token):
    try:
        partes = token.split(".")
        if len(partes) != 3:
            return None
        firma = _b64(hmac.new(SECRET.encode(), (partes[0] + "." + partes[1]).encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(firma.decode(), partes[2]):
            return None
        carga = json.loads(_b64d(partes[1]))
        if carga.get("exp", 0) < time.time():
            return None
        return carga
    except Exception:
        return None


def _cabecera(evento, nombre):
    for k, v in (evento.get("headers") or {}).items():
        if k.lower() == nombre.lower():
            return v
    return None


def usuario_actual(evento, cargar=True):
    auth = _cabecera(evento, "authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    carga = leer_token(auth.split(" ", 1)[1].strip())
    if not carga:
        return None
    if not cargar:
        return carga
    usuario = t("T_USUARIOS").get_item(Key={"usuarioId": carga["sub"]}).get("Item")
    if not usuario or not usuario.get("activo", True):
        return None
    return usuario


def publico(usuario):
    if not usuario:
        return None
    d = dict(usuario)
    d.pop("claveSal", None)
    d.pop("claveHash", None)
    return d
