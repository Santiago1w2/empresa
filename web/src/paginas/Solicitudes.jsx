import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { fmtFecha, nombreEstado, nombreRol } from "../util";
import { Badge, Cargando, EncabezadoVista, Semaforo, Tarjeta, Vacio } from "../componentes/basicos";

const ESTADOS = ["", "EN_REVISION", "OBSERVADA", "APROBADA", "APROBADA_CONDICIONES", "EN_AUTORIZACION_PADRES", "RECHAZADA", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA"];

export default function Solicitudes({ bandeja }) {
  const { usuario } = useSesion();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        setDatos(bandeja ? await api("/solicitudes?bandeja=1") : await api("/solicitudes"));
      } catch (e) {
        setError(e.message);
      }
    };
    cargar();
  }, [bandeja]);

  if (error) return <EncabezadoVista titulo="Solicitudes" sub={error} />;
  if (!datos) return <Cargando />;

  const puedeCrear = ["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(usuario.rol);
  const items = filtro ? datos.filter((s) => s.estado === filtro) : datos;

  return (
    <>
      <EncabezadoVista
        titulo={bandeja ? "Bandeja de revisión" : "Solicitudes"}
        acciones={puedeCrear && !bandeja ? <Link className="btn primario" to="/solicitudes/nueva">Nueva solicitud</Link> : null}
      />
      <div className="pastillas">
        {ESTADOS.map((e) => (
          <button key={e} className={"pastilla" + (filtro === e ? " activa" : "")} onClick={() => setFiltro(e)}>
            {e ? nombreEstado(e) : "Todas"}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <Vacio mensaje={bandeja ? "No tienes solicitudes pendientes de revisión" : "No hay solicitudes para mostrar"} />
      ) : (
        <div className="tarjeta lista">
          {items.map((s) => (
            <Link className="fila-lista" to={"/solicitudes/" + s.solicitudId} key={s.solicitudId}>
              <Semaforo estado={s.estado} />
              <div className="fila-principal">
                <strong>{s.titulo}</strong>
                <p>
                  {s.tipoNombre || ""} · {s.solicitanteNombre || ""}
                  {s.fecha ? " · " + fmtFecha(s.fecha) : ""}
                </p>
                {s.estado === "EN_REVISION" && s.revisorActualRol && (
                  <p className="nota">{nombreRol(s.revisorActualRol)} revisa ahora</p>
                )}
                {s.estado === "OBSERVADA" && (
                  <p className="nota alerta-texto">Observada: {(s.observacion || "").slice(0, 90)}</p>
                )}
              </div>
              <Badge estado={s.estado} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
