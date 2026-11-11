import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { Badge, Cargando, EncabezadoVista, Vacio } from "../componentes/basicos";

export default function Explorar() {
  const { usuario } = useSesion();
  const { toast } = useUi();
  const [proyectos, setProyectos] = useState(null);
  const [error, setError] = useState("");
  const [uniendome, setUniendo] = useState("");

  const cargar = () => {
    api("/proyectos?explorar=1")
      .then(setProyectos)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    cargar();
  }, []);

  if (error) return <EncabezadoVista titulo="Explorar iniciativas" sub={error} />;
  if (!proyectos) return <Cargando />;

  const unirme = async (proyectoId) => {
    setUniendo(proyectoId);
    try {
      await api("/proyectos/" + proyectoId + "/unirse", { metodo: "POST", cuerpo: {} });
      toast("¡Te uniste al proyecto!");
      cargar();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setUniendo("");
    }
  };

  return (
    <>
      <EncabezadoVista titulo="Explorar iniciativas" sub="Proyectos activos que aceptan nuevos miembros" />
      {proyectos.length === 0 ? (
        <Vacio mensaje="No hay iniciativas abiertas por ahora. ¡Puedes proponer la tuya!" />
      ) : (
        <div className="rejilla-proyectos">
          {proyectos.map((p) => {
            const miembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
            return (
              <div className="tarjeta proyecto-tarjeta" key={p.proyectoId}>
                <div className="tarjeta-encabezado">
                  <h3>
                    <Link to={"/proyectos/" + p.proyectoId}>{p.nombre}</Link>
                  </h3>
                  <Badge estado={p.estado} />
                </div>
                <p>{p.descripcion || p.objetivo || ""}</p>
                <p className="nota">
                  Lidera: {p.responsableNombre || "—"}
                  {p.docenteAsesorId ? " · Con asesoría docente" : ""}
                </p>
                {usuario.rol === "estudiante" &&
                  (miembro ? (
                    <span className="btn chico" disabled>Ya eres miembro</span>
                  ) : (
                    <button className="btn primario chico" disabled={uniendome === p.proyectoId} onClick={() => unirme(p.proyectoId)}>
                      {uniendome === p.proyectoId ? "Uniéndote…" : "Unirme"}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
