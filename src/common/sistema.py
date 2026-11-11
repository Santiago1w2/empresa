import json
import uuid

from src.common.db import query_todo, scan_todo, t
from src.common.fechas import ahora, iso


def notificar(destinatarios, titulo, mensaje, enlace="", tipo="info"):
    unicos = [d for d in dict.fromkeys(destinatarios) if d]
    if not unicos:
        return
    tabla = t("T_NOTIFICACIONES")
    ts = iso(ahora())
    for i in range(0, len(unicos), 25):
        lote = unicos[i:i + 25]
        tabla.batch_write_item(
            RequestItems={
                tabla.table_name: [
                    {
                        "PutRequest": {
                            "Item": {
                                "usuarioId": d,
                                "creadoEn__id": ts + "__" + uuid.uuid4().hex,
                                "titulo": titulo,
                                "mensaje": mensaje,
                                "enlace": enlace or "",
                                "tipo": tipo,
                                "leida": False,
                            }
                        }
                    }
                    for d in lote
                ]
            }
        )


def auditar(usuario, accion, entidad, entidad_id, detalle=None):
    tabla = t("T_AUDITORIA")
    ts = iso(ahora())
    u = usuario or {}
    tabla.put_item(
        Item={
            "tipo": "AUD",
            "creadoEn__id": ts + "__" + uuid.uuid4().hex,
            "usuarioId": u.get("usuarioId", "sistema"),
            "usuarioNombre": u.get("nombre", "Sistema"),
            "rol": u.get("rol", "sistema"),
            "accion": accion,
            "entidad": entidad,
            "entidadId": entidad_id or "",
            "detalle": json.dumps(detalle, default=str)[:1000] if detalle else "",
        }
    )


def usuarios_por_rol(rol):
    return query_todo(
        t("T_USUARIOS"),
        IndexName="por-rol",
        KeyConditionExpression="#r = :r",
        ExpressionAttributeNames={"#r": "rol"},
        ExpressionAttributeValues={":r": rol},
    )


def usuario_por_email(email):
    r = query_todo(
        t("T_USUARIOS"),
        IndexName="por-email",
        KeyConditionExpression="#e = :e",
        ExpressionAttributeNames={"#e": "email"},
        ExpressionAttributeValues={":e": (email or "").strip().lower()},
    )
    return r[0] if r else None


def cumple_segmento(usuario, segmento):
    if not segmento:
        return True
    roles = segmento.get("roles") or []
    niveles = segmento.get("niveles") or []
    grados = segmento.get("grados") or []
    secciones = segmento.get("secciones") or []
    proyecto_id = segmento.get("proyectoId")
    if roles and usuario.get("rol") not in roles:
        return False
    if niveles and usuario.get("nivel") not in niveles:
        return False
    if grados and usuario.get("grado") not in grados:
        return False
    if secciones and usuario.get("seccion") not in secciones:
        return False
    if proyecto_id:
        if usuario.get("rol") in ("ti", "direccion"):
            return True
        p = t("T_PROYECTOS").get_item(Key={"proyectoId": proyecto_id}).get("Item") or {}
        if p.get("docenteAsesorId") == usuario.get("usuarioId"):
            return True
        return any(m.get("usuarioId") == usuario.get("usuarioId") for m in p.get("equipo") or [])
    return True


def usuarios_segmento(segmento):
    usuarios = scan_todo(t("T_USUARIOS"))
    return [u for u in usuarios if u.get("activo", True) and cumple_segmento(u, segmento)]
