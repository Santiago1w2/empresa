import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { CAPAS, DIAS, fmtFecha, hoyISO, isoDe, nombreCapa } from "../util";
import { Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Calendario() {
  const { usuario, catalogo } = useSesion();
  const { toast, abrirModal, cerrarModal, confirmar } = useUi();
  const navegar = useNavigate();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [activas, setActivas] = useState(CAPAS.slice());
  const [cat, setCat] = useState(null);
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setCat(catalogo || (await api("/catalogos")));
      const primero = new Date(anio, mes, 1);
      const ultimo = new Date(anio, mes + 1, 0);
      const datos = await api(
        "/eventos?desde=" + isoDe(primero) + "&hasta=" + isoDe(ultimo) + "&capas=" + activas.join(",")
      );
      setEventos(datos);
    } catch (e) {
      setError(e.message);
    }
  }, [anio, mes, activas, catalogo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Calendario" sub={error} />;
  if (!eventos || !cat) return <Cargando />;

  const puedeCrear = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol);
  const hoyStr = hoyISO();
  const primero = new Date(anio, mes, 1);
  const ultimo = new Date(anio, mes + 1, 0);
  const offset = (primero.getDay() + 6) % 7;
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= ultimo.getDate(); d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);

  const alternarCapa = (capa) =>
    setActivas((a) => (a.includes(capa) ? a.filter((c) => c !== capa) : [...a, capa]));

  const abrirDia = (isoStr) => {
    const delDia = eventos.filter((e) => e.fecha === isoStr);
    abrirModal(
      fmtFecha(isoStr),
      delDia.length === 0 ? (
        <Vacio mensaje="Sin eventos este día" />
      ) : (
        delDia.map((e) => (
          <div className={"evento-dia t-" + e.tipo} key={e.eventoId}>
            <div>
              <strong>{e.titulo}</strong>
              <p>
                {nombreCapa(e.tipo)}
                {e.horaInicio ? " · " + e.horaInicio + (e.horaFin ? "–" + e.horaFin : "") : ""}
                {e.ambienteId ? " · " + nombreAmbiente(cat, e.ambienteId) : ""}
              </p>
              {e.descripcion && <p className="nota">{e.descripcion}</p>}
              <p className="nota">Creado por {e.creadoPorNombre || ""}</p>
            </div>
            {(usuario.rol === "ti" || usuario.rol === "direccion" || e.creadoPor === usuario.usuarioId) && (
              <button
                className="btn chico peligro"
                onClick={async () => {
                  const seguro = await confirmar("¿Eliminar este evento?");
                  if (!seguro) return;
                  try {
                    await api("/eventos/" + e.eventoId, { metodo: "DELETE" });
                    cerrarModal();
                    toast("Evento eliminado");
                    cargar();
                  } catch (err) {
                    toast(err.message, "error");
                  }
                }}
              >
                Eliminar
              </button>
            )}
            {puedeCrear && (
              <button
                className="btn chico"
                onClick={() => {
                  cerrarModal();
                  navegar("/compartir/evento/" + e.eventoId);
                }}
              >
                Compartir con QR
              </button>
            )}
          </div>
        ))
      ),
      null
    );
  };

  const crearEvento = () =>
    abrirModal("Nuevo evento o reserva", <FormEvento cat={cat} alGuardar={guardarEvento} />, null);

  const guardarEvento = async (cuerpo) => {
    try {
      const datos = await api("/eventos", { metodo: "POST", cuerpo });
      cerrarModal();
      toast("Evento creado");
      if (datos.conflictos && datos.conflictos.length) {
        toast("Choques detectados: " + datos.conflictos.join(" | "), "error");
      }
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo="Calendario"
        acciones={puedeCrear ? <button className="btn primario" onClick={crearEvento}>Nuevo evento</button> : null}
      />
      <div className="calendario-herramientas">
        <button className="btn-icono" onClick={() => (mes === 0 ? (setMes(11), setAnio(anio - 1)) : setMes(mes - 1))}>&larr;</button>
        <strong>{MESES_LARGOS[mes]} {anio}</strong>
        <button className="btn-icono" onClick={() => (mes === 11 ? (setMes(0), setAnio(anio + 1)) : setMes(mes + 1))}>&rarr;</button>
        <button
          className="btn chico"
          onClick={() => {
            const h = new Date();
            setAnio(h.getFullYear());
            setMes(h.getMonth());
          }}
        >
          Hoy
        </button>
        <div className="capas">
          {CAPAS.map((c) => (
            <button
              key={c}
              className={"capa-chip t-" + c + (activas.includes(c) ? " activa" : "")}
              onClick={() => alternarCapa(c)}
            >
              {nombreCapa(c)}
            </button>
          ))}
        </div>
      </div>
      <div className="calendario-malla">
        {DIAS.map((d) => (
          <div className="cal-encabezado" key={d}>{d}</div>
        ))}
        {celdas.map((fecha, i) => {
          if (!fecha) return <div className="cal-dia otro-mes" key={"v" + i}></div>;
          const iso = isoDe(fecha);
          const delDia = eventos.filter((e) => e.fecha === iso);
          return (
            <div className={"cal-dia" + (iso === hoyStr ? " hoy" : "")} key={iso} onClick={() => abrirDia(iso)}>
              <span>{fecha.getDate()}</span>
              {delDia.slice(0, 4).map((e) => (
                <div className={"cal-evento t-" + e.tipo} key={e.eventoId} title={e.titulo + " " + (e.horaInicio || "")}>
                  {e.titulo}
                </div>
              ))}
              {delDia.length > 4 && <div className="cal-evento mas">+{delDia.length - 4} más</div>}
            </div>
          );
        })}
      </div>
      <div className="leyenda-capas">
        {CAPAS.map((c) => (
          <span key={c}><i className={"punto t-" + c}></i>{nombreCapa(c)}</span>
        ))}
      </div>
    </>
  );
}

function nombreAmbiente(cat, ambienteId) {
  const a = ((cat && cat.ambientes) || []).find((x) => x.ambienteId === ambienteId);
  return a ? a.nombre : "Ambiente";
}

function FormEvento({ cat, alGuardar }) {
  const { toast } = useUi();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("ACTIVIDAD");
  const [fecha, setFecha] = useState(hoyISO());
  const [horaInicio, setHi] = useState("");
  const [horaFin, setHf] = useState("");
  const [ambienteId, setAmbiente] = useState("");
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [seccion, setSeccion] = useState("");
  const guardar = () => {
    if (!titulo.trim() || !fecha) {
      toast("Título y fecha son obligatorios", "error");
      return;
    }
    alGuardar({
      titulo: titulo.trim(),
      descripcion,
      tipo,
      fecha,
      horaInicio: horaInicio || "",
      horaFin: horaFin || "",
      ambienteId: ambienteId || "",
      nivel: nivel || "",
      grado: grado.trim() || "",
      seccion: seccion.trim() || "",
    });
  };
  return (
    <>
      <label className="campo"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      <label className="campo"><span>Descripción</span><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></label>
      <div className="fila">
        <label className="campo">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {CAPAS.map((c) => (
              <option key={c} value={c}>{nombreCapa(c)}</option>
            ))}
          </select>
        </label>
        <label className="campo"><span>Fecha</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      </div>
      <div className="fila">
        <label className="campo"><span>De</span><input type="time" value={horaInicio} onChange={(e) => setHi(e.target.value)} /></label>
        <label className="campo"><span>A</span><input type="time" value={horaFin} onChange={(e) => setHf(e.target.value)} /></label>
        <label className="campo">
          <span>Ambiente</span>
          <select value={ambienteId} onChange={(e) => setAmbiente(e.target.value)}>
            <option value="">Ninguno</option>
            {(cat.ambientes || []).map((a) => (
              <option key={a.ambienteId} value={a.ambienteId}>{a.nombre}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="fila">
        <label className="campo">
          <span>Nivel (opcional)</span>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Todos</option>
            {(cat.niveles || ["Primaria", "Secundaria"]).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="campo"><span>Grado (opcional)</span><input value={grado} placeholder="5°" onChange={(e) => setGrado(e.target.value)} /></label>
        <label className="campo"><span>Sección (opcional)</span><input value={seccion} placeholder="A" onChange={(e) => setSeccion(e.target.value)} /></label>
      </div>
      <p className="nota">Al guardar se avisa si hay choque de ambiente o con evaluaciones.</p>
      <button className="btn primario" onClick={guardar}>Guardar</button>
    </>
  );
}
