import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, subirArchivo, urlDescarga } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFechaHora, nombreTipoDoc } from "../util";
import { Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

const TIPOS = ["", "PLANTILLA", "INFORME", "EVIDENCIA", "OTRO"];

export default function Documentos() {
  const { usuario } = useSesion();
  const { toast, abrirModal, cerrarModal, confirmar } = useUi();
  const navegar = useNavigate();
  const [items, setItems] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/documentos"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Documentos" sub={error} />;
  if (!items) return <Cargando />;

  const descargar = async (d) => {
    try {
      if (d.archivoKey) {
        window.open(await urlDescarga(d.archivoKey), "_blank");
      } else if (d.contenido) {
        const blob = new Blob([d.contenido], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (d.nombre || "documento") + ".txt";
        a.click();
      } else {
        toast("Este documento no tiene archivo", "error");
      }
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const borrar = async (id) => {
    const seguro = await confirmar("¿Eliminar este documento?");
    if (!seguro) return;
    try {
      await api("/documentos/" + id, { metodo: "DELETE" });
      toast("Documento eliminado");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const subir = () =>
    abrirModal("Subir documento", <FormDocumento rol={usuario.rol} alGuardar={guardar} />, null);

  const guardar = async (cuerpo) => {
    try {
      if (cuerpo.archivo) {
        toast("Subiendo " + cuerpo.archivo.name + "…");
        cuerpo.archivoKey = await subirArchivo(cuerpo.archivo);
      }
      const { archivo, ...resto } = cuerpo;
      await api("/documentos", { metodo: "POST", cuerpo: resto });
      cerrarModal();
      toast("Documento guardado");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const docs = filtro ? items.filter((d) => d.tipo === filtro) : items;

  return (
    <>
      <EncabezadoVista
        titulo="Documentos"
        acciones={<button className="btn primario" onClick={subir}>Subir documento</button>}
      />
      <div className="tabs">
        {TIPOS.map((t) => (
          <button key={t} className={"tab" + (filtro === t ? " activa" : "")} onClick={() => setFiltro(t)}>
            {t ? nombreTipoDoc(t) : "Todos"}
          </button>
        ))}
      </div>
      {docs.length === 0 ? (
        <Vacio mensaje="No hay documentos en esta sección" />
      ) : (
        <div className="tarjeta lista">
          {docs.map((d) => (
            <div className="fila-lista doc-fila" key={d.documentoId}>
              <span className="doc-icono">{d.tipo === "PLANTILLA" ? "P" : d.tipo === "EVIDENCIA" ? "E" : "D"}</span>
              <div className="fila-principal">
                <strong>{d.nombre}</strong>
                <p>
                  {nombreTipoDoc(d.tipo)}
                  {d.categoria ? " · " + d.categoria : ""} · {d.creadoPorNombre || ""} · {fmtFechaHora(d.creadoEn)}
                </p>
                {d.descripcion && <p className="nota">{d.descripcion}</p>}
                {d.contenido && !d.archivoKey && <p className="nota">Plantilla de texto descargable</p>}
              </div>
              <div className="columna-botones">
                <button className="btn chico" onClick={() => descargar(d)}>Descargar</button>
                <button className="btn chico" onClick={() => navegar("/compartir/documento/" + d.documentoId)}>
                  Compartir QR
                </button>
                {(d.creadoPor === usuario.usuarioId || ["ti", "direccion"].includes(usuario.rol)) && (
                  <button className="btn chico peligro" onClick={() => borrar(d.documentoId)}>Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormDocumento({ rol, alGuardar }) {
  const { toast } = useUi();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("INFORME");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [contenido, setContenido] = useState("");
  const [archivo, setArchivo] = useState(null);
  const guardar = () => {
    if (!nombre.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    alGuardar({ nombre: nombre.trim(), tipo, categoria, descripcion, contenido, archivo });
  };
  return (
    <>
      <label className="campo"><span>Nombre</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <div className="fila">
        <label className="campo">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {["INFORME", "EVIDENCIA", "OTRO"].map((t) => (
              <option key={t} value={t}>{nombreTipoDoc(t)}</option>
            ))}
            {["ti", "direccion"].includes(rol) && <option value="PLANTILLA">Plantilla institucional</option>}
          </select>
        </label>
        <label className="campo"><span>Categoría</span><input value={categoria} placeholder="Formatos, informes…" onChange={(e) => setCategoria(e.target.value)} /></label>
      </div>
      <label className="campo"><span>Descripción</span><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></label>
      <label className="campo"><span>Archivo</span><input type="file" onChange={(e) => setArchivo(e.target.files[0])} /></label>
      <p className="nota">Sube el archivo o, si es una plantilla corta, puedes escribir su contenido y guardar sin archivo.</p>
      <label className="campo"><span>Contenido (para plantillas de texto)</span><textarea rows="3" value={contenido} onChange={(e) => setContenido(e.target.value)} /></label>
      <button className="btn primario" onClick={guardar}>Guardar</button>
    </>
  );
}
