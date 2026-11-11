import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api, valorQr } from "../api";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, hoyISO } from "../util";
import { Cargando, EncabezadoVista, Tarjeta } from "../componentes/basicos";

const NOMBRE_TIPO = { evento: "Actividad", anuncio: "Anuncio", documento: "Material" };

export default function CompartirQr() {
  const { tipo, id } = useParams();
  const { toast } = useUi();
  const navegar = useNavigate();
  const [qr, setQr] = useState(null);
  const [expiraEn, setExpira] = useState("");
  const [error, setError] = useState("");

  const buscarOCrear = useCallback(
    async (conExpira) => {
      try {
        const mios = await api("/qrs");
        const existente = mios.find((q) => q.tipo === tipo && q.refId === id && (!q.expiraEn || !conExpira));
        if (existente && !conExpira) {
          setQr(existente);
          return;
        }
        const nuevo = await api("/qrs", {
          metodo: "POST",
          cuerpo: { tipo, refId: id, expiraEn: conExpira ? expiraEn : "" },
        });
        setQr(nuevo);
      } catch (e) {
        setError(e.message);
      }
    },
    [tipo, id, expiraEn]
  );

  useEffect(() => {
    buscarOCrear(false);
  }, [buscarOCrear]);

  useEffect(() => {
    if (qr && qr.expiraEn === null) setExpira("");
  }, [qr]);

  if (error) return <EncabezadoVista titulo="Compartir con QR" sub={error} />;
  if (!qr) return <Cargando />;

  const regenerar = async () => {
    if (!expiraEn) {
      toast("Elige una fecha de expiración para generar un código nuevo", "error");
      return;
    }
    try {
      const nuevo = await api("/qrs", { metodo: "POST", cuerpo: { tipo, refId: id, expiraEn } });
      setQr(nuevo);
      toast("Nuevo código generado");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo="Compartir con código QR"
        sub={NOMBRE_TIPO[tipo] + " · " + (qr.titulo || "")}
        acciones={<Link className="btn" to="/qrs">Mis códigos</Link>}
      />
      <div className="rejilla-detalle">
        <Tarjeta className="col-span-2">
          <div className="qr-caja">
            <QRCodeSVG value={valorQr(qr.codigo)} size={220} />
            <p className="nota qr-instruccion">
              Muestra este código en pantalla o pégalo donde necesites. Quien lo escanee con la app móvil o la cámara
              abrirá {tipo === "evento" ? "la actividad y podrá registrar su entrada" : "el contenido compartido"} al instante.
            </p>
            <p className="qr-codigo">{qr.codigo}</p>
            <p className="nota">
              {qr.usos || 0} apertura(s)
              {qr.tipo === "evento" ? " · " + (qr.asistencias || []).length + " asistencia(s)" : ""}
              {qr.expiraEn ? " · expira " + fmtFecha(qr.expiraEn) : ""}
            </p>
            <Link className="btn" to={"/qr/" + qr.codigo}>Ver cómo se abre</Link>
          </div>
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado">
            <h3>Código con expiración</h3>
          </div>
          <label className="campo">
            <span>Expira el</span>
            <input type="date" value={expiraEn} min={hoyISO()} onChange={(e) => setExpira(e.target.value)} />
          </label>
          <p className="nota">Útil para entradas de un solo día: el código deja de funcionar pasado el vencimiento.</p>
          <button className="btn" onClick={regenerar}>Generar código con expiración</button>
        </Tarjeta>
      </div>
    </>
  );
}
