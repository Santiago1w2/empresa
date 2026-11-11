import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, subirArchivo, urlDescarga } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora, nombreEstado } from "../util";
import { Badge, Cargando, EncabezadoVista, Tarjeta, Vacio } from "../componentes/basicos";

export default function ProyectoDetalle() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { toast, abrirModal, cerrarModal } = useUi();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/proyectos/" + id));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Proyecto" sub={error} />;
  if (!datos) return <Cargando />;

  const p = datos.proyecto;
  const puedeEditar = datos.puedeEditar;
  const esMiembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
  const puedeUnirse = usuario.rol === "estudiante" && p.abiertoUnirse && p.estado === "ACTIVA" && !esMiembro;
  const equipo = (p.equipo || []).map((m) => ({ usuarioId: m.usuarioId, nombre: m.nombre }));
  const hitos = p.hitos || [];
  const cumplidos = hitos.filter((h) => h.cumplido).length;
  const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;

  const cambiarEstado = async (estado) => {
    try {
      await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { estado } });
      toast("Estado actualizado");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const unirme = async () => {
    try {
      await api("/proyectos/" + id + "/unirse", { metodo: "POST", cuerpo: {} });
      toast("¡Te uniste al proyecto!");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const nuevaTarea = () =>
    abrirModal(
      "Nueva tarea",
      <FormTarea
        equipo={equipo}
        alAceptar={async ({ titulo, descripcion, responsableId, vence }) => {
          if (!titulo) {
            toast("El título es obligatorio", "error");
            return;
          }
          try {
            await api("/proyectos/" + id + "/tareas", {
              metodo: "POST",
              cuerpo: { titulo, descripcion, responsableId, vence },
            });
            cerrarYRecargar("Tarea creada");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />,
      null
    );

  const moverTarea = async (tareaId, estado) => {
    try {
      await api("/proyectos/" + id + "/tareas/" + tareaId, { metodo: "PUT", cuerpo: { estado } });
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const nuevoHito = () =>
    abrirModal(
      "Nuevo hito",
      <FormHito
        alAceptar={async ({ titulo, fecha }) => {
          if (!titulo) {
            toast("El título es obligatorio", "error");
            return;
          }
          const nuevos = [...hitos, { titulo, fecha, cumplido: false }];
          try {
            await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos: nuevos } });
            cerrarYRecargar("Hito agregado");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />,
      null
    );

  const alternarHito = async (i, cumplido) => {
    const nuevos = hitos.slice();
    nuevos[i] = { ...nuevos[i], cumplido };
    try {
      await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos: nuevos } });
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const registrarAvance = () =>
    abrirModal(
      "Registrar avance",
      <FormBitacora
        alAceptar={async ({ texto, evidencias }) => {
          if (!texto) {
            toast("El texto es obligatorio", "error");
            return;
          }
          try {
            await api("/proyectos/" + id + "/bitacora", { metodo: "POST", cuerpo: { texto, evidencias } });
            cerrarYRecargar("Avance registrado");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />,
      null
    );

  const editarLegado = () =>
    abrirModal(
      "Editar legado",
      <FormLegado
        legado={p.legado || {}}
        alAceptar={async ({ aprendizajes, contactos, documentos }) => {
          try {
            await api("/proyectos/" + id + "/legado", {
              metodo: "PUT",
              cuerpo: { aprendizajes, contactos, documentos },
            });
            cerrarYRecargar("Legado actualizado");
          } catch (e) {
            toast(e.message, "error");
          }
        }}
      />,
      null
    );

  const cerrarYRecargar = (mensaje) => {
    cerrarModal();
    toast(mensaje);
    cargar();
  };

  const descargar = async (key) => {
    try {
      window.open(await urlDescarga(key), "_blank");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo={p.nombre}
        sub={p.categoria + " · Responsable: " + (p.responsableNombre || "—") + (p.solicitudId ? " · " : "")}
        acciones={
          puedeEditar ? (
            <select className="selector-estado" value={p.estado} onChange={(e) => cambiarEstado(e.target.value)}>
              {["ACTIVA", "EN_PAUSA", "SIN_RESPONSABLE", "FINALIZADA"].map((e) => (
                <option key={e} value={e}>{nombreEstado(e)}</option>
              ))}
            </select>
          ) : (
            <Badge estado={p.estado} />
          )
        }
      />
      {p.solicitudId && (
        <p className="nota" style={{ marginTop: "-0.8rem" }}>
          <Link to={"/solicitudes/" + p.solicitudId}>solicitud de origen</Link>
        </p>
      )}
      <div className="rejilla-detalle">
        <Tarjeta className="col-span-2">
          <div className="tarjeta-encabezado">
            <h3>Tablero de tareas</h3>
            {puedeEditar && (
              <button className="btn chico" onClick={nuevaTarea}>Nueva tarea</button>
            )}
          </div>
          <div className="kanban">
            {["POR_HACER", "EN_CURSO", "HECHO"].map((col) => {
              const tareas = datos.tareas.filter((t) => t.estado === col);
              return (
                <div className="kanban-col" key={col}>
                  <h4>{nombreEstado(col)} ({tareas.length})</h4>
                  {tareas.map((t) => (
                    <div className={"kanban-tarjeta" + (t.estado === "HECHO" ? " hecha" : "")} key={t.tareaId}>
                      <div>
                        <strong>{t.titulo}</strong>
                        {t.descripcion && <p>{t.descripcion}</p>}
                        <p className="nota">
                          {t.responsableNombre || "Sin responsable"}
                          {t.vence ? " · vence " + fmtFecha(t.vence) : ""}
                        </p>
                      </div>
                      {puedeEditar && (
                        <div className="tarea-mover">
                          {t.estado !== "POR_HACER" && (
                            <button
                              className="btn-icono"
                              title="Mover a la izquierda"
                              onClick={() => moverTarea(t.tareaId, t.estado === "HECHO" ? "EN_CURSO" : "POR_HACER")}
                            >
                              &larr;
                            </button>
                          )}
                          {t.estado !== "HECHO" && (
                            <button
                              className="btn-icono"
                              title="Mover a la derecha"
                              onClick={() => moverTarea(t.tareaId, t.estado === "POR_HACER" ? "EN_CURSO" : "HECHO")}
                            >
                              &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Tarjeta>

        <Tarjeta>
          <div className="tarjeta-encabezado">
            <h3>Hitos</h3>
            {puedeEditar && <button className="btn chico" onClick={nuevoHito}>Agregar</button>}
          </div>
          <div className="barra-pista">
            <div className="barra-relleno" style={{ width: avance + "%" }}></div>
          </div>
          <p className="nota">{avance}% · {cumplidos} de {hitos.length} hitos cumplidos</p>
          <ul className="hitos">
            {hitos.length === 0 ? (
              <li className="nota">Sin hitos definidos</li>
            ) : (
              hitos.map((h, i) => (
                <li className={"hito" + (h.cumplido ? " ok" : "")} key={i}>
                  {puedeEditar ? (
                    <input
                      type="checkbox"
                      checked={!!h.cumplido}
                      title="Marcar hito"
                      onChange={(e) => alternarHito(i, e.target.checked)}
                    />
                  ) : (
                    <span className={"dot" + (h.cumplido ? " ok" : "")}>&middot;</span>
                  )}
                  <div>
                    <strong>{h.titulo || h.texto || "Hito"}</strong>
                    {h.fecha && <span> · {fmtFecha(h.fecha)}</span>}
                  </div>
                </li>
              ))
            )}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <div className="tarjeta-encabezado">
            <h3>Equipo</h3>
            {puedeUnirse && (
              <button className="btn chico primario" onClick={unirme}>Unirme</button>
            )}
          </div>
          {(p.equipo || []).length === 0 ? (
            <Vacio mensaje="Sin miembros aún" />
          ) : (
            <ul className="equipo">
              {p.equipo.map((m, i) => (
                <li key={i}>
                  <strong>{m.nombre || m.usuarioId}</strong>
                  <span>{m.cargo === "lider" ? "Líder" : "Miembro"}</span>
                </li>
              ))}
            </ul>
          )}
          {p.docenteAsesorId && <p className="nota">Docente asesor vinculado</p>}
          <Link className="btn" to={"/mensajes?hilo=" + encodeURIComponent("PROY#" + id)}>Consultas del proyecto</Link>
        </Tarjeta>

        <Tarjeta className="col-span-2">
          <div className="tarjeta-encabezado">
            <h3>Bitácora</h3>
            {puedeEditar && <button className="btn chico" onClick={registrarAvance}>Registrar avance</button>}
          </div>
          {datos.bitacora.length === 0 ? (
            <Vacio mensaje="Aún no hay registros en la bitácora" />
          ) : (
            datos.bitacora.map((b, i) => (
              <div className="bitacora-entrada" key={i}>
                <div className="comentario-cab">
                  <strong>{b.autorNombre}</strong>
                  <time>{fmtFechaHora(b.creadoEn__id)}</time>
                </div>
                <p>{b.texto}</p>
                {(b.evidencias || []).length > 0 && (
                  <div className="etiquetas">
                    {b.evidencias.map((ev, j) => (
                      <button className="etiqueta" key={j} onClick={() => descargar(ev.key)}>{ev.nombre}</button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </Tarjeta>

        <Tarjeta className="col-span-2">
          <div className="tarjeta-encabezado">
            <h3>Legado</h3>
            {puedeEditar && <button className="btn chico" onClick={editarLegado}>Editar legado</button>}
          </div>
          <Legado legado={p.legado || {}} onDescargar={descargar} />
        </Tarjeta>
      </div>
    </>
  );
}

function Legado({ legado, onDescargar }) {
  const documentos = legado.documentos || [];
  const contactos = legado.contactos || [];
  return (
    <>
      <p className="nota">Lo que queda para las próximas generaciones del proyecto.</p>
      <h4>Aprendizajes</h4>
      <p>{legado.aprendizajes || "Sin aprendizajes registrados"}</p>
      <h4>Documentos de legado</h4>
      {documentos.length === 0 ? (
        <p className="nota">Ninguno</p>
      ) : (
        documentos.map((d, i) => (
          <button className="btn chico" key={i} onClick={() => onDescargar(d.key)}>Descargar {d.nombre}</button>
        ))
      )}
      <h4>Contactos útiles</h4>
      {contactos.length === 0 ? (
        <p className="nota">Ninguno</p>
      ) : (
        <ul>
          {contactos.map((c, i) => (
            <li key={i}>{typeof c === "string" ? c : c.nombre + (c.detalle ? " · " + c.detalle : "")}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function FormTarea({ equipo, alAceptar }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [responsableId, setResponsable] = useState("");
  const [vence, setVence] = useState("");
  return (
    <>
      <label className="campo"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      <label className="campo"><span>Descripción</span><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></label>
      <label className="campo">
        <span>Responsable</span>
        <select value={responsableId} onChange={(e) => setResponsable(e.target.value)}>
          <option value="">Sin asignar</option>
          {equipo.map((m) => (
            <option key={m.usuarioId} value={m.usuarioId}>{m.nombre}</option>
          ))}
        </select>
      </label>
      <label className="campo"><span>Vence</span><input type="date" value={vence} onChange={(e) => setVence(e.target.value)} /></label>
      <button className="btn primario" onClick={() => alAceptar({ titulo: titulo.trim(), descripcion, responsableId, vence })}>
        Guardar
      </button>
    </>
  );
}

function FormHito({ alAceptar }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  return (
    <>
      <label className="campo"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      <label className="campo"><span>Fecha</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      <button className="btn primario" onClick={() => alAceptar({ titulo: titulo.trim(), fecha })}>Guardar</button>
    </>
  );
}

function FormBitacora({ alAceptar }) {
  const { toast } = useUi();
  const [texto, setTexto] = useState("");
  const [evidencias, setEvidencias] = useState([]);
  const subir = async (lista) => {
    for (const archivo of Array.from(lista || [])) {
      try {
        const key = await subirArchivo(archivo);
        setEvidencias((e) => [...e, { nombre: archivo.name, key }]);
      } catch (e) {
        toast(e.message, "error");
      }
    }
  };
  return (
    <>
      <label className="campo"><span>¿Qué avanzó?</span><textarea rows="3" value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
      <label className="campo"><span>Evidencias (fotos o archivos)</span><input type="file" multiple onChange={(e) => subir(e.target.files)} /></label>
      <div className="etiquetas">
        {evidencias.map((ev, i) => (
          <span className="etiqueta" key={i}>{ev.nombre}</span>
        ))}
      </div>
      <button className="btn primario" onClick={() => alAceptar({ texto: texto.trim(), evidencias })}>Guardar</button>
    </>
  );
}

function FormLegado({ legado, alAceptar }) {
  const [aprendizajes, setAprendizajes] = useState(legado.aprendizajes || "");
  const [contactos, setContactos] = useState(
    (legado.contactos || []).map((c) => (typeof c === "string" ? c : c.nombre + (c.detalle ? " · " + c.detalle : ""))).join("\n")
  );
  const [documentos, setDocumentos] = useState((legado.documentos || []).slice());
  const { toast } = useUi();
  const subir = async (lista) => {
    for (const archivo of Array.from(lista || [])) {
      try {
        const key = await subirArchivo(archivo);
        setDocumentos((d) => [...d, { nombre: archivo.name, key }]);
      } catch (e) {
        toast(e.message, "error");
      }
    }
  };
  const aceptar = () => {
    const lista = contactos
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const partes = l.split("·");
        return { nombre: partes[0].trim(), detalle: (partes[1] || "").trim() };
      });
    alAceptar({ aprendizajes, contactos: lista, documentos });
  };
  return (
    <>
      <label className="campo"><span>Aprendizajes</span><textarea rows="4" value={aprendizajes} onChange={(e) => setAprendizajes(e.target.value)} /></label>
      <label className="campo"><span>Contactos útiles (uno por línea: nombre · detalle)</span><textarea rows="3" value={contactos} onChange={(e) => setContactos(e.target.value)} /></label>
      <label className="campo"><span>Documentos de legado</span><input type="file" multiple onChange={(e) => subir(e.target.files)} /></label>
      <div className="etiquetas">
        {documentos.map((d, i) => (
          <span className="etiqueta" key={i}>{d.nombre}</span>
        ))}
      </div>
      <button className="btn primario" onClick={aceptar}>Guardar</button>
    </>
  );
}
