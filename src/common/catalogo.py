from src.common.db import t

ROLES_REVISORES = ["docente", "coordinacion", "administracion", "direccion"]
ROLES_TODOS = ["estudiante", "docente", "coordinacion", "direccion", "administracion", "padre", "promotor", "ti"]

CATALOGO_DEFECTO = {
    "catalogoId": "UNICO",
    "tiposSolicitud": {
        "actividad_recreo": {
            "nombre": "Actividad en recreo",
            "ruta": ["docente", "direccion"],
            "requierePadres": False,
            "checklist": ["Objetivo claro", "Lugar y horario", "Docente asesor"],
        },
        "evento": {
            "nombre": "Evento (MUN, feria, campeonato)",
            "ruta": ["docente", "coordinacion", "direccion"],
            "requierePadres": True,
            "checklist": ["Plan de actividad", "Presupuesto", "Lista de participantes", "Docente asesor"],
        },
        "uso_ambientes": {
            "nombre": "Uso de ambientes",
            "ruta": ["coordinacion", "administracion"],
            "requierePadres": False,
            "checklist": ["Ambiente solicitado", "Fecha y horario", "Responsable"],
        },
        "salida_visita": {
            "nombre": "Salida o visita",
            "ruta": ["docente", "coordinacion", "direccion"],
            "requierePadres": True,
            "checklist": ["Itinerario", "Lista de asistentes", "Autorización de padres", "Docente acompañante"],
        },
        "campania": {
            "nombre": "Campaña",
            "ruta": ["docente", "direccion"],
            "requierePadres": False,
            "checklist": ["Objetivo", "Alcance", "Recursos"],
        },
        "recaudacion": {
            "nombre": "Recaudación",
            "ruta": ["docente", "administracion", "direccion"],
            "requierePadres": False,
            "checklist": ["Destino de los fondos", "Presupuesto", "Autorización de dirección"],
        },
        "emprendimiento": {
            "nombre": "Emprendimiento",
            "ruta": ["docente", "direccion"],
            "requierePadres": False,
            "checklist": ["Propuesta", "Costos", "Equipo"],
        },
        "proyecto_ambiental": {
            "nombre": "Proyecto ambiental (biohuerto)",
            "ruta": ["docente", "direccion"],
            "requierePadres": False,
            "checklist": ["Objetivo", "Espacio", "Recursos"],
        },
        "municipio": {
            "nombre": "Reunión de municipio escolar",
            "ruta": ["coordinacion", "direccion"],
            "requierePadres": False,
            "checklist": ["Agenda", "Participantes"],
        },
        "permiso_ausencia": {
            "nombre": "Permiso para ausentarse de clase",
            "ruta": ["coordinacion"],
            "requierePadres": True,
            "checklist": ["Motivo", "Autorización del apoderado"],
        },
        "uso_materiales": {
            "nombre": "Uso de materiales",
            "ruta": ["administracion"],
            "requierePadres": False,
            "checklist": ["Lista de materiales", "Fecha de uso"],
        },
        "otros": {
            "nombre": "Otros",
            "ruta": ["docente", "coordinacion", "direccion"],
            "requierePadres": False,
            "checklist": ["Descripción de la actividad"],
        },
    },
    "slaPorRol": {"docente": 2, "coordinacion": 2, "administracion": 2, "direccion": 2},
    "categoriasAnuncio": ["Académico", "Administrativo", "Eventos", "Iniciativas", "Convivencia", "Urgente"],
    "ambientes": [
        {"ambienteId": "auditorio", "nombre": "Auditorio"},
        {"ambienteId": "laboratorio", "nombre": "Laboratorio"},
        {"ambienteId": "patio", "nombre": "Patio principal"},
        {"ambienteId": "aula-multiple", "nombre": "Aula de usos múltiples"},
        {"ambienteId": "losa", "nombre": "Losa deportiva"},
    ],
    "niveles": ["Primaria", "Secundaria"],
    "grados": ["1°", "2°", "3°", "4°", "5°"],
    "secciones": ["A", "B"],
}


def obtener_catalogo():
    tabla = t("T_CATALOGOS")
    cat = tabla.get_item(Key={"catalogoId": "UNICO"}).get("Item")
    if not cat:
        cat = dict(CATALOGO_DEFECTO)
        tabla.put_item(Item=cat)
    return cat
