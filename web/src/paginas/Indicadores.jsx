import { useEffect, useState } from "react";
import { api } from "../api";
import { nombreEstado, nombreRol } from "../util";
import { Barras, Cargando, EncabezadoVista, Tarjeta } from "../componentes/basicos";

const etiqueta = (k) => (k.includes("_") && nombreEstado(k) !== k ? nombreEstado(k) : nombreRol(k) !== k ? nombreRol(k) : k);

export default function Indicadores() {
  const [ind, setInd] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/indicadores")
      .then(setInd)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <EncabezadoVista titulo="Indicadores" sub={error} />;
  if (!ind) return <Cargando />;

  return (
    <>
      <EncabezadoVista titulo="Indicadores" sub="Tablero institucional en tiempo real" />
      <div className="kpis">
        <div className="kpi"><strong>{ind.totalSolicitudes}</strong><span>solicitudes</span></div>
        <div className="kpi"><strong>{ind.tiempoPromedioRespuestaDias}</strong><span>días promedio de respuesta</span></div>
        <div className={"kpi" + (ind.vencidas > 0 ? " alarma" : "")}><strong>{ind.vencidas}</strong><span>fuera de plazo (SLA)</span></div>
        <div className="kpi"><strong>{ind.tasaLecturaAnuncios}%</strong><span>lectura de anuncios</span></div>
      </div>
      {(ind.proyectosEnRiesgo || []).length > 0 && (
        <Tarjeta className="alerta-tarjeta">
          <div className="tarjeta-encabezado">
            <h3>Proyectos sin movimientos (más de 30 días)</h3>
          </div>
          <ul>
            {ind.proyectosEnRiesgo.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Tarjeta>
      )}
      <div className="rejilla-detalle">
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Solicitudes por estado</h3></div>
          <Barras datos={ind.solicitudesPorEstado} nombre={etiqueta} />
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Tiempo promedio por rol (días)</h3></div>
          {Object.keys(ind.tiempoPromedioPorRolDias || {}).length === 0 ? (
            <p className="nota">Sin decisiones registradas aún</p>
          ) : (
            <table className="tabla-datos">
              <thead>
                <tr><th>Rol</th><th>Días</th></tr>
              </thead>
              <tbody>
                {Object.entries(ind.tiempoPromedioPorRolDias).map(([r, v]) => (
                  <tr key={r}><td>{nombreRol(r)}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Proyectos por estado</h3></div>
          <Barras datos={ind.proyectosPorEstado} nombre={etiqueta} />
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Comunidad por rol</h3></div>
          <Barras datos={ind.usuariosPorRol} nombre={etiqueta} />
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Participación por nivel</h3></div>
          <Barras datos={ind.participacionPorNivel} nombre={etiqueta} />
        </Tarjeta>
        {(ind.detalleLecturas || []).length > 0 && (
          <Tarjeta className="col-span-2">
            <div className="tarjeta-encabezado"><h3>Confirmación de lectura de anuncios</h3></div>
            <table className="tabla-datos">
              <thead>
                <tr><th>Anuncio</th><th>Lecturas</th><th>Tasa</th></tr>
              </thead>
              <tbody>
                {ind.detalleLecturas.map((d) => (
                  <tr key={d.anuncio}>
                    <td>{d.anuncio}</td>
                    <td>{d.leidos}/{d.total}</td>
                    <td>{d.tasa}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
