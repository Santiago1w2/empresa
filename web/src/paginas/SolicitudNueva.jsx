import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, subirArchivo } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, nombreRol } from "../util";
import { Cargando, EncabezadoVista, Tarjeta } from "../componentes/basicos";

const PASOS = ["Tipo", "Datos", "Fecha y lugar", "Equipo", "Adjuntos", "Revisión"];

const VACIO = {
  tipo: "",
  titulo: "", objetivo: "", descripcion: "",
  fecha: "", horaInicio: "", horaFin: "", lugar: "", ambienteId: "",
  participantes: [], recursos: "", presupuesto: "", riesgos: "",
  docenteAsesorId: "", adjuntos: [], checklist: [], tipoVisto: "",
};

export default function SolicitudNueva() {
  const { catalogo } = useSesion();
  const { toast } = useUi();
  const navegar = useNavigate();
  const [cat, setCat] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estado, setEstado] = useState(VACIO);
  const [paso, setPaso] = useState(0);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCat(catalogo || (await api("/catalogos")));
        const usuarios = await api("/usuarios");
        setDocentes(usuarios.filter((u) => u.rol === "docente"));
        setEstudiantes(usuarios.filter((u) => u.rol === "estudiante"));
      } catch (e) {
        toast(e.message, "error");
      }
    };
    cargar();
  }, [catalogo]);

  if (!cat) return <Cargando />;

  const set = (campo, valor) => setEstado((e) => ({ ...e, [campo]: valor }));

  const cambiarTipo = (tipo) => {
    const def = (cat.tiposSolicitud || {})[tipo] || {};
    setEstado((e) => ({
      ...e,
      tipo,
      checklist: tipo && tipo !== e.tipoVisto ? (def.checklist || []).map((c) => ({ texto: c, hecho: false })) : e.checklist,
      tipoVisto: tipo || e.tipoVisto,
    }));
  };

  const agregarParticipante = (usuarioId) => {
    if (!usuarioId) return;
    if (!estado.participantes.some((p) => p.usuarioId === usuarioId)) {
      const u = estudiantes.find((x) => x.usuarioId === usuarioId);
      setEstado((e) => ({ ...e, participantes: [...e.participantes, { usuarioId, nombre: u ? u.nombre : usuarioId }] }));
    }
  };

  const quitarParticipante = (usuarioId) =>
    setEstado((e) => ({ ...e, participantes: e.participantes.filter((p) => p.usuarioId !== usuarioId) }));

  const subirArchivos = async (listaArchivos) => {
    setSubiendo(true);
    for (const archivo of Array.from(listaArchivos || [])) {
      try {
        toast("Subiendo " + archivo.name + "…");
        const key = await subirArchivo(archivo);
        setEstado((e) => ({ ...e, adjuntos: [...e.adjuntos, { nombre: archivo.name, key }] }));
      } catch (err) {
        toast(err.message, "error");
      }
    }
    setSubiendo(false);
  };

  const crear = async (enviarAhora) => {
    if (!estado.tipo) { toast("Selecciona el tipo de solicitud", "error"); return; }
    if (!estado.titulo || !estado.titulo.trim()) { toast("El título es obligatorio", "error"); return; }
    try {
      const solicitud = await api("/solicitudes", { metodo: "POST", cuerpo: estado });
      if (enviarAhora) {
        await api("/solicitudes/" + solicitud.solicitudId + "/accion", { metodo: "POST", cuerpo: { accion: "enviar" } });
        toast("Solicitud enviada a revisión");
      } else {
        toast("Borrador guardado");
      }
      navegar("/solicitudes/" + solicitud.solicitudId);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const def = (cat.tiposSolicitud || {})[estado.tipo] || {};
  const ambientes = cat.ambientes || [];
  const sla = cat.slaPorRol || {};

  return (
    <>
      <EncabezadoVista titulo="Nueva solicitud" acciones={<Link className="btn" to="/solicitudes">Cancelar</Link>} />
      <div className="tarjeta asistente">
        <div className="asistente-pasos">
          {PASOS.map((p, i) => (
            <span key={p} className={"paso-indicador" + (i === paso ? " activo" : "")}>
              {i + 1}. {p}
            </span>
          ))}
        </div>

        {paso === 0 && (
          <>
            <label className="campo">
              <span>Tipo de solicitud</span>
              <select value={estado.tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                <option value="">Selecciona un tipo…</option>
                {Object.entries(cat.tiposSolicitud || {}).map(([k, v]) => (
                  <option key={k} value={k}>{v.nombre}</option>
                ))}
              </select>
            </label>
            {estado.tipo && (
              <div className="ruta-preview">
                <h4>Ruta de aprobación</h4>
                <p>
                  {def.ruta.map((r) => nombreRol(r) + " (" + (sla[r] || 2) + " días hábiles)").join(" → ")}
                </p>
                {def.requierePadres && <p className="alerta-texto">Requiere autorización de los padres al aprobarse</p>}
                <h4>Checklist de requisitos</h4>
                <ul>
                  {(def.checklist || []).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {paso === 1 && (
          <>
            <label className="campo">
              <span>Título</span>
              <input value={estado.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="MUN Santa Anita 2026" />
            </label>
            <label className="campo">
              <span>Objetivo</span>
              <textarea rows="2" value={estado.objetivo} onChange={(e) => set("objetivo", e.target.value)} />
            </label>
            <label className="campo">
              <span>Descripción</span>
              <textarea rows="3" value={estado.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
            </label>
            <label className="campo">
              <span>Docente asesor</span>
              <select value={estado.docenteAsesorId} onChange={(e) => set("docenteAsesorId", e.target.value)}>
                <option value="">Sin asesor asignado</option>
                {docentes.map((d) => (
                  <option key={d.usuarioId} value={d.usuarioId}>{d.nombre}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Checklist</span>
              <div>
                {estado.checklist.map((c, i) => (
                  <label className="check" key={i}>
                    <input
                      type="checkbox"
                      checked={c.hecho}
                      onChange={(e) => {
                        const nuevo = estado.checklist.slice();
                        nuevo[i] = { ...c, hecho: e.target.checked };
                        set("checklist", nuevo);
                      }}
                    />{" "}
                    {c.texto}
                  </label>
                ))}
              </div>
            </label>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="fila">
              <label className="campo">
                <span>Fecha</span>
                <input type="date" value={estado.fecha} onChange={(e) => set("fecha", e.target.value)} />
              </label>
              <label className="campo">
                <span>De</span>
                <input type="time" value={estado.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
              </label>
              <label className="campo">
                <span>A</span>
                <input type="time" value={estado.horaFin} onChange={(e) => set("horaFin", e.target.value)} />
              </label>
            </div>
            <div className="fila">
              <label className="campo">
                <span>Lugar</span>
                <input value={estado.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder="Auditorio" />
              </label>
              <label className="campo">
                <span>Ambiente</span>
                <select value={estado.ambienteId} onChange={(e) => set("ambienteId", e.target.value)}>
                  <option value="">Ninguno</option>
                  {ambientes.map((a) => (
                    <option key={a.ambienteId} value={a.ambienteId}>{a.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <label className="campo">
              <span>Participantes del equipo</span>
              <select value="" onChange={(e) => agregarParticipante(e.target.value)}>
                <option value="">Agregar estudiante…</option>
                {estudiantes.map((e) => (
                  <option key={e.usuarioId} value={e.usuarioId}>
                    {e.nombre}
                    {e.grado ? " (" + e.grado + (e.seccion || "") + ")" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="etiquetas">
              {estado.participantes.map((p) => (
                <span className="etiqueta" key={p.usuarioId}>
                  {p.nombre} <button onClick={() => quitarParticipante(p.usuarioId)}>&times;</button>
                </span>
              ))}
            </div>
            <label className="campo">
              <span>Recursos</span>
              <input value={estado.recursos} onChange={(e) => set("recursos", e.target.value)} placeholder="Micrófonos, aulas…" />
            </label>
            <div className="fila">
              <label className="campo">
                <span>Presupuesto</span>
                <input value={estado.presupuesto} onChange={(e) => set("presupuesto", e.target.value)} placeholder="S/ 300" />
              </label>
              <label className="campo">
                <span>Riesgos</span>
                <input value={estado.riesgos} onChange={(e) => set("riesgos", e.target.value)} />
              </label>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <label className="campo">
              <span>Adjuntos</span>
              <input type="file" multiple disabled={subiendo} onChange={(e) => subirArchivos(e.target.files)} />
            </label>
            <div className="etiquetas">
              {estado.adjuntos.map((a, i) => (
                <span className="etiqueta" key={i}>{a.nombre}</span>
              ))}
            </div>
            <p className="nota">Los archivos se suben a un almacenamiento privado y solo son accesibles con enlaces firmados.</p>
          </>
        )}

        {paso === 5 && (
          <div className="ruta-preview">
            <h4>Resumen</h4>
            <p>
              <strong>{estado.titulo || "(sin título)"}</strong>
              <br />
              {estado.objetivo || ""}
            </p>
            <p>
              {estado.fecha ? fmtFecha(estado.fecha) + (estado.horaInicio ? " " + estado.horaInicio + "–" + estado.horaFin : "") : "Sin fecha"}
              {estado.lugar ? " · " + estado.lugar : ""}
            </p>
            <p>Participantes: {estado.participantes.length || 0} · Adjuntos: {estado.adjuntos.length}</p>
            <p>Ruta: {(def.ruta || []).map((r) => nombreRol(r)).join(" → ")}{def.requierePadres ? " → Padres" : ""}</p>
            <div className="asistente-nav">
              <span></span>
              <span>
                <button className="btn" onClick={() => crear(false)}>Guardar borrador</button>{" "}
                <button className="btn primario" onClick={() => crear(true)}>Enviar a revisión</button>
              </span>
            </div>
          </div>
        )}

        {paso < PASOS.length - 1 && (
          <div className="asistente-nav">
            {paso > 0 ? (
              <button className="btn" onClick={() => setPaso(paso - 1)}>Anterior</button>
            ) : (
              <span></span>
            )}
            <button className="btn primario" onClick={() => setPaso(paso + 1)}>Siguiente</button>
          </div>
        )}
      </div>
    </>
  );
}
