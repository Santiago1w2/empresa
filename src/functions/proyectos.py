import uuid

from src.common.auth import usuario_actual
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora_iso
from src.common.sistema import auditar, notificar
from src.common.util import consulta, cuerpo, error, ok, param

ROLES_CREADORES = ["estudiante", "docente", "coordinacion", "direccion", "administracion"]
ESTADOS_TAREA = ["POR_HACER", "EN_CURSO", "HECHO"]
ESTADOS_PROYECTO = ["ACTIVA", "EN_PAUSA", "SIN_RESPONSABLE", "FINALIZADA"]


def _obtener(proyecto_id):
    return t("T_PROYECTOS").get_item(Key={"proyectoId": proyecto_id}).get("Item")


def _nombre_usuario(usuario_id):
    if not usuario_id:
        return ""
    u = t("T_USUARIOS").get_item(Key={"usuarioId": usuario_id}).get("Item")
    return (u or {}).get("nombre", "")


def _puede_editar(usuario, proyecto):
    if usuario.get("rol") in ("ti", "direccion"):
        return True
    if proyecto.get("responsableId") == usuario["usuarioId"]:
        return True
    if proyecto.get("docenteAsesorId") == usuario["usuarioId"]:
        return True
    return any(m.get("usuarioId") == usuario["usuarioId"] for m in proyecto.get("equipo") or [])


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    explorar = consulta(evento, "explorar") == "1"
    estado = consulta(evento, "estado") or ""
    items = scan_todo(t("T_PROYECTOS"))
    if explorar:
        items = [p for p in items if p.get("abiertoUnirse") and p.get("estado") == "ACTIVA"]
    elif usuario.get("rol") == "estudiante":
        items = [p for p in items if any(m.get("usuarioId") == usuario["usuarioId"] for m in p.get("equipo") or [])]
    if estado:
        items = [p for p in items if p.get("estado") == estado]
    items.sort(key=lambda p: p.get("creadoEn", ""), reverse=True)
    return ok(items)


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") not in ROLES_CREADORES:
        return error("Tu rol no puede crear proyectos", 403)
    b = cuerpo(evento)
    nombre = (b.get("nombre") or "").strip()
    if not nombre:
        return error("El nombre del proyecto es obligatorio")
    proyecto = {
        "proyectoId": uuid.uuid4().hex,
        "nombre": nombre,
        "descripcion": b.get("descripcion") or "",
        "objetivo": b.get("objetivo") or "",
        "categoria": b.get("categoria") or "otros",
        "estado": "ACTIVA",
        "responsableId": b.get("responsableId") or usuario["usuarioId"],
        "responsableNombre": _nombre_usuario(b.get("responsableId") or usuario["usuarioId"]),
        "docenteAsesorId": b.get("docenteAsesorId") or "",
        "equipo": b.get("equipo") or [{"usuarioId": usuario["usuarioId"], "nombre": usuario.get("nombre", ""), "cargo": "lider"}],
        "hitos": b.get("hitos") or [],
        "abiertoUnirse": bool(b.get("abiertoUnirse", True)),
        "solicitudId": b.get("solicitudId") or "",
        "legado": {"documentos": [], "contactos": [], "aprendizajes": ""},
        "alertaInactividad": False,
        "creadoEn": ahora_iso(),
        "actualizadoEn": ahora_iso(),
    }
    t("T_PROYECTOS").put_item(Item=proyecto)
    auditar(usuario, "crear", "proyecto", proyecto["proyectoId"], {"nombre": nombre})
    return ok(proyecto, 201)


def obtener(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    tareas = query_todo(
        t("T_TAREAS"),
        KeyConditionExpression="#p = :p",
        ExpressionAttributeNames={"#p": "proyectoId"},
        ExpressionAttributeValues={":p": proyecto_id},
    )
    tareas.sort(key=lambda x: x.get("creadoEn", ""))
    bitacora = query_todo(
        t("T_BITACORA"),
        KeyConditionExpression="#p = :p",
        ExpressionAttributeNames={"#p": "proyectoId"},
        ExpressionAttributeValues={":p": proyecto_id},
    )
    bitacora.sort(key=lambda x: x.get("creadoEn__id", ""))
    return ok({"proyecto": proyecto, "tareas": tareas, "bitacora": bitacora, "puedeEditar": _puede_editar(usuario, proyecto)})


def actualizar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not _puede_editar(usuario, proyecto):
        return error("Sin permiso para editar este proyecto", 403)
    b = cuerpo(evento)
    if "estado" in b and b["estado"] in ESTADOS_PROYECTO:
        proyecto["estado"] = b["estado"]
    if "responsableId" in b:
        proyecto["responsableId"] = b["responsableId"]
        proyecto["responsableNombre"] = _nombre_usuario(b["responsableId"])
        proyecto["estado"] = "ACTIVA" if b["responsableId"] else "SIN_RESPONSABLE"
    for campo in ("nombre", "descripcion", "objetivo", "categoria", "docenteAsesorId", "hitos", "equipo", "abiertoUnirse"):
        if campo in b:
            proyecto[campo] = b[campo]
    if proyecto.get("estado") == "ACTIVA":
        proyecto["alertaInactividad"] = False
    proyecto["actualizadoEn"] = ahora_iso()
    t("T_PROYECTOS").put_item(Item=proyecto)
    auditar(usuario, "actualizar", "proyecto", proyecto_id)
    return ok(proyecto)


def unirse(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") != "estudiante":
        return error("Solo los estudiantes pueden unirse a iniciativas", 403)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not proyecto.get("abiertoUnirse") or proyecto.get("estado") != "ACTIVA":
        return error("Este proyecto no acepta miembros por ahora")
    if any(m.get("usuarioId") == usuario["usuarioId"] for m in proyecto.get("equipo") or []):
        return error("Ya eres miembro de este proyecto")
    proyecto.setdefault("equipo", []).append({"usuarioId": usuario["usuarioId"], "nombre": usuario.get("nombre", ""), "cargo": "miembro"})
    proyecto["actualizadoEn"] = ahora_iso()
    proyecto["alertaInactividad"] = False
    t("T_PROYECTOS").put_item(Item=proyecto)
    notificar([proyecto.get("responsableId")], "Nueva persona en tu proyecto", usuario.get("nombre", "") + ' se unió a "' + proyecto["nombre"] + '"', "/proyectos/" + proyecto_id)
    auditar(usuario, "unirse", "proyecto", proyecto_id)
    return ok(proyecto)


def tarea_crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not _puede_editar(usuario, proyecto):
        return error("Sin permiso para crear tareas", 403)
    b = cuerpo(evento)
    titulo = (b.get("titulo") or "").strip()
    if not titulo:
        return error("El título de la tarea es obligatorio")
    tarea = {
        "proyectoId": proyecto_id,
        "tareaId": uuid.uuid4().hex,
        "titulo": titulo,
        "descripcion": b.get("descripcion") or "",
        "estado": "POR_HACER",
        "responsableId": b.get("responsableId") or "",
        "responsableNombre": _nombre_usuario(b.get("responsableId")),
        "vence": b.get("vence") or "",
        "creadoEn": ahora_iso(),
    }
    t("T_TAREAS").put_item(Item=tarea)
    proyecto["actualizadoEn"] = ahora_iso()
    proyecto["alertaInactividad"] = False
    t("T_PROYECTOS").put_item(Item=proyecto)
    if tarea["responsableId"] and tarea["responsableId"] != usuario["usuarioId"]:
        notificar([tarea["responsableId"]], "Nueva tarea asignada", '"' + titulo + '" en "' + proyecto["nombre"] + '"', "/proyectos/" + proyecto_id, "tarea")
    return ok(tarea, 201)


def tarea_actualizar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    tarea_id = param(evento, "tareaId")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not _puede_editar(usuario, proyecto):
        return error("Sin permiso para editar tareas", 403)
    tarea = t("T_TAREAS").get_item(Key={"proyectoId": proyecto_id, "tareaId": tarea_id}).get("Item")
    if not tarea:
        return error("Tarea no encontrada", 404)
    b = cuerpo(evento)
    for campo in ("titulo", "descripcion", "vence"):
        if campo in b:
            tarea[campo] = b[campo]
    if "estado" in b:
        if b["estado"] not in ESTADOS_TAREA:
            return error("Estado de tarea inválido")
        tarea["estado"] = b["estado"]
    if "responsableId" in b:
        tarea["responsableId"] = b["responsableId"]
        tarea["responsableNombre"] = _nombre_usuario(b["responsableId"])
    t("T_TAREAS").put_item(Item=tarea)
    proyecto["actualizadoEn"] = ahora_iso()
    proyecto["alertaInactividad"] = False
    t("T_PROYECTOS").put_item(Item=proyecto)
    auditar(usuario, "actualizar", "tarea", tarea_id, {"proyecto": proyecto_id})
    return ok(tarea)


def bitacora(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not _puede_editar(usuario, proyecto):
        return error("Sin permiso para escribir en la bitácora", 403)
    b = cuerpo(evento)
    texto = (b.get("texto") or "").strip()
    if not texto:
        return error("El texto de la bitácora es obligatorio")
    entrada = {
        "proyectoId": proyecto_id,
        "creadoEn__id": ahora_iso() + "__" + uuid.uuid4().hex,
        "autorId": usuario["usuarioId"],
        "autorNombre": usuario.get("nombre", ""),
        "texto": texto,
        "evidencias": b.get("evidencias") or [],
    }
    t("T_BITACORA").put_item(Item=entrada)
    proyecto["actualizadoEn"] = ahora_iso()
    proyecto["alertaInactividad"] = False
    t("T_PROYECTOS").put_item(Item=proyecto)
    return ok(entrada, 201)


def legado(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    proyecto_id = param(evento, "id")
    proyecto = _obtener(proyecto_id)
    if not proyecto:
        return error("Proyecto no encontrado", 404)
    if not _puede_editar(usuario, proyecto):
        return error("Sin permiso para editar el legado", 403)
    b = cuerpo(evento)
    legado = proyecto.get("legado") or {}
    for campo in ("documentos", "contactos", "aprendizajes"):
        if campo in b:
            legado[campo] = b[campo]
    proyecto["legado"] = legado
    proyecto["actualizadoEn"] = ahora_iso()
    t("T_PROYECTOS").put_item(Item=proyecto)
    auditar(usuario, "legado", "proyecto", proyecto_id)
    return ok(proyecto)
