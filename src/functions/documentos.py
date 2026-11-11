import uuid

from src.common.auth import usuario_actual
from src.common.db import scan_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar
from src.common.util import consulta, cuerpo, error, ok, param

TIPOS_DOCUMENTO = ["PLANTILLA", "INFORME", "EVIDENCIA", "OTRO"]


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    tipo = consulta(evento, "tipo") or ""
    items = scan_todo(t("T_DOCUMENTOS"))
    if tipo:
        items = [d for d in items if d.get("tipo") == tipo]
    items.sort(key=lambda d: d.get("creadoEn", ""), reverse=True)
    return ok(items)


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    b = cuerpo(evento)
    nombre = (b.get("nombre") or "").strip()
    if not nombre:
        return error("El nombre del documento es obligatorio")
    tipo_doc = b.get("tipo") or "OTRO"
    if tipo_doc not in TIPOS_DOCUMENTO:
        return error("Tipo de documento inválido")
    if tipo_doc == "PLANTILLA" and usuario.get("rol") not in ("ti", "direccion"):
        return error("Solo TI o Dirección crean plantillas institucionales", 403)
    documento = {
        "documentoId": uuid.uuid4().hex,
        "tipo": tipo_doc,
        "nombre": nombre,
        "descripcion": b.get("descripcion") or "",
        "categoria": b.get("categoria") or "",
        "version": 1,
        "archivoKey": b.get("archivoKey") or "",
        "contenido": b.get("contenido") or "",
        "creadoPor": usuario["usuarioId"],
        "creadoPorNombre": usuario.get("nombre", ""),
        "creadoEn": ahora_iso(),
    }
    t("T_DOCUMENTOS").put_item(Item=documento)
    auditar(usuario, "crear", "documento", documento["documentoId"], {"nombre": nombre})
    return ok(documento, 201)


def eliminar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    documento_id = param(evento, "id")
    d = t("T_DOCUMENTOS").get_item(Key={"documentoId": documento_id}).get("Item")
    if not d:
        return error("Documento no encontrado", 404)
    if usuario.get("rol") not in ("ti", "direccion") and d.get("creadoPor") != usuario["usuarioId"]:
        return error("Sin permiso para eliminar este documento", 403)
    t("T_DOCUMENTOS").delete_item(Key={"documentoId": documento_id})
    auditar(usuario, "eliminar", "documento", documento_id)
    return ok({"eliminado": True})
