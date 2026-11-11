from src.common.auth import usuario_actual
from src.common.catalogo import ROLES_REVISORES, obtener_catalogo
from src.common.db import t
from src.common.sistema import auditar
from src.common.util import cuerpo, error, ok


def obtener(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    return ok(obtener_catalogo())


def guardar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") != "ti":
        return error("Solo el administrador TI puede editar los catálogos", 403)
    b = cuerpo(evento)
    if "tiposSolicitud" in b:
        for clave, definicion in b["tiposSolicitud"].items():
            ruta = definicion.get("ruta") or []
            if not ruta or any(r not in ROLES_REVISORES for r in ruta) or len(ruta) > 3:
                return error("Ruta inválida para " + clave + ": máximo 3 pasos entre " + ", ".join(ROLES_REVISORES))
    catalogo = obtener_catalogo()
    for campo in ("tiposSolicitud", "slaPorRol", "categoriasAnuncio", "ambientes", "niveles", "grados", "secciones"):
        if campo in b:
            catalogo[campo] = b[campo]
    t("T_CATALOGOS").put_item(Item=catalogo)
    auditar(usuario, "actualizar", "catalogo", "UNICO")
    return ok(catalogo)
