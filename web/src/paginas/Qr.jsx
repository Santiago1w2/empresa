import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, urlDescarga } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFecha, fmtFechaHora, nombreTipoDoc } from "../util";
import { Cargando, EncabezadoVista, Tarjeta, Vacio } from "../componentes/basicos";

const NOMBRE_TIPO = { evento: "Actividad", anuncio: "Anuncio", documento: "Material" };

export default function Qr() {
  const { codigo } = useParams();
  const { usuario } = useSesion();
  const { toast } = useUi();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/qrs/" + codigo));
    } catch (e) {
      setError(e.message);
    }
  }, [codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Código QR" sub={error} />;
  if (!datos) return <Cargando />;

  const { qr, destino, yaRegistrado, asistencias, totalAsistencias } = datos;
  const esEvento = qr.tipo === "evento";

  const registrarEntrada = async () => {
    setRegistrando(true);
    try {
      const r = await api("/qrs/" + codigo + "/checkin", { metodo: "POST", cuerpo: {} });
      setResultado(r);
      toast(r.yaEstaba ? "Ya tenías tu entrada registrada" : "Entrada registrada");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setRegistrando(false);
    }
  };

  const descargarDocumento = async () => {
    try {
      if (destino.archivoKey) {
        window.open(await urlDescarga(destino.archivoKey), "_blank");
      } else if (destino.contenido) {
        const blob = new Blob([destino.contenido], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (destino.nombre || "documento") + ".txt";
        a.click();
      } else {
        toast("Este documento no tiene archivo", "error");
      }
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo={qr.titulo || NOMBRE_TIPO[qr.tipo]}
        sub={NOMBRE_TIPO[qr.tipo] + " · compartido por " + (qr.creadoPorNombre || "—")}
      />
      <div className="rejilla-detalle">
        <Tarjeta className="col-span-2">
          {qr.tipo === "evento" && (
            <>
              <div className="tarjeta-encabezado">
                <h3>Entrada a la actividad</h3>
              </div>
              <p>
                <strong>{destino.titulo}</strong>
              </p>
              <p>
                {destino.fecha ? fmtFecha(destino.fecha) : ""}
                {destino.horaInicio ? " · " + destino.horaInicio + (destino.horaFin ? "–" + destino.horaFin : "") : ""}
                {destino.lugar ? " · " + destino.lugar : ""}
              </p>
              {destino.descripcion && <p className="nota">{destino.descripcion}</p>}
              {yaRegistrado || (resultado && resultado.registrado) ? (
                <p className="nota">
                  {resultado && !resultado.yaEstaba
                    ? "Entrada registrada ahora. ¡Que disfrutes la actividad!"
                    : "Ya tienes tu entrada registrada en esta actividad."}
                </p>
              ) : (
                <button className="btn primario" disabled={registrando} onClick={registrarEntrada}>
                  {registrando ? "Registrando…" : "Registrar mi entrada"}
                </button>
              )}
            </>
          )}
          {qr.tipo === "anuncio" && (
            <>
              <div className="tarjeta-encabezado">
                <h3>Anuncio compartido</h3>
              </div>
              <p className="nota">
                {destino.categoria || ""} · {destino.creadoPorNombre || ""} · {fmtFechaHora(destino.creadoEn)}
              </p>
              <p>{destino.contenido || ""}</p>
              {(destino.adjuntos || []).length > 0 && (
                <div className="etiquetas">
                  {destino.adjuntos.map((x, i) => (
                    <button
                      className="etiqueta"
                      key={i}
                      onClick={async () => {
                        try {
                          window.open(await urlDescarga(x.key), "_blank");
                        } catch (e) {
                          toast(e.message, "error");
                        }
                      }}
                    >
                      {x.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {qr.tipo === "documento" && (
            <>
              <div className="tarjeta-encabezado">
                <h3>Material compartido</h3>
              </div>
              <p>
                <strong>{destino.nombre}</strong>
              </p>
              <p className="nota">
                {nombreTipoDoc(destino.tipo)}
                {destino.categoria ? " · " + destino.categoria : ""} · {destino.creadoPorNombre || ""}
              </p>
              {destino.descripcion && <p className="nota">{destino.descripcion}</p>}
              <button className="btn primario" onClick={descargarDocumento}>Descargar</button>
            </>
          )}
          <p className="nota qr-codigo">Código: {qr.codigo}</p>
        </Tarjeta>

        {esEvento && asistencias !== undefined && (
          <Tarjeta>
            <div className="tarjeta-encabezado">
              <h3>Asistencias ({totalAsistencias})</h3>
            </div>
            {asistencias.length === 0 ? (
              <Vacio mensaje="Aún nadie ha registrado su entrada" />
            ) : (
              <div className="tarjeta lista">
                {asistencias.map((a, i) => (
                  <div className="fila-lista" key={i}>
                    <div className="fila-principal">
                      <strong>{a.nombre}</strong>
                      <p>
                        {a.grado ? a.grado + (a.seccion || "") + " · " : ""}
                        {fmtFechaHora(a.cuando)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
        )}
      </div>
    </>
  );
}
