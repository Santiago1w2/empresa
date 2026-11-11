from collections import defaultdict

from src.common.auth import usuario_actual
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora, iso, parse_iso
from src.common.sistema import usuarios_segmento
from src.common.util import error, ok
from datetime import timedelta


def handler(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    rol = usuario.get("rol")

    solicitudes = scan_todo(t("T_SOLICITUDES"))
    if rol == "estudiante":
        solicitudes = [s for s in solicitudes if s.get("solicitanteId") == usuario["usuarioId"]]
    elif rol == "docente":
        solicitudes = [s for s in solicitudes if s.get("docenteAsesorId") == usuario["usuarioId"]]

    pasos = scan_todo(t("T_PASOS"))
    if rol == "docente":
        ids = {s["solicitudId"] for s in solicitudes}
        pasos = [p for p in pasos if p.get("solicitudId") in ids]

    estados = {}
    for s in solicitudes:
        e = s.get("estado")
        if e and e != "BORRADOR":
            estados[e] = estados.get(e, 0) + 1

    tiempos = defaultdict(list)
    for p in pasos:
        if p.get("decididoEn") and p.get("iniciadoEn"):
            try:
                dias = (parse_iso(p["decididoEn"]) - parse_iso(p["iniciadoEn"])).total_seconds() / 86400
                tiempos[p.get("rol", "?")].append(max(dias, 0.0))
            except Exception:
                pass
    tiempo_por_rol = {r: round(sum(v) / len(v), 2) for r, v in tiempos.items()}
    todos = [x for v in tiempos.values() for x in v]
    tiempo_promedio = round(sum(todos) / len(todos), 2) if todos else 0

    ahora_str = iso(ahora())
    vencidas = sum(
        1 for p in pasos
        if p.get("estado") == "EN_REVISION" and p.get("plazoVenceEn", "9999") < ahora_str
    )

    proyectos = scan_todo(t("T_PROYECTOS"))
    proyectos_estado = {}
    for p in proyectos:
        proyectos_estado[p.get("estado", "?")] = proyectos_estado.get(p.get("estado", "?"), 0) + 1
    hace_30 = iso(ahora() - timedelta(days=30))
    en_riesgo = [p.get("nombre", "") for p in proyectos if p.get("estado") == "ACTIVA" and p.get("actualizadoEn", "9999") < hace_30]

    anuncios = [a for a in scan_todo(t("T_ANUNCIOS")) if a.get("estado") == "PUBLICADO"]
    usuarios = scan_todo(t("T_USUARIOS"))
    usuarios_rol = {}
    for u in usuarios:
        if u.get("activo", True):
            usuarios_rol[u.get("rol", "?")] = usuarios_rol.get(u.get("rol", "?"), 0) + 1

    tasas = []
    detalle = []
    for a in anuncios[:20]:
        lecturas = query_todo(
            t("T_LECTURAS"),
            KeyConditionExpression="#a = :a",
            ExpressionAttributeNames={"#a": "anuncioId"},
            ExpressionAttributeValues={":a": a["anuncioId"]},
        )
        objetivo = usuarios_segmento(a.get("segmento") or {})
        total = len(objetivo)
        leidos = len(lecturas)
        tasa = round(leidos * 100 / total, 1) if total else 0
        tasas.append(tasa)
        if rol in ("direccion", "ti", "promotor"):
            detalle.append({"anuncio": a.get("titulo", ""), "leidos": leidos, "total": total, "tasa": tasa})
    tasa_media = round(sum(tasas) / len(tasas), 1) if tasas else 0

    participacion = {}
    for s in solicitudes:
        nivel = s.get("nivel") or "Sin nivel"
        participacion[nivel] = participacion.get(nivel, 0) + 1

    return ok(
        {
            "totalSolicitudes": len(solicitudes),
            "solicitudesPorEstado": estados,
            "tiempoPromedioRespuestaDias": tiempo_promedio,
            "tiempoPromedioPorRolDias": tiempo_por_rol,
            "vencidas": vencidas,
            "proyectosPorEstado": proyectos_estado,
            "proyectosEnRiesgo": en_riesgo,
            "tasaLecturaAnuncios": tasa_media,
            "detalleLecturas": detalle,
            "usuariosPorRol": usuarios_rol,
            "participacionPorNivel": participacion,
        }
    )
