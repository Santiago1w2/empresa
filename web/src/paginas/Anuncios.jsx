import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, urlDescarga } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora } from "../util";
import { Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

export default function Anuncios() {
  const { usuario, catalogo } = useSesion();
  const { toast, abrirModal, cerrarModal } = useUi();
  const navegar = useNavigate();
  const [anuncios, setAnuncios] = useState(null);
  const [cat, setCat] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setAnuncios(await api("/anuncios"));
      setCat(catalogo || (await api("/catalogos")));
    } catch (e) {
      setError(e.message);
    }
  }, [catalogo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Anuncios" sub={error} />;
  if (!anuncios || !cat) return <Cargando />;

  const puedePublicar = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol) || usuario.rol === "estudiante";
  const categorias = cat.categoriasAnuncio || [];

  let items = anuncios;
  if (filtro === "__no_leidos") items = items.filter((a) => !a.leido);
  else if (filtro) items = items.filter((a) => a.categoria === filtro);

  const abrirAnuncio = async (id) => {
    let a;
    try {
      a = await api("/anuncios/" + id);
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    const creador = a.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol);
    abrirModal(
      a.titulo,
      <CuerpoAnuncio a={a} onVoto={(op) => marcarLeido(a.anuncioId, op)} />,
      <PieAnuncio
        a={a}
        esCreador={creador}
        alLeer={marcarLeido}
        verLecturas={() => verLecturas(a.anuncioId)}
        compartir={() => {
          cerrarModal();
          navegar("/compartir/anuncio/" + a.anuncioId);
        }}
      />
    );
  };

  const marcarLeido = async (id, voto) => {
    try {
      await api("/anuncios/" + id + "/leer", { metodo: "POST", cuerpo: voto ? { voto } : {} });
      cerrarModal();
      toast(voto ? "Voto registrado" : "Anuncio marcado como leído");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const verLecturas = async (id) => {
    let datos;
    try {
      datos = await api("/anuncios/" + id + "/lecturas");
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    abrirModal(
      "Confirmación de lectura",
      <>
        <div className="kpis">
          <div className="kpi"><strong>{datos.tasa}%</strong><span>lectura</span></div>
          <div className="kpi"><strong>{datos.leidos.length}/{datos.total}</strong><span>personas al día</span></div>
        </div>
        {datos.faltan.length > 0 && (
          <>
            <h4>Falta que lean</h4>
            <p>{datos.faltan.join(", ")}</p>
          </>
        )}
        {datos.leidos.length > 0 && (
          <>
            <h4>Ya leyeron</h4>
            <ul className="lista-simple">
              {datos.leidos.map((l, i) => (
                <li key={i}>{l.nombre}{l.voto ? " · voto: " + l.voto : ""} · {fmtFechaHora(l.leidoEn)}</li>
              ))}
            </ul>
          </>
        )}
      </>,
      null
    );
  };

  const crearAnuncio = () => abrirModal("Publicar anuncio", <FormAnuncio rol={usuario.rol} cat={cat} alPublicar={publicar} />, null);

  const publicar = async (cuerpo) => {
    try {
      await api("/anuncios", { metodo: "POST", cuerpo });
      cerrarModal();
      toast("Anuncio publicado");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo="Anuncios"
        acciones={puedePublicar ? <button className="btn primario" onClick={crearAnuncio}>Publicar</button> : null}
      />
      <div className="pastillas">
        <button className={"pastilla" + (filtro === "" ? " activa" : "")} onClick={() => setFiltro("")}>Todos</button>
        <button className={"pastilla" + (filtro === "__no_leidos" ? " activa" : "")} onClick={() => setFiltro("__no_leidos")}>
          No leídos ({anuncios.filter((a) => !a.leido).length})
        </button>
        {categorias.map((c) => (
          <button key={c} className={"pastilla" + (filtro === c ? " activa" : "")} onClick={() => setFiltro(c)}>{c}</button>
        ))}
      </div>
      <div className="muro">
        {items.length === 0 ? (
          <Vacio mensaje={filtro === "__no_leidos" ? "Estás al día: todo leído" : "No hay anuncios para ti"} />
        ) : (
          items.map((a) => (
            <article
              key={a.anuncioId}
              className={"anuncio" + (a.fija ? " fija" : "") + (a.leido ? "" : " no-leido") + " p-" + (a.prioridad || "normal")}
              onClick={() => abrirAnuncio(a.anuncioId)}
            >
              <div className="anuncio-encabezado">
                <div>
                  <h3>{a.titulo}</h3>
                  <p className="nota">{a.categoria || ""} · {a.creadoPorNombre || ""} · {fmtFechaHora(a.creadoEn)}</p>
                </div>
                <div className="anuncio-tags">
                  {a.fija && <span className="prioridad-tag">Fijado</span>}
                  {a.prioridad !== "normal" && <span className={"prioridad-tag " + a.prioridad}>{a.prioridad}</span>}
                  {!a.leido && <span className="prioridad-tag nuevo">Nuevo</span>}
                </div>
              </div>
              <p>
                {(a.contenido || "").slice(0, 160)}
                {(a.contenido || "").length > 160 ? "…" : ""}
              </p>
              {a.encuesta && <p className="nota">Incluye encuesta: {a.encuesta.pregunta}</p>}
              {(a.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol)) && (
                <button
                  className="btn chico"
                  onClick={(e) => {
                    e.stopPropagation();
                    verLecturas(a.anuncioId);
                  }}
                >
                  Ver lecturas
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}

function CuerpoAnuncio({ a, onVoto }) {
  const { toast } = useUi();
  const descargar = async (key) => {
    try {
      window.open(await urlDescarga(key), "_blank");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const resultados = (a.encuesta && a.encuesta.resultados) || {};
  const totalVotos = Object.values(resultados).reduce((x, y) => x + y, 0);
  return (
    <>
      <p className="nota">
        {a.categoria || ""} · {a.creadoPorNombre || ""} · {fmtFechaHora(a.creadoEn)}
        {a.caducaEn ? " · vence " + fmtFecha(a.caducaEn) : ""}
      </p>
      <p>{a.contenido || ""}</p>
      {(a.adjuntos || []).length > 0 && (
        <div className="etiquetas">
          {a.adjuntos.map((x, i) => (
            <button className="etiqueta" key={i} onClick={() => descargar(x.key)}>{x.nombre}</button>
          ))}
        </div>
      )}
      {a.encuesta && (
        <div className="encuesta">
          <h4>{a.encuesta.pregunta}</h4>
          {(a.encuesta.opciones || []).map((op) => {
            const votos = resultados[op] || 0;
            const porcentaje = totalVotos ? Math.round((votos * 100) / totalVotos) : 0;
            return (
              <button key={op} className="encuesta-opcion" disabled={!!a.miVoto} onClick={() => onVoto && onVoto(op)}>
                <span>{op}{a.miVoto === op ? " (tu voto)" : ""}</span>
                <span className="encuesta-barra"><i style={{ width: porcentaje + "%" }}></i></span>
                <b>{votos}</b>
              </button>
            );
          })}
          <p className="nota">{totalVotos} voto(s) registrados</p>
        </div>
      )}
    </>
  );
}

function PieAnuncio({ a, esCreador, alLeer, verLecturas, compartir }) {
  return (
    <>
      {!a.leido ? (
        <button className="btn primario" onClick={() => alLeer(a.anuncioId)}>Marcar como leído</button>
      ) : (
        <span className="nota">Ya lo leíste</span>
      )}
      {esCreador && (
        <button className="btn" onClick={verLecturas}>Ver lecturas</button>
      )}
      {compartir && (
        <button className="btn" onClick={compartir}>Compartir con QR</button>
      )}
    </>
  );
}

function FormAnuncio({ rol, cat, alPublicar }) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState((cat.categoriasAnuncio || ["General"])[0] || "");
  const [prioridad, setPrioridad] = useState("normal");
  const [fija, setFija] = useState(false);
  const [caducaEn, setCaduca] = useState("");
  const [conEncuesta, setConEncuesta] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [seccion, setSeccion] = useState("");
  const [proyectos, setProyectos] = useState([]);
  const { toast } = useUi();

  useEffect(() => {
    if (rol === "estudiante") {
      api("/proyectos")
        .then((ps) => setProyectos(ps))
        .catch(() => setProyectos([]));
    }
  }, [rol]);

  const publicar = () => {
    if (!titulo.trim() || !contenido.trim()) {
      toast("Título y contenido son obligatorios", "error");
      return;
    }
    const cuerpo = { titulo: titulo.trim(), contenido: contenido.trim(), categoria, prioridad, fija, caducaEn: caducaEn || "" };
    if (rol === "estudiante") {
      if (!proyectoId) {
        toast("Selecciona el proyecto donde publicar", "error");
        return;
      }
      cuerpo.segmento = { proyectoId };
    } else {
      const segmento = {};
      if (nivel) segmento.niveles = [nivel];
      if (grado.trim()) segmento.grados = [grado.trim()];
      if (seccion.trim()) segmento.secciones = [seccion.trim()];
      cuerpo.segmento = segmento;
    }
    if (conEncuesta) {
      const listaOpciones = opciones.split(",").map((s) => s.trim()).filter(Boolean);
      if (!pregunta.trim() || listaOpciones.length < 2) {
        toast("La encuesta necesita pregunta y al menos 2 opciones", "error");
        return;
      }
      cuerpo.encuesta = { pregunta: pregunta.trim(), opciones: listaOpciones };
    }
    alPublicar(cuerpo);
  };

  const niveles = cat.niveles || ["Primaria", "Secundaria"];

  return (
    <>
      <label className="campo"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      <label className="campo"><span>Contenido</span><textarea rows="4" value={contenido} onChange={(e) => setContenido(e.target.value)} /></label>
      <div className="fila">
        <label className="campo">
          <span>Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {(cat.categoriasAnuncio || []).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Prioridad</span>
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="importante">Importante</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
      </div>
      {rol === "estudiante" ? (
        <label className="campo">
          <span>Publicar en el mural de tu proyecto</span>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">Selecciona…</option>
            {proyectos.map((p) => (
              <option key={p.proyectoId} value={p.proyectoId}>{p.nombre}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          {rol === "docente" && <p className="nota">Segmenta por tu aula (nivel, grado o sección).</p>}
          {rol !== "docente" && <p className="nota">Sin segmento el anuncio llega a todo el colegio. Puedes acotarlo:</p>}
          <label className="campo">
            <span>Nivel</span>
            <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="">Todos</option>
              {niveles.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="fila">
            <label className="campo"><span>Grado</span><input value={grado} placeholder="5°" onChange={(e) => setGrado(e.target.value)} /></label>
            <label className="campo"><span>Sección</span><input value={seccion} placeholder="A" onChange={(e) => setSeccion(e.target.value)} /></label>
          </div>
        </>
      )}
      <label className="check"><input type="checkbox" checked={fija} onChange={(e) => setFija(e.target.checked)} /> Fijar arriba del muro</label>
      <label className="campo"><span>Vence (opcional)</span><input type="date" value={caducaEn} onChange={(e) => setCaduca(e.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={conEncuesta} onChange={(e) => setConEncuesta(e.target.checked)} /> Incluir encuesta</label>
      {conEncuesta && (
        <>
          <label className="campo"><span>Pregunta</span><input value={pregunta} onChange={(e) => setPregunta(e.target.value)} /></label>
          <label className="campo"><span>Opciones (separadas por comas)</span><input value={opciones} placeholder="Sí, No, Tal vez" onChange={(e) => setOpciones(e.target.value)} /></label>
        </>
      )}
      <button className="btn primario" onClick={publicar}>Publicar</button>
    </>
  );
}
