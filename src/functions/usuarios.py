import uuid

from src.common.auth import hash_clave, publico, usuario_actual
from src.common.catalogo import ROLES_TODOS
from src.common.db import scan_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, usuario_por_email
from src.common.util import cuerpo, error, ok, param


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    rol = usuario.get("rol")
    usuarios = scan_todo(t("T_USUARIOS"))
    usuarios.sort(key=lambda u: (u.get("rol", ""), u.get("nombre", "")))
    if rol == "ti":
        return ok([publico(u) for u in usuarios])
    campos = {"usuarioId", "nombre", "rol", "nivel", "grado", "seccion"}
    if rol in ("docente", "coordinacion", "direccion", "administracion"):
        campos.add("email")
    salida = []
    for u in usuarios:
        if not u.get("activo", True):
            continue
        if rol == "padre":
            hijos = u.get("hijos") or []
            if usuario["usuarioId"] not in hijos and u.get("rol") not in ("docente", "coordinacion", "direccion", "administracion"):
                continue
        salida.append({k: u.get(k) for k in campos})
    return ok(salida)


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") != "ti":
        return error("Solo el administrador TI puede crear usuarios", 403)
    b = cuerpo(evento)
    nombre = (b.get("nombre") or "").strip()
    email = (b.get("email") or "").strip().lower()
    clave = b.get("clave") or ""
    rol = b.get("rol") or ""
    if not nombre or "@" not in email or len(clave) < 6:
        return error("Nombre, correo válido y clave de al menos 6 caracteres son obligatorios")
    if rol not in ROLES_TODOS:
        return error("Rol inválido")
    if usuario_por_email(email):
        return error("El correo ya está registrado", 409)
    sal, hash_calculado = hash_clave(clave)
    nuevo = {
        "usuarioId": uuid.uuid4().hex,
        "nombre": nombre,
        "email": email,
        "rol": rol,
        "nivel": b.get("nivel") or "",
        "grado": b.get("grado") or "",
        "seccion": b.get("seccion") or "",
        "hijos": b.get("hijos") or [],
        "claveSal": sal,
        "claveHash": hash_calculado,
        "activo": True,
        "consentimientoDatos": rol != "estudiante",
        "preferencias": {"tema": "claro", "tamanoLetra": "mediano", "resumenDiario": False},
        "creadoEn": ahora_iso(),
    }
    t("T_USUARIOS").put_item(Item=nuevo)
    auditar(usuario, "crear", "usuario", nuevo["usuarioId"], {"rol": rol, "email": email})
    return ok(publico(nuevo), 201)


def actualizar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    id_objetivo = param(evento, "id")
    objetivo = t("T_USUARIOS").get_item(Key={"usuarioId": id_objetivo}).get("Item")
    if not objetivo:
        return error("Usuario no encontrado", 404)
    es_ti = usuario.get("rol") == "ti"
    es_mismo = usuario["usuarioId"] == id_objetivo
    if not (es_ti or es_mismo):
        return error("Sin permiso para editar este usuario", 403)
    b = cuerpo(evento)
    if es_ti:
        for campo in ("nombre", "rol", "nivel", "grado", "seccion", "activo", "hijos"):
            if campo in b:
                objetivo[campo] = b[campo]
        if b.get("rol") and b["rol"] not in ROLES_TODOS:
            return error("Rol inválido")
    if es_mismo:
        if "preferencias" in b and isinstance(b["preferencias"], dict):
            objetivo["preferencias"] = {**(objetivo.get("preferencias") or {}), **b["preferencias"]}
        if "consentimientoDatos" in b:
            objetivo["consentimientoDatos"] = bool(b["consentimientoDatos"])
        if b.get("clave"):
            if len(b["clave"]) < 6:
                return error("La clave debe tener al menos 6 caracteres")
            sal, hash_calculado = hash_clave(b["clave"])
            objetivo["claveSal"] = sal
            objetivo["claveHash"] = hash_calculado
    t("T_USUARIOS").put_item(Item=objetivo)
    auditar(usuario, "actualizar", "usuario", id_objetivo)
    return ok(publico(objetivo))
