import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFechaHora, nombreEstado, nombreRol } from "../util";
import { Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

export default function Mensajes() {
  const [params] = useSearchParams();
  const hilo = params.get("hilo");
  if (hilo) return <Hilo hilo={hilo} />;
  return <Indice />;
}

function Indice() {
  const { usuario } = useSesion();
  const [hilos, setHilos] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      if (usuario.rol === "padre") {
        setHilos([]);
        return;
      }
      try {
        const [solicitudes, proyectos] = await Promise.all([
          ["estudiante", "docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol)
            ? api("/solicitudes")
            : Promise.resolve([]),
          api("/proyectos").catch(() => []),
        ]);
        const lista = [];
        solicitudes
          .filter((s) => s.estado !== "BORRADOR")
          .slice(0, 30)
          .forEach((s) =>
            lista.push({
              hilo: "SOL#" + s.solicitudId,
              titulo: s.titulo,
              detalle: nombreEstado(s.estado) + " · " + (s.solicitanteNombre || ""),
            })
          );
        proyectos
          .filter((p) => (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId) || ["ti", "direccion"].includes(usuario.rol))
          .slice(0, 30)
          .forEach((p) =>
            lista.push({
              hilo: "PROY#" + p.proyectoId,
              titulo: p.nombre,
              detalle: nombreEstado(p.estado) + " · " + (p.responsableNombre || ""),
            })
          );
        setHilos(lista);
      } catch (e) {
        setHilos([]);
      }
    };
    cargar();
  }, [usuario]);

  if (!hilos) return <Cargando />;

  return (
    <>
      <EncabezadoVista titulo="Consultas" />
      {usuario.rol === "padre" ? (
        <Vacio mensaje="Las consultas se abren desde una solicitud o un proyecto. No tienes hilos activos." />
      ) : hilos.length === 0 ? (
        <Vacio mensaje="No tienes hilos de consulta. Se abren desde una solicitud o un proyecto." />
      ) : (
        <div className="tarjeta lista">
          {hilos.map((h) => (
            <Link className="fila-lista" to={"/mensajes?hilo=" + encodeURIComponent(h.hilo)} key={h.hilo}>
              <span className="logo-circulo chico">C</span>
              <div className="fila-principal">
                <strong>{h.titulo}</strong>
                <p>{h.detalle}</p>
              </div>
              <span className="nota">Abrir</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Hilo({ hilo }) {
  const { usuario } = useSesion();
  const { toast } = useUi();
  const [datos, setDatos] = useState(null);
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const finHilos = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const [mensajes, tituloHilo] = await Promise.all([api("/mensajes?hilo=" + encodeURIComponent(hilo)), tituloDe(hilo)]);
      setDatos(mensajes);
      setTitulo(tituloHilo);
    } catch (e) {
      toast(e.message, "error");
      setDatos([]);
    }
  }, [hilo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (finHilos.current && finHilos.current.parentElement) {
      finHilos.current.parentElement.scrollTop = finHilos.current.parentElement.scrollHeight;
    }
  }, [datos]);

  if (!datos) return <Cargando />;

  const enviar = async (e) => {
    e.preventDefault();
    const valor = texto.trim();
    if (!valor) return;
    try {
      await api("/mensajes", { metodo: "POST", cuerpo: { hiloId: hilo, texto: valor } });
      setTexto("");
      cargar();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo="Consultas"
        sub={titulo}
        acciones={<Link className="btn chico" to="/mensajes">Otros hilos</Link>}
      />
      <section className="tarjeta chat">
        <div className="chat-hilos">
          {datos.length === 0 ? (
            <Vacio mensaje="Sin mensajes todavía. Escribe la primera consulta." />
          ) : (
            datos.map((m) => (
              <div className={"burbuja" + (m.autorId === usuario.usuarioId ? " propia" : "")} key={m.creadoEn__id}>
                <div className="burbuja-cab">
                  <strong>{m.autorNombre}</strong> · {nombreRol(m.autorRol)}
                </div>
                <p>{m.texto}</p>
                <time>{fmtFechaHora(m.creadoEn__id)}</time>
              </div>
            ))
          )}
          <div ref={finHilos}></div>
        </div>
        <form className="chat-form" onSubmit={enviar}>
          <input value={texto} placeholder="Escribe tu mensaje…" autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
          <button className="btn primario">Enviar</button>
        </form>
      </section>
    </>
  );
}

async function tituloDe(hilo) {
  try {
    if (hilo.startsWith("SOL#")) {
      const datos = await api("/solicitudes/" + hilo.slice(4));
      return "Solicitud: " + datos.solicitud.titulo;
    }
    if (hilo.startsWith("PROY#")) {
      const datos = await api("/proyectos/" + hilo.slice(5));
      return "Proyecto: " + datos.proyecto.nombre;
    }
  } catch (e) {}
  return "Hilo " + (hilo || "").slice(0, 12);
}
