import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { nombreEstado, nombreRol } from "../util";
import { Badge, Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

export default function Proyectos() {
  const { usuario } = useSesion();
  const [proyectos, setProyectos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/proyectos")
      .then(setProyectos)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <EncabezadoVista titulo="Proyectos" sub={error} />;
  if (!proyectos) return <Cargando />;

  return (
    <>
      <EncabezadoVista titulo={usuario.rol === "docente" ? "Mis proyectos" : "Proyectos"} />
      {proyectos.length === 0 ? (
        <Vacio mensaje="Aún no hay proyectos. Las solicitudes aprobadas se convierten en proyectos al ejecutarse." />
      ) : (
        <div className="rejilla-proyectos">
          {proyectos.map((p) => (
            <TarjetaProyecto p={p} key={p.proyectoId} />
          ))}
        </div>
      )}
    </>
  );
}

export function TarjetaProyecto({ p }) {
  const equipo = p.equipo || [];
  const hitos = p.hitos || [];
  const cumplidos = hitos.filter((h) => h.cumplido).length;
  const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;
  return (
    <Link className="tarjeta proyecto-tarjeta" to={"/proyectos/" + p.proyectoId}>
      <div className="tarjeta-encabezado">
        <h3>{p.nombre}</h3>
        <Badge estado={p.estado} />
      </div>
      <p>{p.descripcion || p.objetivo || "Sin descripción"}</p>
      <p className="nota">
        {p.categoria || ""} · Responsable: {p.responsableNombre || "—"} · Equipo: {equipo.length}
      </p>
      {hitos.length > 0 && (
        <>
          <div className="barra-pista">
            <div className="barra-relleno" style={{ width: avance + "%" }}></div>
          </div>
          <p className="nota">Avance {avance}% ({cumplidos}/{hitos.length} hitos)</p>
        </>
      )}
      {p.alertaInactividad && <p className="nota alerta-texto">Sin movimientos por más de 30 días</p>}
    </Link>
  );
}
