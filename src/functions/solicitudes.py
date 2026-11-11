import uuid

from src.common.auth import usuario_actual
from src.common.catalogo import ROLES_REVISORES, obtener_catalogo
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora, ahora_iso, iso, sumar_dias_habiles
from src.common.sistema import auditar, notificar, usuarios_por_rol
from src.common.util import consulta, cuerpo, error, ok, param

ROLES_CREADORES = ["estudiante", "docente", "coordinacion", "direccion", "administracion"]
ESTADOS = [
    "BORRADOR", "EN_REVISION", "OBSERVADA", "APROBADA", "APROBADA_CONDICIONES",
    "EN_AUTORIZACION_PADRES", "RECHAZADA", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA",
]


def _paso_id(n):
    return "P%02d" % n


def _obtener(solicitud_id):
    return t("T_SOLICITUDES").get_item(Key={"solicitudId": solicitud_id}).get("Item")


def _paso_actual(solicitud):
    n = solicitud.get("pasoActual") or 1
    return t("T_PASOS").get_item(Key={"solicitudId": solicitud["solicitudId"], "pasoId": _paso_id(n)}).get("Item") or {}


def _es_solicitante(usuario, solicitud):
    return usuario["usuarioId"] == solicitud.get("solicitanteId")


def _puede_revisar(usuario, solicitud):
    paso = _paso_actual(solicitud)
    if not paso or paso.get("estado") != "EN_REVISION":
        return False
    revisor = paso.get("revisorId") or ""
    if revisor == usuario["usuarioId"]:
        return True
    if revisor.startswith("ROL#") and revisor[4:] == usuario.get("rol"):
        return True
    return False


def _elegir_revisor(rol, solicitud):
    if rol == "docente" and solicitud.get("docenteAsesorId"):
        docente = t("T_USUARIOS").get_item(Key={"usuarioId": solicitud["docenteAsesorId"]}).get("Item")
        if docente and docente.get("rol") == "docente" and docente.get("activo", True):
            return docente["usuarioId"], docente.get("nombre", "")
    candidatos = usuarios_por_rol(rol)
    if candidatos:
        return candidatos[0]["usuarioId"], candidatos[0].get("nombre", "")
    return "ROL#" + rol, rol


def _iniciar_paso(solicitud, n, catalogo):
    rol = solicitud["ruta"][n - 1]
    revisor_id, revisor_nombre = _elegir_revisor(rol, solicitud)
    inicio = ahora()
    plazo = int((catalogo.get("slaPorRol") or {}).get(rol, 2))
    t("T_PASOS").put_item(
        Item={
            "solicitudId": solicitud["solicitudId"],
            "pasoId": _paso_id(n),
            "nro": n,
            "rol": rol,
            "revisorId": revisor_id,
            "revisorNombre": revisor_nombre,
            "estado": "EN_REVISION",
            "iniciadoEn": iso(inicio),
            "plazoVenceEn": iso(sumar_dias_habiles(inicio, plazo)),
            "alerta50": False,
            "alerta80": False,
            "escalado": False,
        }
    )
    solicitud["revisorActualId"] = revisor_id
    solicitud["revisorActualNombre"] = revisor_nombre
    solicitud["revisorActualRol"] = rol
    return revisor_id


def _notificar_revisor(revisor_id, solicitud):
    enlace = "/solicitudes/" + solicitud["solicitudId"]
    mensaje = '"' + solicitud["titulo"] + '" está en tu bandeja'
    if revisor_id.startswith("ROL#"):
        notificar([u["usuarioId"] for u in usuarios_por_rol(revisor_id[4:])], "Solicitud por revisar", mensaje, enlace, "revision")
    else:
        notificar([revisor_id], "Solicitud por revisar", mensaje, enlace, "revision")


def _enviar(solicitud, catalogo):
    solicitud["estado"] = "EN_REVISION"
    solicitud["pasoActual"] = 1
    solicitud["enviadoEn"] = ahora_iso()
    revisor = _iniciar_paso(solicitud, 1, catalogo)
    solicitud["actualizadoEn"] = ahora_iso()
    t("T_SOLICITUDES").put_item(Item=solicitud)
    _notificar_revisor(revisor, solicitud)
    notificar(
        [solicitud["solicitanteId"]],
        "Solicitud enviada",
        '"' + solicitud["titulo"] + '" entró en revisión',
        "/solicitudes/" + solicitud["solicitudId"],
    )


def _aplicar_cambios(solicitud, b):
    for campo in (
        "titulo", "objetivo", "descripcion", "fecha", "horaInicio", "horaFin", "lugar",
        "ambienteId", "recursos", "presupuesto", "riesgos", "docenteAsesorId",
        "participantes", "adjuntos",
    ):
        if campo in b:
            solicitud[campo] = b[campo]
    if isinstance(b.get("checklist"), list):
        solicitud["checklist"] = b["checklist"]


def _apoderados_vinculados(solicitud):
    ids = {solicitud["solicitanteId"]}
    for p in solicitud.get("participantes") or []:
        if isinstance(p, dict) and p.get("usuarioId"):
            ids.add(p["usuarioId"])
    padres = usuarios_por_rol("padre")
    return [p for p in padres if any(h in ids for h in p.get("hijos") or [])]


def _publicar_evento(solicitud):
    if not solicitud.get("fecha"):
        return
    t("T_EVENTOS").put_item(
        Item={
            "eventoId": uuid.uuid4().hex,
            "titulo": solicitud["titulo"],
            "descripcion": solicitud.get("objetivo") or "",
            "fecha": solicitud["fecha"],
            "horaInicio": solicitud.get("horaInicio") or "",
            "horaFin": solicitud.get("horaFin") or "",
            "tipo": "ACTIVIDAD",
            "ambienteId": solicitud.get("ambienteId") or "",
            "nivel": solicitud.get("nivel") or "",
            "grado": solicitud.get("grado") or "",
            "solicitudId": solicitud["solicitudId"],
            "creadoPor": "sistema",
            "creadoPorNombre": "Sistema",
            "creadoEn": ahora_iso(),
        }
    )


def _aprobacion_final(solicitud, catalogo, con_condiciones):
    estado_final = "APROBADA_CONDICIONES" if con_condiciones else "APROBADA"
    solicitud["revisorActualRol"] = ""
    solicitud["estadoTrasPadres"] = estado_final
    solicitud["actualizadoEn"] = ahora_iso()
    enlace = "/solicitudes/" + solicitud["solicitudId"]
    if solicitud.get("requierePadres"):
        padres = _apoderados_vinculados(solicitud)
        if padres:
            solicitud["estado"] = "EN_AUTORIZACION_PADRES"
            t("T_SOLICITUDES").put_item(Item=solicitud)
            for padre in padres:
                t("T_AUTORIZACIONES").put_item(
                    Item={
                        "autorizacionId": uuid.uuid4().hex,
                        "solicitudId": solicitud["solicitudId"],
                        "solicitudTitulo": solicitud["titulo"],
                        "fecha": solicitud.get("fecha") or "",
                        "horaInicio": solicitud.get("horaInicio") or "",
                        "lugar": solicitud.get("lugar") or "",
                        "responsable": solicitud.get("solicitanteNombre") or "",
                        "apoderadoId": padre["usuarioId"],
                        "apoderadoNombre": padre.get("nombre", ""),
                        "estado": "PENDIENTE",
                        "creadoEn": ahora_iso(),
                    }
                )
                notificar(
                    [padre["usuarioId"]],
                    "Autorización pendiente",
                    'Revisa la actividad "' + solicitud["titulo"] + '" de tu hijo(a)',
                    "/autorizaciones",
                    "autorizacion",
                )
            notificar([solicitud["solicitanteId"]], "Esperando a los padres", "La solicitud fue aprobada y enviada a los apoderados", enlace)
            return
    solicitud["estado"] = estado_final
    t("T_SOLICITUDES").put_item(Item=solicitud)
    _publicar_evento(solicitud)
    sufijo = " con condiciones" if con_condiciones else ""
    notificar([solicitud["solicitanteId"]], "Solicitud aprobada", '"' + solicitud["titulo"] + '" fue aprobada' + sufijo, enlace, "exito")
    for u in usuarios_por_rol("direccion"):
        notificar([u["usuarioId"]], "Solicitud aprobada", '"' + solicitud["titulo"] + '" quedó aprobada' + sufijo, enlace)


def _aprobar(solicitud, usuario, b, catalogo, con_condiciones):
    paso = _paso_actual(solicitud)
    paso["estado"] = "APROBADO"
    paso["decididoEn"] = ahora_iso()
    paso["comentario"] = b.get("comentario") or ""
    if con_condiciones:
        paso["condiciones"] = b.get("condiciones") or ""
    t("T_PASOS").put_item(Item=paso)
    n = paso.get("nro") or solicitud.get("pasoActual") or 1
    ruta = solicitud.get("ruta") or []
    auditar(usuario, "aprobar_condiciones" if con_condiciones else "aprobar", "solicitud", solicitud["solicitudId"], {"paso": n})
    enlace = "/solicitudes/" + solicitud["solicitudId"]
    if n < len(ruta):
        solicitud["pasoActual"] = n + 1
        revisor = _iniciar_paso(solicitud, n + 1, catalogo)
        solicitud["estado"] = "EN_REVISION"
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        _notificar_revisor(revisor, solicitud)
        notificar([solicitud["solicitanteId"]], "Avance de tu solicitud", "Paso " + str(n) + " aprobado, ahora en revisión de " + ruta[n], enlace)
    else:
        if con_condiciones:
            solicitud["condiciones"] = b.get("condiciones") or ""
        _aprobacion_final(solicitud, catalogo, con_condiciones)


def _crear_proyecto_desde_solicitud(solicitud):
    proyecto = {
        "proyectoId": uuid.uuid4().hex,
        "nombre": solicitud["titulo"],
        "descripcion": solicitud.get("objetivo") or "",
        "objetivo": solicitud.get("objetivo") or "",
        "categoria": solicitud.get("tipoNombre") or solicitud.get("tipo", "otros"),
        "estado": "ACTIVA",
        "responsableId": solicitud["solicitanteId"],
        "responsableNombre": solicitud.get("solicitanteNombre") or "",
        "docenteAsesorId": solicitud.get("docenteAsesorId") or "",
        "equipo": [{"usuarioId": solicitud["solicitanteId"], "nombre": solicitud.get("solicitanteNombre") or "", "cargo": "lider"}],
        "hitos": [{"titulo": "Ejecución de la actividad", "fecha": solicitud.get("fecha") or "", "cumplido": False}],
        "abiertoUnirse": True,
        "solicitudId": solicitud["solicitudId"],
        "legado": {"documentos": [], "contactos": [], "aprendizajes": ""},
        "alertaInactividad": False,
        "creadoEn": ahora_iso(),
        "actualizadoEn": ahora_iso(),
    }
    t("T_PROYECTOS").put_item(Item=proyecto)
    return proyecto


def _acciones_disponibles(usuario, solicitud):
    acciones = []
    estado = solicitud.get("estado")
    if _es_solicitante(usuario, solicitud):
        if estado == "BORRADOR":
            acciones.append("enviar")
        if estado == "OBSERVADA":
            acciones.append("responder_observacion")
        if estado in ("APROBADA", "APROBADA_CONDICIONES"):
            acciones.append("ejecutar")
        if estado == "EN_EJECUCION":
            acciones.append("finalizar")
        if estado == "FINALIZADA":
            acciones.append("archivar")
    if estado == "EN_REVISION" and _puede_revisar(usuario, solicitud):
        acciones += ["aprobar", "aprobar_condiciones", "observar", "rechazar", "delegar"]
    return acciones


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    bandeja = consulta(evento, "bandeja")
    estado = consulta(evento, "estado") or ""
    tipo = consulta(evento, "tipo") or ""
    rol = usuario.get("rol")
    tabla = t("T_SOLICITUDES")
    if bandeja:
        if rol not in ROLES_REVISORES:
            return error("Sin permiso para la bandeja de revisión", 403)
        items = []
        for pk in [usuario["usuarioId"], "ROL#" + rol]:
            items.extend(
                query_todo(
                    tabla,
                    IndexName="por-revisor",
                    KeyConditionExpression="#p = :p",
                    ExpressionAttributeNames={"#p": "revisorActualId"},
                    ExpressionAttributeValues={":p": pk},
                )
            )
        items = [s for s in items if s.get("estado") == "EN_REVISION"]
    elif estado:
        items = query_todo(
            tabla,
            IndexName="por-estado",
            KeyConditionExpression="#e = :e",
            ExpressionAttributeNames={"#e": "estado"},
            ExpressionAttributeValues={":e": estado},
        )
    elif rol in ("estudiante", "padre"):
        items = query_todo(
            tabla,
            IndexName="por-solicitante",
            KeyConditionExpression="#s = :s",
            ExpressionAttributeNames={"#s": "solicitanteId"},
            ExpressionAttributeValues={":s": usuario["usuarioId"]},
        )
    else:
        items = scan_todo(tabla)
    if tipo:
        items = [s for s in items if s.get("tipo") == tipo]
    vistos = set()
    salida = []
    for s in sorted(items, key=lambda x: x.get("creadoEn", ""), reverse=True):
        if s.get("solicitudId") in vistos:
            continue
        vistos.add(s["solicitudId"])
        salida.append(s)
    return ok(salida[:200])


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") not in ROLES_CREADORES:
        return error("Tu rol no puede crear solicitudes", 403)
    b = cuerpo(evento)
    catalogo = obtener_catalogo()
    tipo = b.get("tipo") or ""
    tipos = catalogo.get("tiposSolicitud") or {}
    if tipo not in tipos:
        return error("Tipo de solicitud inválido")
    titulo = (b.get("titulo") or "").strip()
    if not titulo:
        return error("El título es obligatorio")
    definicion = tipos[tipo]
    solicitud = {
        "solicitudId": uuid.uuid4().hex,
        "tipo": tipo,
        "tipoNombre": definicion.get("nombre", tipo),
        "titulo": titulo,
        "objetivo": b.get("objetivo") or "",
        "descripcion": b.get("descripcion") or "",
        "fecha": b.get("fecha") or "",
        "horaInicio": b.get("horaInicio") or "",
        "horaFin": b.get("horaFin") or "",
        "lugar": b.get("lugar") or "",
        "ambienteId": b.get("ambienteId") or "",
        "participantes": b.get("participantes") or [],
        "recursos": b.get("recursos") or "",
        "presupuesto": b.get("presupuesto") or "",
        "riesgos": b.get("riesgos") or "",
        "docenteAsesorId": b.get("docenteAsesorId") or "",
        "adjuntos": b.get("adjuntos") or [],
        "checklist": [{"texto": c, "hecho": False} for c in definicion.get("checklist", [])],
        "ruta": definicion.get("ruta") or ["docente", "direccion"],
        "requierePadres": bool(definicion.get("requierePadres", False)),
        "estado": "BORRADOR",
        "pasoActual": 0,
        "solicitanteId": usuario["usuarioId"],
        "solicitanteNombre": usuario.get("nombre", ""),
        "nivel": usuario.get("nivel") or "",
        "grado": usuario.get("grado") or "",
        "seccion": usuario.get("seccion") or "",
        "creadoEn": ahora_iso(),
        "actualizadoEn": ahora_iso(),
    }
    t("T_SOLICITUDES").put_item(Item=solicitud)
    auditar(usuario, "crear", "solicitud", solicitud["solicitudId"], {"titulo": titulo, "tipo": tipo})
    return ok(solicitud, 201)


def obtener(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    solicitud_id = param(evento, "id")
    solicitud = _obtener(solicitud_id)
    if not solicitud:
        return error("Solicitud no encontrada", 404)
    pasos = query_todo(
        t("T_PASOS"),
        KeyConditionExpression="#s = :s",
        ExpressionAttributeNames={"#s": "solicitudId"},
        ExpressionAttributeValues={":s": solicitud_id},
    )
    pasos.sort(key=lambda p: p.get("nro", 0))
    comentarios = query_todo(
        t("T_COMENTARIOS"),
        KeyConditionExpression="#s = :s",
        ExpressionAttributeNames={"#s": "solicitudId"},
        ExpressionAttributeValues={":s": solicitud_id},
    )
    comentarios.sort(key=lambda c: c.get("creadoEn__id", ""))
    ver_internos = (not _es_solicitante(usuario, solicitud)) and usuario.get("rol") in (
        "docente", "coordinacion", "direccion", "administracion", "ti"
    )
    comentarios = [c for c in comentarios if not c.get("interno") or ver_internos]
    autorizaciones = query_todo(
        t("T_AUTORIZACIONES"),
        IndexName="por-solicitud",
        KeyConditionExpression="#s = :s",
        ExpressionAttributeNames={"#s": "solicitudId"},
        ExpressionAttributeValues={":s": solicitud_id},
    )
    proyecto = None
    if solicitud.get("proyectoId"):
        proyecto = t("T_PROYECTOS").get_item(Key={"proyectoId": solicitud["proyectoId"]}).get("Item")
    return ok(
        {
            "solicitud": solicitud,
            "pasos": pasos,
            "comentarios": comentarios,
            "autorizaciones": autorizaciones,
            "proyecto": proyecto,
            "acciones": _acciones_disponibles(usuario, solicitud),
            "esRevisorActual": _puede_revisar(usuario, solicitud),
        }
    )


def actualizar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    solicitud_id = param(evento, "id")
    solicitud = _obtener(solicitud_id)
    if not solicitud:
        return error("Solicitud no encontrada", 404)
    if not (_es_solicitante(usuario, solicitud) or usuario.get("rol") == "ti"):
        return error("Sin permiso para editar esta solicitud", 403)
    if solicitud.get("estado") not in ("BORRADOR", "OBSERVADA"):
        return error("Solo se pueden editar borradores o solicitudes observadas")
    _aplicar_cambios(solicitud, cuerpo(evento))
    solicitud["actualizadoEn"] = ahora_iso()
    t("T_SOLICITUDES").put_item(Item=solicitud)
    auditar(usuario, "actualizar", "solicitud", solicitud_id)
    return ok(solicitud)


def accion(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    solicitud_id = param(evento, "id")
    solicitud = _obtener(solicitud_id)
    if not solicitud:
        return error("Solicitud no encontrada", 404)
    b = cuerpo(evento)
    acc = b.get("accion") or ""
    catalogo = obtener_catalogo()
    estado = solicitud.get("estado")
    enlace = "/solicitudes/" + solicitud_id

    if acc == "enviar":
        if not _es_solicitante(usuario, solicitud):
            return error("Solo el solicitante puede enviar", 403)
        if estado != "BORRADOR":
            return error("Solo se pueden enviar borradores")
        _enviar(solicitud, catalogo)
        auditar(usuario, "enviar", "solicitud", solicitud_id)

    elif acc == "responder_observacion":
        if not _es_solicitante(usuario, solicitud):
            return error("Solo el solicitante puede responder la observación", 403)
        if estado != "OBSERVADA":
            return error("La solicitud no está observada")
        _aplicar_cambios(solicitud, b)
        n = solicitud.get("pasoActual") or 1
        revisor = _iniciar_paso(solicitud, n, catalogo)
        solicitud["estado"] = "EN_REVISION"
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        _notificar_revisor(revisor, solicitud)
        notificar([solicitud["solicitanteId"]], "Observación respondida", "Tu solicitud volvió a revisión", enlace)
        auditar(usuario, "responder_observacion", "solicitud", solicitud_id)

    elif acc in ("aprobar", "aprobar_condiciones"):
        if not (_puede_revisar(usuario, solicitud) or usuario.get("rol") in ("ti", "direccion")):
            return error("No eres el revisor actual de esta solicitud", 403)
        if estado != "EN_REVISION":
            return error("La solicitud no está en revisión")
        if acc == "aprobar_condiciones" and not (b.get("condiciones") or "").strip():
            return error("Debes indicar las condiciones de la aprobación")
        _aprobar(solicitud, usuario, b, catalogo, con_condiciones=(acc == "aprobar_condiciones"))

    elif acc == "observar":
        if not _puede_revisar(usuario, solicitud):
            return error("No eres el revisor actual de esta solicitud", 403)
        if estado != "EN_REVISION":
            return error("La solicitud no está en revisión")
        motivo = (b.get("comentario") or "").strip()
        if not motivo:
            return error("Debes indicar el motivo de la observación")
        paso = _paso_actual(solicitud)
        paso["estado"] = "OBSERVADO"
        paso["decididoEn"] = ahora_iso()
        paso["comentario"] = motivo
        t("T_PASOS").put_item(Item=paso)
        solicitud["estado"] = "OBSERVADA"
        solicitud["observacion"] = motivo
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        notificar([solicitud["solicitanteId"]], "Solicitud observada", "Motivo: " + motivo, enlace, "alerta")
        auditar(usuario, "observar", "solicitud", solicitud_id, {"motivo": motivo})

    elif acc == "rechazar":
        if not (_puede_revisar(usuario, solicitud) or usuario.get("rol") in ("ti", "direccion")):
            return error("No eres el revisor actual de esta solicitud", 403)
        if estado != "EN_REVISION":
            return error("La solicitud no está en revisión")
        motivo = (b.get("comentario") or "").strip()
        if not motivo:
            return error("Debes indicar el motivo del rechazo")
        paso = _paso_actual(solicitud)
        paso["estado"] = "RECHAZADO"
        paso["decididoEn"] = ahora_iso()
        paso["comentario"] = motivo
        t("T_PASOS").put_item(Item=paso)
        solicitud["estado"] = "RECHAZADA"
        solicitud["motivoRechazo"] = motivo
        solicitud["revisorActualRol"] = ""
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        notificar([solicitud["solicitanteId"]], "Solicitud rechazada", "Motivo: " + motivo, enlace, "alerta")
        auditar(usuario, "rechazar", "solicitud", solicitud_id, {"motivo": motivo})

    elif acc == "delegar":
        if not _puede_revisar(usuario, solicitud):
            return error("No eres el revisor actual de esta solicitud", 403)
        objetivo_id = b.get("usuarioId") or ""
        objetivo = t("T_USUARIOS").get_item(Key={"usuarioId": objetivo_id}).get("Item")
        if not objetivo or objetivo.get("rol") != usuario.get("rol") or not objetivo.get("activo", True):
            return error("Solo puedes delegar a un usuario activo de tu mismo rol")
        paso = _paso_actual(solicitud)
        paso["revisorId"] = objetivo_id
        paso["revisorNombre"] = objetivo.get("nombre", "")
        paso["delegadoPor"] = usuario.get("nombre", "")
        t("T_PASOS").put_item(Item=paso)
        solicitud["revisorActualId"] = objetivo_id
        solicitud["revisorActualNombre"] = objetivo.get("nombre", "")
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        notificar([objetivo_id], "Revisión delegada", usuario.get("nombre", "") + ' te delegó "' + solicitud["titulo"] + '"', enlace, "revision")
        auditar(usuario, "delegar", "solicitud", solicitud_id, {"a": objetivo_id})

    elif acc == "ejecutar":
        if not (_es_solicitante(usuario, solicitud) or usuario.get("rol") in ("ti", "direccion")):
            return error("Sin permiso para ejecutar esta solicitud", 403)
        if estado not in ("APROBADA", "APROBADA_CONDICIONES"):
            return error("La solicitud no está aprobada")
        solicitud["estado"] = "EN_EJECUCION"
        solicitud["actualizadoEn"] = ahora_iso()
        proyecto = _crear_proyecto_desde_solicitud(solicitud)
        solicitud["proyectoId"] = proyecto["proyectoId"]
        t("T_SOLICITUDES").put_item(Item=solicitud)
        notificar(
            [solicitud["solicitanteId"]],
            "Solicitud en ejecución",
            'Se creó el proyecto "' + proyecto["nombre"] + '"',
            "/proyectos/" + proyecto["proyectoId"],
        )
        auditar(usuario, "ejecutar", "solicitud", solicitud_id)

    elif acc == "finalizar":
        if not _es_solicitante(usuario, solicitud):
            return error("Solo el solicitante puede finalizar", 403)
        if estado != "EN_EJECUCION":
            return error("La solicitud no está en ejecución")
        solicitud["estado"] = "FINALIZADA"
        solicitud["informeFinal"] = b.get("informe") or ""
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        if solicitud.get("proyectoId"):
            p = t("T_PROYECTOS").get_item(Key={"proyectoId": solicitud["proyectoId"]}).get("Item")
            if p:
                p["estado"] = "FINALIZADA"
                p["actualizadoEn"] = ahora_iso()
                legado = p.get("legado") or {}
                legado["aprendizajes"] = b.get("informe") or legado.get("aprendizajes", "")
                p["legado"] = legado
                t("T_PROYECTOS").put_item(Item=p)
        for u in usuarios_por_rol("direccion"):
            notificar([u["usuarioId"]], "Solicitud finalizada", '"' + solicitud["titulo"] + '" finalizó', enlace)
        auditar(usuario, "finalizar", "solicitud", solicitud_id)

    elif acc == "archivar":
        if not (_es_solicitante(usuario, solicitud) or usuario.get("rol") in ("ti", "direccion")):
            return error("Sin permiso para archivar", 403)
        if estado != "FINALIZADA":
            return error("Solo se archivan solicitudes finalizadas")
        solicitud["estado"] = "ARCHIVADA"
        solicitud["actualizadoEn"] = ahora_iso()
        t("T_SOLICITUDES").put_item(Item=solicitud)
        auditar(usuario, "archivar", "solicitud", solicitud_id)

    else:
        return error("Acción no válida")

    return ok(solicitud)
