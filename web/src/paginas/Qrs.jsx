import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora, hoyISO, isoDe, nombreTipoDoc } from "../util";
import { Cargando, EncabezadoVista, Tarjeta, Vacio } from "../componentes/basicos";

export default function Qrs() {
  const { toast, abrirModal, cerrarModal } = useUi();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/qrs"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Códigos QR" sub={error} />;
  if (!items) return <Cargando />;

  const nombreTipo = (t) => ({ evento: "Actividad", anuncio: "Anuncio", documento: "Material" }[t] || t);

  const nuevo = () => abrirModal("Nuevo código QR", <FormQr alCrear={crear} />, null);

  const crear = async ({ tipo, refId, expiraEn }) => {
    if (!tipo || !refId) {
      toast("Elige el tipo y el contenido", "error");
      return;
    }
    try {
      await api("/qrs", { metodo: "POST", cuerpo: { tipo, refId, expiraEn } });
      cerrarModal();
      toast("Código QR creado");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo="Códigos QR"
        sub="Comparte actividades, anuncios o materiales: quien escanee el código lo abrirá al instante"
        acciones={<button className="btn primario" onClick={nuevo}>Nuevo código QR</button>}
      />
      {items.length === 0 ? (
        <Vacio mensaje="Aún no has generado códigos QR" />
      ) : (
        <div className="tarjeta lista">
          {items.map((q) => (
            <Link className="fila-lista" to={"/qr/" + q.codigo} key={q.codigo}>
              <span className="logo-circulo chico">{nombreTipo(q.tipo).slice(0, 1)}</span>
              <div className="fila-principal">
                <strong>{q.titulo || "(sin título)"}</strong>
                <p>
                  {nombreTipo(q.tipo)} · {q.usos || 0} apertura(s)
                  {q.tipo === "evento" ? " · " + (q.asistencias || []).length + " asistencia(s)" : ""}
                  {q.expiraEn ? " · expira " + fmtFecha(q.expiraEn) : ""}
                </p>
                <p className="nota qr-codigo">{q.codigo}</p>
              </div>
              <span className="nota">Abrir</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function FormQr({ alCrear }) {
  const { toast } = useUi();
  const [tipo, setTipo] = useState("evento");
  const [opciones, setOpciones] = useState([]);
  const [refId, setRefId] = useState("");
  const [expiraEn, setExpira] = useState("");
  const [cargandoOpciones, setCargando] = useState(false);

  useEffect(() => {
    const cargarOpciones = async () => {
      setCargando(true);
      setRefId("");
      try {
        if (tipo === "evento") {
          const hoy = new Date();
          const fin = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
          const datos = await api("/eventos?desde=" + hoyISO() + "&hasta=" + isoDe(fin) + "&capas=ACTIVIDAD,REUNION,INSTITUCIONAL,CLASE,EVALUACION,FERIADO");
          setOpciones(datos.map((e) => ({ id: e.eventoId, nombre: e.titulo, detalle: fmtFecha(e.fecha) + (e.horaInicio ? " " + e.horaInicio : "") })));
        } else if (tipo === "anuncio") {
          const datos = await api("/anuncios");
          setOpciones(datos.map((a) => ({ id: a.anuncioId, nombre: a.titulo, detalle: a.categoria || "" })));
        } else {
          const datos = await api("/documentos");
          setOpciones(datos.map((d) => ({ id: d.documentoId, nombre: d.nombre, detalle: nombreTipoDoc(d.tipo) })));
        }
      } catch (e) {
        toast(e.message, "error");
        setOpciones([]);
      }
      setCargando(false);
    };
    cargarOpciones();
  }, [tipo]);

  return (
    <>
      <label className="campo">
        <span>Qué vas a compartir</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="evento">Actividad (entrada con registro)</option>
          <option value="anuncio">Anuncio</option>
          <option value="documento">Material o documento</option>
        </select>
      </label>
      <label className="campo">
        <span>Contenido</span>
        <select value={refId} disabled={cargandoOpciones} onChange={(e) => setRefId(e.target.value)}>
          <option value="">{cargandoOpciones ? "Cargando…" : "Selecciona…"}</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
              {o.detalle ? " · " + o.detalle : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Expira (opcional)</span>
        <input type="date" value={expiraEn} onChange={(e) => setExpira(e.target.value)} />
      </label>
      <p className="nota">
        Para actividades, quienes escaneen el código podrán registrar su entrada. Para anuncios y materiales, el código los lleva directo al contenido.
      </p>
      <button className="btn primario" onClick={() => alCrear({ tipo, refId, expiraEn })}>Generar código</button>
    </>
  );
}
