import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, urlDescarga } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora, nombreEstado, nombreRol, TEXTOS_ACCION } from "../util";
import { Badge, Cargando, EncabezadoVista, Tarjeta, Vacio } from "../componentes/basicos";

export default function SolicitudDetalle() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { toast, confirmar, promptTexto, abrirModal, cerrarModal } = useUi();
  const navegar = useNavigate();
  const [datos, setDatos] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const d = await api("/solicitudes/" + id);
      setDatos(d);
      return d;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [id]);

  useEffect(() => {
    cargar();
    api("/usuarios")
      .then((usuarios) => setDocentes(usuarios.filter((u) => u.rol === "docente")))
      .catch(() => setDocentes([]));
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Solicitud" sub={error} />;
  if (!datos) return <Cargando />;

  const s = datos.solicitud;
  const acciones = datos.acciones || [];
  const puedeInterno = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol) && s.solicitanteId !== usuario.usuarioId;
  const nombreDocente = (did) => {
    const d = docentes.find((x) => x.usuarioId === did);
    return d ? d.nombre : did ? "Docente asignado" : "—";
  };

  const comentar = async (e) => {
    e.preventDefault();
    const texto = e.target.elements["com-texto"].value.trim();
    if (!texto) return;
    try {
      await api("/solicitudes/" + id + "/comentarios", {
        metodo: "POST",
        cuerpo: { texto, interno: e.target.elements["com-interno"] ? e.target.elements["com-interno"].checked : false },
      });
      cargar();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const descargarAdjunto = async (key) => {
    try {
      window.open(await urlDescarga(key), "_blank");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const ejecutarAccion = async (accion) => {
    try {
      if (accion === "enviar") {
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud enviada");
        cargar();
      } else if (accion === "responder_observacion") {
        const respuesta = await promptTexto("Responder observación", "Explica los ajustes realizados");
        if (respuesta === null) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario: respuesta, titulo: s.titulo } });
        toast("Observación respondida");
        cargar();
      } else if (accion === "aprobar") {
        const comentario = await promptTexto("Aprobar", "Comentario (opcional)");
        if (comentario === null) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario } });
        toast("Paso aprobado");
        cargar();
      } else if (accion === "aprobar_condiciones") {
        const condiciones = await promptTexto("Aprobar con condiciones", "Condiciones obligatorias");
        if (condiciones === null || !condiciones.trim()) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, condiciones } });
        toast("Aprobada con condiciones");
        cargar();
      } else if (accion === "observar") {
        const motivo = await promptTexto("Observar solicitud", "Motivo de la observación (visible para el solicitante)");
        if (motivo === null || !motivo.trim()) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario: motivo } });
        toast("Solicitud observada");
        cargar();
      } else if (accion === "rechazar") {
        const motivo = await promptTexto("Rechazar solicitud", "Motivo del rechazo (obligatorio)");
        if (motivo === null || !motivo.trim()) return;
        const seguro = await confirmar("¿Seguro que deseas rechazar la solicitud?");
        if (!seguro) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, comentario: motivo } });
        toast("Solicitud rechazada");
        cargar();
      } else if (accion === "delegar") {
        const usuarios = (await api("/usuarios")).filter((u) => u.rol === usuario.rol && u.usuarioId !== usuario.usuarioId);
        if (usuarios.length === 0) {
          toast("No hay otros usuarios de tu rol para delegar", "error");
          return;
        }
        abrirModal(
          "Delegar revisión",
          <DelegarForm usuarios={usuarios} alDelegar={async (usuarioId) => {
            try {
              await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion: "delegar", usuarioId } });
              cerrarModal();
              toast("Revisión delegada");
              cargar();
            } catch (e) {
              toast(e.message, "error");
            }
          }} />,
          null
        );
      } else if (accion === "ejecutar") {
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud en ejecución, se creó el proyecto");
        cargar();
      } else if (accion === "finalizar") {
        const informe = await promptTexto("Finalizar actividad", "Informe breve (quedará en el legado del proyecto)");
        if (informe === null) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion, informe } });
        toast("Solicitud finalizada");
        cargar();
      } else if (accion === "archivar") {
        const seguro = await confirmar("¿Archivar esta solicitud?");
        if (!seguro) return;
        await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo: { accion } });
        toast("Solicitud archivada");
        cargar();
      }
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const pasoActual = (datos.pasos || []).find((p) => p.estado === "EN_REVISION") || {};

  return (
    <>
      <EncabezadoVista
        titulo={s.titulo}
        sub={(s.tipoNombre || "") + " · " + (s.solicitanteNombre || "") + (s.fecha ? " · " + fmtFecha(s.fecha) : "")}
        acciones={<Badge estado={s.estado} />}
      />
      <div className="rejilla-detalle">
        <Tarjeta className="col-span-2">
          <div className="tarjeta-encabezado">
            <h3>Línea de tiempo</h3>
            <span className="nota">
              {s.estado === "EN_REVISION" && s.revisorActualRol
                ? "Con " +
                  nombreRol(s.revisorActualRol) +
                  (s.revisorActualNombre ? " (" + s.revisorActualNombre + ")" : "") +
                  (pasoActual.plazoVenceEn ? " · vence " + fmtFecha(pasoActual.plazoVenceEn) : "")
                : ""}
            </span>
          </div>
          <div className="timeline">
            {s.enviadoEn && (
              <div className="paso-tl">
                <span className="dot ok"></span>
                <div>
                  <strong>Enviada</strong>
                  <p>{fmtFechaHora(s.enviadoEn)}</p>
                </div>
              </div>
            )}
            {datos.pasos.map((p, i) => (
              <PasoTl p={p} key={i} />
            ))}
            {["APROBADA", "APROBADA_CONDICIONES", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA"].includes(s.estado) && (
              <div className="paso-tl">
                <span className="dot ok">OK</span>
                <div>
                  <strong>{nombreEstado(s.estado)}</strong>
                  <p>Decisión definitiva registrada</p>
                </div>
              </div>
            )}
            {(datos.autorizaciones || []).length > 0 && (
              <div className="paso-tl">
                <span className="dot">F</span>
                <div>
                  <strong>Autorización de padres</strong>
                  {datos.autorizaciones.map((a, i) => (
                    <p key={i}>
                      {a.apoderadoNombre || "Apoderado"} · {nombreEstado(a.estado)}
                      {a.firma ? " · firmado por " + a.firma : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="tarjeta-encabezado">
            <h3>Detalle</h3>
          </div>
          <dl className="datos-ficha">
            <div><dt>Objetivo</dt><dd>{s.objetivo || "—"}</dd></div>
            <div><dt>Descripción</dt><dd>{s.descripcion || "—"}</dd></div>
            <div>
              <dt>Fecha</dt>
              <dd>{s.fecha ? fmtFecha(s.fecha) + (s.horaInicio ? " " + s.horaInicio + "–" + s.horaFin : "") : "—"}</dd>
            </div>
            <div><dt>Lugar</dt><dd>{s.lugar || "—"}</dd></div>
            <div><dt>Recursos</dt><dd>{s.recursos || "—"}</dd></div>
            <div><dt>Presupuesto</dt><dd>{s.presupuesto || "—"}</dd></div>
            <div><dt>Riesgos</dt><dd>{s.riesgos || "—"}</dd></div>
            <div><dt>Docente asesor</dt><dd>{nombreDocente(s.docenteAsesorId)}</dd></div>
            <div><dt>Participantes</dt><dd>{(s.participantes || []).map((p) => p.nombre || p).join(", ") || "—"}</dd></div>
          </dl>
          {(s.checklist || []).length > 0 && (
            <>
              <div className="tarjeta-encabezado"><h3>Checklist</h3></div>
              <ul className="checklist">
                {s.checklist.map((c, i) => (
                  <li key={i} className={c.hecho ? "ok" : ""}>{(c.hecho ? "[X] " : "[ ] ") + c.texto}</li>
                ))}
              </ul>
            </>
          )}
          {(s.adjuntos || []).length > 0 && (
            <>
              <div className="tarjeta-encabezado"><h3>Adjuntos</h3></div>
              {s.adjuntos.map((a, i) => (
                <button className="btn chico" key={i} onClick={() => descargarAdjunto(a.key)}>
                  Descargar {a.nombre}
                </button>
              ))}
            </>
          )}
          {s.condiciones && <p className="nota alerta-texto">Condiciones: {s.condiciones}</p>}
          {s.motivoRechazo && <p className="nota alerta-texto">Motivo del rechazo: {s.motivoRechazo}</p>}
          {s.informeFinal && <p className="nota">Informe final: {s.informeFinal}</p>}
          {datos.proyecto && (
            <Link className="btn" to={"/proyectos/" + datos.proyecto.proyectoId}>Ver proyecto vinculado</Link>
          )}
          <Link className="btn" to={"/mensajes?hilo=" + encodeURIComponent("SOL#" + id)}>Consultas sobre esta solicitud</Link>
        </Tarjeta>

        <Tarjeta className="col-span-2">
          <div className="tarjeta-encabezado">
            <h3>Comentarios</h3>
          </div>
          {datos.comentarios.length === 0 ? (
            <Vacio mensaje="Sin comentarios aún" />
          ) : (
            datos.comentarios.map((c, i) => (
              <div className={"comentario" + (c.interno ? " interno" : "")} key={i}>
                <div className="comentario-cab">
                  <strong>{c.autorNombre}</strong>
                  {c.interno && <span className="badge b-interno">Interno</span>}
                  <time>{fmtFechaHora(c.creadoEn__id)}</time>
                </div>
                <p>{c.texto}</p>
              </div>
            ))
          )}
          <form onSubmit={comentar}>
            <label className="campo">
              <span>Nuevo comentario</span>
              <textarea id="com-texto" name="com-texto" rows="2" required />
            </label>
            {puedeInterno && (
              <label className="check">
                <input type="checkbox" id="com-interno" name="com-interno" /> Interno (no visible para el solicitante)
              </label>
            )}
            <button className="btn primario">Comentar</button>
          </form>
        </Tarjeta>
      </div>
      {acciones.length > 0 && (
        <div className="acciones-fijas tarjeta">
          {acciones.map((a) => (
            <button className={"btn acc-" + a} key={a} onClick={() => ejecutarAccion(a)}>
              {TEXTOS_ACCION[a] || a}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PasoTl({ p }) {
  const clase = { EN_REVISION: "actual", APROBADO: "ok", OBSERVADO: "alerta", RECHAZADO: "mal" }[p.estado] || "";
  const icono = { EN_REVISION: "·", APROBADO: "OK", OBSERVADO: "!", RECHAZADO: "X" }[p.estado] || "·";
  return (
    <div className={"paso-tl " + clase}>
      <span className="dot">{icono}</span>
      <div>
        <strong>{nombreRol(p.rol)}{p.revisorNombre ? " · " + p.revisorNombre : ""}</strong>
        <p>
          {nombreEstado(p.estado)}
          {p.iniciadoEn ? " · desde " + fmtFechaHora(p.iniciadoEn) : ""}
          {p.plazoVenceEn && p.estado === "EN_REVISION" ? " · vence " + fmtFecha(p.plazoVenceEn) : ""}
          {p.escalado ? " · escalado por vencimiento" : ""}
        </p>
        {p.comentario && <p className="nota">{p.comentario}</p>}
        {p.condiciones && <p className="nota">Condiciones: {p.condiciones}</p>}
      </div>
    </div>
  );
}

function DelegarForm({ usuarios, alDelegar }) {
  const [usuarioId, setUsuarioId] = useState(usuarios[0].usuarioId);
  return (
    <label className="campo">
      <span>Delegar a</span>
      <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
        {usuarios.map((u) => (
          <option key={u.usuarioId} value={u.usuarioId}>{u.nombre}</option>
        ))}
      </select>
      <button className="btn primario" onClick={() => alDelegar(usuarioId)} style={{ marginTop: "0.6rem" }}>
        Delegar
      </button>
    </label>
  );
}
