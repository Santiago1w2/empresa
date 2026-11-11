import calendar
import uuid

from src.common.auth import usuario_actual
from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora, ahora_iso
from src.common.sistema import auditar, notificar, usuarios_segmento
from src.common.util import consulta, cuerpo, error, ok, param

TIPOS_EVENTO = ["CLASE", "EVALUACION", "ACTIVIDAD", "REUNION", "FERIADO", "INSTITUCIONAL"]
ROLES_CREADORES = ("docente", "coordinacion", "direccion", "administracion", "ti")


def _detectar_conflictos(ev):
    conflictos = []
    mismo_dia = query_todo(
        t("T_EVENTOS"),
        IndexName="por-fecha",
        KeyConditionExpression="#f = :f",
        ExpressionAttributeNames={"#f": "fecha"},
        ExpressionAttributeValues={":f": ev["fecha"]},
    )
    for otro in mismo_dia:
        if otro.get("eventoId") == ev.get("eventoId"):
            continue
        hi, hf = ev.get("horaInicio", ""), ev.get("horaFin", "")
        ohi, ohf = otro.get("horaInicio", ""), otro.get("horaFin", "")
        if not (hi and hf and ohi and ohf):
            continue
        if hi < ohf and ohi < hf:
            if ev.get("ambienteId") and ev.get("ambienteId") == otro.get("ambienteId"):
                conflictos.append("Ambiente ocupado por «" + otro.get("titulo", "") + "» (" + ohi + "–" + ohf + ")")
            mismo_publico = (ev.get("grado") and ev.get("grado") == otro.get("grado")) or (
                ev.get("nivel") and ev.get("nivel") == otro.get("nivel") and not otro.get("grado")
            )
            if mismo_publico and "EVALUACION" in (ev.get("tipo"), otro.get("tipo")):
                conflictos.append("Choque con evaluación «" + otro.get("titulo", "") + "»")
    return conflictos


def listar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    hoy = ahora().date()
    desde = consulta(evento, "desde") or hoy.replace(day=1).isoformat()
    hasta = consulta(evento, "hasta") or hoy.replace(day=calendar.monthrange(hoy.year, hoy.month)[1]).isoformat()
    capas = consulta(evento, "capas") or ""
    items = [e for e in scan_todo(t("T_EVENTOS")) if desde <= e.get("fecha", "") <= hasta]
    if capas:
        permitidas = [c.strip().upper() for c in capas.split(",") if c.strip()]
        items = [e for e in items if e.get("tipo", "") in permitidas]
    items.sort(key=lambda e: (e.get("fecha", ""), e.get("horaInicio", "")))
    return ok(items)


def crear(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    if usuario.get("rol") not in ROLES_CREADORES:
        return error("Tu rol no puede crear eventos ni reservas", 403)
    b = cuerpo(evento)
    titulo = (b.get("titulo") or "").strip()
    fecha = b.get("fecha") or ""
    tipo = (b.get("tipo") or "ACTIVIDAD").upper()
    if not titulo or not fecha:
        return error("Título y fecha son obligatorios")
    if tipo not in TIPOS_EVENTO:
        return error("Tipo de evento inválido")
    ev = {
        "eventoId": uuid.uuid4().hex,
        "titulo": titulo,
        "descripcion": b.get("descripcion") or "",
        "fecha": fecha,
        "horaInicio": b.get("horaInicio") or "",
        "horaFin": b.get("horaFin") or "",
        "tipo": tipo,
        "ambienteId": b.get("ambienteId") or "",
        "nivel": b.get("nivel") or "",
        "grado": b.get("grado") or "",
        "seccion": b.get("seccion") or "",
        "solicitudId": b.get("solicitudId") or "",
        "proyectoId": b.get("proyectoId") or "",
        "creadoPor": usuario["usuarioId"],
        "creadoPorNombre": usuario.get("nombre", ""),
        "creadoEn": ahora_iso(),
    }
    conflictos = _detectar_conflictos(ev)
    t("T_EVENTOS").put_item(Item=ev)
    segmento = {}
    if ev.get("nivel"):
        segmento["niveles"] = [ev["nivel"]]
    if ev.get("grado"):
        segmento["grados"] = [ev["grado"]]
    if ev.get("seccion"):
        segmento["secciones"] = [ev["seccion"]]
    destinatarios = [u["usuarioId"] for u in usuarios_segmento(segmento)]
    if destinatarios:
        notificar(destinatarios, "Nuevo evento en el calendario", titulo + " · " + fecha, "/calendario")
    auditar(usuario, "crear", "evento", ev["eventoId"], {"titulo": titulo, "fecha": fecha})
    return ok({"evento": ev, "conflictos": conflictos}, 201)


def eliminar(evento, contexto):
    usuario = usuario_actual(evento)
    if not usuario:
        return error("No autenticado", 401)
    evento_id = param(evento, "id")
    ev = t("T_EVENTOS").get_item(Key={"eventoId": evento_id}).get("Item")
    if not ev:
        return error("Evento no encontrado", 404)
    if usuario.get("rol") not in ("ti", "direccion") and ev.get("creadoPor") != usuario["usuarioId"]:
        return error("Sin permiso para eliminar este evento", 403)
    t("T_EVENTOS").delete_item(Key={"eventoId": evento_id})
    auditar(usuario, "eliminar", "evento", evento_id)
    return ok({"eliminado": True})
