import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFechaHora } from "../util";
import { Cargando, EncabezadoVista, Tarjeta, Vacio } from "../componentes/basicos";

export default function Notificaciones() {
  const { sonarCampanaAhora } = useSesion();
  const { toast } = useUi();
  const navegar = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/notificaciones"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <EncabezadoVista titulo="Notificaciones" sub={error} />;
  if (!datos) return <Cargando />;

  const marcar = async (id) => {
    try {
      await api("/notificaciones/" + encodeURIComponent(id) + "/leer", { metodo: "PUT" });
      cargar();
      sonarCampanaAhora();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const abrir = (n) => {
    marcar(n.creadoEn__id);
    if (n.enlace) navegar(n.enlace);
  };

  return (
    <>
      <EncabezadoVista titulo="Notificaciones" />
      <Tarjeta>
        {datos.notificaciones.length === 0 ? (
          <Vacio mensaje="No tienes notificaciones" />
        ) : (
          <div className="lista-notif">
            {datos.notificaciones.map((n) => (
              <div className={"notif " + (n.leida ? "" : "no-leida")} key={n.creadoEn__id}>
                <div onClick={() => abrir(n)}>
                  <strong>{n.titulo}</strong>
                  <p>{n.mensaje}</p>
                  <time>{fmtFechaHora(n.creadoEn__id)}</time>
                </div>
                {!n.leida && (
                  <button className="btn chico" onClick={() => marcar(n.creadoEn__id)}>Marcar leída</button>
                )}
                {n.enlace && (
                  <button className="btn chico" onClick={() => abrir(n)}>Abrir</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </>
  );
}
