import uuid

from src.common.auth import crear_token, hash_clave, publico, usuario_actual, verificar_clave
from src.common.db import t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, usuario_por_email
from src.common.util import cuerpo, error, ok

ROLES_REGISTRO = ["estudiante", "docente", "padre"]


def registrar(evento, contexto):
    b = cuerpo(evento)
    nombre = (b.get("nombre") or "").strip()
    email = (b.get("email") or "").strip().lower()
    clave = b.get("clave") or ""
    rol = b.get("rol") or "estudiante"
    if not nombre or "@" not in email or len(clave) < 6:
        return error("Nombre, correo válido y clave de al menos 6 caracteres son obligatorios")
    if rol not in ROLES_REGISTRO:
        return error("Rol no permitido para registro público")
    if usuario_por_email(email):
        return error("El correo ya está registrado", 409)
    sal, hash_calculado = hash_clave(clave)
    usuario = {
        "usuarioId": uuid.uuid4().hex,
        "nombre": nombre,
        "email": email,
        "rol": rol,
        "nivel": b.get("nivel") or "",
        "grado": b.get("grado") or "",
        "seccion": b.get("seccion") or "",
        "claveSal": sal,
        "claveHash": hash_calculado,
        "activo": True,
        "consentimientoDatos": True,
        "preferencias": {"tema": "claro", "tamanoLetra": "mediano", "resumenDiario": False},
        "creadoEn": ahora_iso(),
    }
    t("T_USUARIOS").put_item(Item=usuario)
    auditar(usuario, "registrar", "usuario", usuario["usuarioId"])
    return ok({"token": crear_token(usuario), "usuario": publico(usuario)}, 201)


def login(evento, contexto):
    b = cuerpo(evento)
    email = (b.get("email") or "").strip().lower()
    clave = b.get("clave") or ""
    usuario = usuario_por_email(email)
    if not usuario or not verificar_clave(clave, usuario.get("claveSal", ""), usuario.get("claveHash", "")):
        return error("Correo o clave incorrectos", 401)
    if not usuario.get("activo", True):
        return error("Usuario inactivo, contacta al administrador", 403)
    auditar(usuario, "login", "usuario", usuario["usuarioId"])
    return ok({"token": crear_token(usuario), "usuario": publico(usuario)})


def yo(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    return ok(publico(usuario))
