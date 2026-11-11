import uuid
from datetime import timedelta

from src.common.auth import hash_clave
from src.common.catalogo import obtener_catalogo
from src.common.db import scan_todo, t
from src.common.fechas import ahora, ahora_iso, iso, parse_iso, sumar_dias_habiles
from src.common.sistema import notificar, usuario_por_email, usuarios_por_rol

SUPERIORES = {"docente": "coordinacion", "coordinacion": "direccion", "administracion": "direccion", "direccion": "ti"}


def _notificar_revisor_sla(revisor_id, titulo, mensaje):
    if revisor_id and revisor_id.startswith("ROL#"):
        notificar([u["usuarioId"] for u in usuarios_por_rol(revisor_id[4:])], titulo, mensaje, "", "alerta")
    elif revisor_id:
        notificar([revisor_id], titulo, mensaje, "", "alerta")


def sla_monitor(evento, contexto):
    ahora_dt = ahora()
    ahora_str = iso(ahora_dt)
    resumen = {"alertas50": 0, "alertas80": 0, "vencidas": 0, "inactivos": 0, "publicados": 0, "caducados": 0}

    solicitudes = [s for s in scan_todo(t("T_SOLICITUDES")) if s.get("estado") == "EN_REVISION"]
    for s in solicitudes:
        n = s.get("pasoActual") or 1
        paso = t("T_PASOS").get_item(Key={"solicitudId": s["solicitudId"], "pasoId": "P%02d" % n}).get("Item")
        if not paso or paso.get("estado") != "EN_REVISION":
            continue
        try:
            inicio = parse_iso(paso["iniciadoEn"])
            vence = parse_iso(paso["plazoVenceEn"])
        except Exception:
            continue
        enlace = "/solicitudes/" + s["solicitudId"]
        if vence <= ahora_dt:
            if not paso.get("escalado"):
                paso["escalado"] = True
                paso["escaladoEn"] = ahora_str
                t("T_PASOS").put_item(Item=paso)
                resumen["vencidas"] += 1
                mensaje = '"' + s["titulo"] + '" venció su plazo en revisión de ' + paso.get("rol", "")
                _notificar_revisor_sla(paso.get("revisorId"), "Plazo vencido", mensaje)
                superior = SUPERIORES.get(paso.get("rol", ""), "direccion")
                for u in usuarios_por_rol(superior):
                    notificar([u["usuarioId"]], "Escalamiento de solicitud", mensaje, enlace, "alerta")
        else:
            total = (vence - inicio).total_seconds()
            transcurrido = (ahora_dt - inicio).total_seconds()
            fraccion = transcurrido / total if total else 0
            if fraccion >= 0.8 and not paso.get("alerta80"):
                paso["alerta80"] = True
                t("T_PASOS").put_item(Item=paso)
                resumen["alertas80"] += 1
                _notificar_revisor_sla(paso.get("revisorId"), "80% del plazo", '"' + s["titulo"] + '" está por vencer')
            elif fraccion >= 0.5 and not paso.get("alerta50"):
                paso["alerta50"] = True
                t("T_PASOS").put_item(Item=paso)
                resumen["alertas50"] += 1
                _notificar_revisor_sla(paso.get("revisorId"), "50% del plazo", '"' + s["titulo"] + '" lleva la mitad de su plazo')

    hace_30 = iso(ahora_dt - timedelta(days=30))
    for p in scan_todo(t("T_PROYECTOS")):
        if p.get("estado") == "ACTIVA" and p.get("actualizadoEn", "9999") < hace_30 and not p.get("alertaInactividad"):
            p["alertaInactividad"] = True
            t("T_PROYECTOS").put_item(Item=p)
            resumen["inactivos"] += 1
            notificar(
                [p.get("responsableId"), p.get("docenteAsesorId")],
                "Proyecto inactivo",
                '"' + p.get("nombre", "") + '" lleva 30 días sin movimiento',
                "/proyectos/" + p.get("proyectoId", ""),
                "alerta",
            )

    from src.functions.anuncios import _notificar_segmento
    for a in scan_todo(t("T_ANUNCIOS")):
        if a.get("estado") == "PROGRAMADO" and a.get("publicarEn", "9999") <= ahora_str:
            a["estado"] = "PUBLICADO"
            t("T_ANUNCIOS").put_item(Item=a)
            resumen["publicados"] += 1
            _notificar_segmento(a)
        elif a.get("estado") == "PUBLICADO" and a.get("caducaEn") and a["caducaEn"] <= ahora_str:
            a["estado"] = "CADUCADO"
            t("T_ANUNCIOS").put_item(Item=a)
            resumen["caducados"] += 1

    return {"ok": True, "resumen": resumen}


USUARIOS_DEMO = [
    {"nombre": "Omar Alonso", "email": "omar@santaanita.edu.pe", "rol": "estudiante", "nivel": "Secundaria", "grado": "5°", "seccion": "A"},
    {"nombre": "Lucía Ramírez", "email": "lucia@santaanita.edu.pe", "rol": "docente", "nivel": "Secundaria", "grado": "5°", "seccion": "A"},
    {"nombre": "Carlos Mendoza", "email": "carlos@santaanita.edu.pe", "rol": "coordinacion", "nivel": "Secundaria"},
    {"nombre": "Laura Vargas", "email": "laura@santaanita.edu.pe", "rol": "direccion"},
    {"nombre": "Rosa Quispe", "email": "rosa@santaanita.edu.pe", "rol": "administracion"},
    {"nombre": "Jorge Pérez", "email": "jorge@santaanita.edu.pe", "rol": "padre"},
    {"nombre": "Enrique Salas", "email": "enrique@santaanita.edu.pe", "rol": "promotor"},
    {"nombre": "Admin TI", "email": "ti@santaanita.edu.pe", "rol": "ti"},
]
CLAVE_DEMO = "demo1234"

PLANTILLAS_DEMO = [
    {
        "nombre": "Carta de solicitud",
        "categoria": "solicitudes",
        "descripcion": "Formato base para presentar una iniciativa ante las autoridades",
        "contenido": "Lima, ____ de ______ de 20__\n\nSeñora Directora del Colegio Santa Anita\nPresente.-\n\nEstimada señora Directora:\n\nPor medio de la presente, los estudiantes de ____ grado, sección ____, solicitamos autorización para ____. La actividad se realizará el día ____ de ____ en ____, con la participación de ____ estudiantes y el acompañamiento del docente ____.\n\nObjetivo: ____\nRecursos necesarios: ____\n\nAgradecemos de antemano su revisión y aprobación.\n\nAtentamente,\n____________________\nNombre del estudiante responsable",
    },
    {
        "nombre": "Plan de actividad",
        "categoria": "solicitudes",
        "descripcion": "Estructura del plan para eventos y actividades",
        "contenido": "1. Nombre de la actividad: ____\n2. Responsable y equipo organizador: ____\n3. Docente asesor: ____\n4. Objetivo: ____\n5. Fecha, horario y lugar: ____\n6. Participantes esperados: ____\n7. Cronograma de preparación: ____\n8. Recursos y presupuesto: ____\n9. Riesgos y mitigaciones: ____",
    },
    {
        "nombre": "Autorización de padres",
        "categoria": "apoderados",
        "descripcion": "Formato de consentimiento para salidas y actividades con menores",
        "contenido": "AUTORIZACIÓN DE SALIDA\n\nYo, ____________________, apoderado(a) de ____________________, estudiante de ____ grado, sección ____, autorizo su participación en la actividad «____» programada para el día ____ de ____, en ____, organizada por el Colegio Santa Anita.\n\nFirma del apoderado: ____________________\nFecha: ____",
    },
    {
        "nombre": "Presupuesto",
        "categoria": "administrativo",
        "descripcion": "Formato para recaudaciones y emprendimientos",
        "contenido": "Concepto | Cantidad | Costo unitario | Total\n--------|----------|----------------|-------\n____    | ____     | S/ ____       | S/ ____\n\nIngresos esperados: S/ ____\nTotal de gastos: S/ ____\nSaldo proyectado: S/ ____",
    },
]


def _crear_usuario_demo(u):
    existente = usuario_por_email(u["email"])
    if existente:
        return existente
    sal, hash_calculado = hash_clave(CLAVE_DEMO)
    nuevo = {
        "usuarioId": uuid.uuid4().hex,
        "activo": True,
        "consentimientoDatos": True,
        "preferencias": {"tema": "claro", "tamanoLetra": "mediano", "resumenDiario": False},
        "hijos": [],
        "claveSal": sal,
        "claveHash": hash_calculado,
        "creadoEn": ahora_iso(),
    }
    nuevo.update(u)
    t("T_USUARIOS").put_item(Item=nuevo)
    return nuevo


def seed(evento, contexto):
    obtener_catalogo()
    creados = []

    for u in USUARIOS_DEMO:
        antes = usuario_por_email(u["email"])
        _crear_usuario_demo(u)
        if not antes:
            creados.append(u["email"])

    omar = usuario_por_email("omar@santaanita.edu.pe")
    lucia = usuario_por_email("lucia@santaanita.edu.pe")
    jorge = usuario_por_email("jorge@santaanita.edu.pe")
    if jorge and omar and omar["usuarioId"] not in (jorge.get("hijos") or []):
        jorge["hijos"] = [omar["usuarioId"]]
        t("T_USUARIOS").put_item(Item=jorge)

    if not scan_todo(t("T_DOCUMENTOS")):
        for plantilla in PLANTILLAS_DEMO:
            t("T_DOCUMENTOS").put_item(
                Item={
                    "documentoId": uuid.uuid4().hex,
                    "tipo": "PLANTILLA",
                    "nombre": plantilla["nombre"],
                    "descripcion": plantilla["descripcion"],
                    "categoria": plantilla["categoria"],
                    "version": 1,
                    "archivoKey": "",
                    "contenido": plantilla["contenido"],
                    "creadoPor": "sistema",
                    "creadoPorNombre": "Sistema",
                    "creadoEn": ahora_iso(),
                }
            )

    if not scan_todo(t("T_ANUNCIOS")):
        demos = [
            {
                "titulo": "Bienvenidos a Santa Anita Conecta",
                "contenido": "Esta es la nueva plataforma oficial del colegio. Todas las solicitudes, anuncios, el calendario y el seguimiento de iniciativas se gestionan aquí. Lo que se publica en esta plataforma es la información oficial.",
                "categoria": "Administrativo",
                "prioridad": "importante",
                "segmento": {},
                "fija": True,
                "estado": "PUBLICADO",
            },
            {
                "titulo": "Evaluaciones del bimestre",
                "contenido": "Las evaluaciones de cierre de bimestre comienzan la próxima semana. Revisa el calendario para ver las fechas por grado y curso.",
                "categoria": "Académico",
                "prioridad": "normal",
                "segmento": {"niveles": ["Secundaria"]},
                "fija": False,
                "estado": "PUBLICADO",
            },
            {
                "titulo": "Feria de emprendimiento estudiantil",
                "contenido": "Inscríbete con tu equipo para participar en la feria. Las solicitudes de actividad se presentan desde la plataforma.",
                "categoria": "Eventos",
                "prioridad": "normal",
                "segmento": {},
                "fija": False,
                "estado": "PUBLICADO",
            },
        ]
        for d in demos:
            d.update(
                {
                    "anuncioId": uuid.uuid4().hex,
                    "publicarEn": "",
                    "caducaEn": "",
                    "adjuntos": [],
                    "encuesta": None,
                    "creadoPor": (lucia or {}).get("usuarioId", "sistema"),
                    "creadoPorNombre": (lucia or {}).get("nombre", "Sistema"),
                    "creadoPorRol": "docente",
                    "creadoEn": ahora_iso(),
                }
            )
            t("T_ANUNCIOS").put_item(Item=d)

    if not scan_todo(t("T_EVENTOS")):
        feria = (ahora() + timedelta(days=15)).date()
        t("T_EVENTOS").put_item(
            Item={
                "eventoId": uuid.uuid4().hex,
                "titulo": "Feria de emprendimiento estudiantil",
                "descripcion": "Stands de emprendimientos de estudiantes en el patio principal",
                "fecha": feria.isoformat(),
                "horaInicio": "09:00",
                "horaFin": "13:00",
                "tipo": "ACTIVIDAD",
                "ambienteId": "patio",
                "nivel": "Secundaria",
                "grado": "",
                "seccion": "",
                "solicitudId": "",
                "proyectoId": "",
                "creadoPor": "sistema",
                "creadoPorNombre": "Sistema",
                "creadoEn": ahora_iso(),
            }
        )

    if not scan_todo(t("T_QRS")):
        ti = usuario_por_email("ti@santaanita.edu.pe")
        creador = ti or lucia or omar or {}
        feria_evento = next(
            (e for e in scan_todo(t("T_EVENTOS")) if e.get("titulo") == "Feria de emprendimiento estudiantil"),
            None,
        )
        bienvenida = next(
            (a for a in scan_todo(t("T_ANUNCIOS")) if a.get("titulo") == "Bienvenidos a Santa Anita Conecta"),
            None,
        )
        demos_qr = []
        if feria_evento:
            demos_qr.append(
                {
                    "codigo": "demo-feria",
                    "tipo": "evento",
                    "refId": feria_evento["eventoId"],
                    "titulo": feria_evento["titulo"],
                }
            )
        if bienvenida:
            demos_qr.append(
                {
                    "codigo": "demo-anuncio",
                    "tipo": "anuncio",
                    "refId": bienvenida["anuncioId"],
                    "titulo": bienvenida["titulo"],
                }
            )
        for d in demos_qr:
            t("T_QRS").put_item(
                Item={
                    "codigo": d["codigo"],
                    "tipo": d["tipo"],
                    "refId": d["refId"],
                    "titulo": d["titulo"],
                    "expiraEn": "",
                    "usos": 0,
                    "asistencias": [],
                    "creadoPor": creador.get("usuarioId", "sistema"),
                    "creadoPorNombre": creador.get("nombre", "Sistema"),
                    "creadoEn": ahora_iso(),
                }
            )

    if omar and lucia and not scan_todo(t("T_PROYECTOS")):
        proyecto_id = uuid.uuid4().hex
        t("T_PROYECTOS").put_item(
            Item={
                "proyectoId": proyecto_id,
                "nombre": "Modelo de Naciones Unidas (MUN)",
                "descripcion": "Delegación estudiantil para el MUN escolar",
                "objetivo": "Representar al colegio en el MUN y formar delegados",
                "categoria": "MUN",
                "estado": "ACTIVA",
                "responsableId": omar["usuarioId"],
                "responsableNombre": omar["nombre"],
                "docenteAsesorId": lucia["usuarioId"],
                "equipo": [{"usuarioId": omar["usuarioId"], "nombre": omar["nombre"], "cargo": "lider"}],
                "hitos": [
                    {"titulo": "Selección de delegados", "fecha": (ahora() + timedelta(days=10)).date().isoformat(), "cumplido": False},
                    {"titulo": "Elaboración de temario", "fecha": (ahora() + timedelta(days=20)).date().isoformat(), "cumplido": False},
                ],
                "abiertoUnirse": True,
                "solicitudId": "",
                "legado": {
                    "documentos": [],
                    "contactos": [{"nombre": "Delegación 2024", "rol": "egresados", "correo": "mun2024@santaanita.edu.pe"}],
                    "aprendizajes": "La delegación 2024 recomienda iniciar la selección de delegados con anticipación y coordinar los permisos con Dirección al inicio del año.",
                },
                "alertaInactividad": False,
                "creadoEn": iso(ahora() - timedelta(days=40)),
                "actualizadoEn": iso(ahora() - timedelta(days=5)),
            }
        )
        tareas_demo = [
            ("Inscribir delegados", "POR_HACER", (ahora() + timedelta(days=7)).date().isoformat()),
            ("Elaborar temario de comités", "EN_CURSO", (ahora() + timedelta(days=14)).date().isoformat()),
            ("Reservar el auditorio", "HECHO", (ahora() - timedelta(days=2)).date().isoformat()),
        ]
        for titulo, estado, vence in tareas_demo:
            t("T_TAREAS").put_item(
                Item={
                    "proyectoId": proyecto_id,
                    "tareaId": uuid.uuid4().hex,
                    "titulo": titulo,
                    "descripcion": "",
                    "estado": estado,
                    "responsableId": omar["usuarioId"],
                    "responsableNombre": omar["nombre"],
                    "vence": vence,
                    "creadoEn": ahora_iso(),
                }
            )
        t("T_BITACORA").put_item(
            Item={
                "proyectoId": proyecto_id,
                "creadoEn__id": ahora_iso() + "__" + uuid.uuid4().hex,
                "autorId": omar["usuarioId"],
                "autorNombre": omar["nombre"],
                "texto": "Se coordinó con la docente asesor(a) el temario de comités para este año.",
                "evidencias": [],
            }
        )

    if omar and lucia and not scan_todo(t("T_SOLICITUDES")):
        catalogo = obtener_catalogo()
        definicion = catalogo["tiposSolicitud"]["evento"]
        solicitud = {
            "solicitudId": uuid.uuid4().hex,
            "tipo": "evento",
            "tipoNombre": definicion["nombre"],
            "titulo": "MUN Santa Anita 2026",
            "objetivo": "Realizar la sexta edición del Modelo de Naciones Unidas del colegio",
            "descripcion": "Jornada de debate con comités en español e inglés en el auditorio.",
            "fecha": (ahora() + timedelta(days=21)).date().isoformat(),
            "horaInicio": "08:00",
            "horaFin": "14:00",
            "lugar": "Auditorio",
            "ambienteId": "auditorio",
            "participantes": [{"usuarioId": omar["usuarioId"], "nombre": omar["nombre"]}],
            "recursos": "Auditorio, micrófonos, credenciales",
            "presupuesto": "S/ 400",
            "riesgos": "Retraso en aprobación de ambiente; mitigado reservando con anticipación",
            "docenteAsesorId": lucia["usuarioId"],
            "adjuntos": [],
            "checklist": [{"texto": c, "hecho": False} for c in definicion.get("checklist", [])],
            "ruta": definicion["ruta"],
            "requierePadres": definicion.get("requierePadres", False),
            "estado": "BORRADOR",
            "pasoActual": 0,
            "solicitanteId": omar["usuarioId"],
            "solicitanteNombre": omar["nombre"],
            "nivel": "Secundaria",
            "grado": "5°",
            "seccion": "A",
            "creadoEn": ahora_iso(),
            "actualizadoEn": ahora_iso(),
        }
        from src.functions.solicitudes import _enviar
        _enviar(solicitud, catalogo)

    return {
        "ok": True,
        "usuariosNuevos": creados,
        "credenciales": {u["email"]: CLAVE_DEMO for u in USUARIOS_DEMO},
        "nota": "Ejecuta este seed una sola vez; es idempotente",
    }
