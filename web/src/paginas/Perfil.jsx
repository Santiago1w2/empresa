import { useEffect, useState } from "react";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { nombreRol } from "../util";
import { EncabezadoVista, Tarjeta } from "../componentes/basicos";

export default function Perfil() {
  const { usuario, salir, cambiarTema, cambiarLetra } = useSesion();
  const { toast } = useUi();
  const [insignias, setInsignias] = useState(0);
  const [finalizadas, setFinalizadas] = useState(0);
  const [directorio, setDirectorio] = useState(null);
  const [consentimiento, setConsentimiento] = useState(!!usuario.consentimientoDatos);

  useEffect(() => {
    const cargar = async () => {
      try {
        const solicitudes = await api("/solicitudes");
        setFinalizadas(solicitudes.filter((s) => s.estado === "FINALIZADA" || s.estado === "ARCHIVADA").length);
        const proyectos = await api("/proyectos");
        setInsignias(
          proyectos.filter((p) => (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId) && p.estado === "FINALIZADA").length
        );
      } catch (e) {}
      try {
        const usuarios = await api("/usuarios");
        const grupos = {};
        usuarios.forEach((x) => {
          if (["docente", "coordinacion", "direccion", "administracion"].includes(x.rol)) {
            grupos[x.rol] = grupos[x.rol] || [];
            grupos[x.rol].push(x);
          }
        });
        setDirectorio(grupos);
      } catch (e) {}
    };
    cargar();
  }, [usuario]);

  const guardarPreferencias = async () => {
    try {
      await api("/usuarios/" + usuario.usuarioId, {
        metodo: "PUT",
        cuerpo: { consentimientoDatos: consentimiento },
      });
      toast("Preferencias guardadas");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(usuario, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mis-datos-santa-anita-conecta.json";
    a.click();
  };

  return (
    <>
      <EncabezadoVista titulo="Mi perfil" />
      <div className="rejilla-inicio">
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Datos</h3></div>
          <p>
            <strong>{usuario.nombre}</strong>
            <br />
            {usuario.email}
            <br />
            {nombreRol(usuario.rol)}
            {usuario.nivel ? " · " + usuario.nivel + " " + (usuario.grado || "") + (usuario.seccion || "") : ""}
          </p>
          <p className="nota">
            Insignias ganadas: <strong>{insignias}</strong> · Actividades finalizadas: <strong>{finalizadas}</strong>
          </p>
          <button className="btn peligro" onClick={salir}>Cerrar sesión</button>
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Preferencias</h3></div>
          <div className="fila-opcion">
            <span>Tema oscuro</span>
            <button className="btn chico" onClick={cambiarTema}>Alternar</button>
          </div>
          <div className="fila-opcion">
            <span>Tamaño de letra</span>
            <span>
              <button className="btn chico" onClick={() => cambiarLetra(-1)}>A-</button>{" "}
              <button className="btn chico" onClick={() => cambiarLetra(1)}>A+</button>
            </span>
          </div>
          <div className="fila-opcion">
            <span>Consentimiento de datos (Ley 29733)</span>
            <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
          </div>
          <button className="btn" onClick={guardarPreferencias}>Guardar preferencias</button>
        </Tarjeta>
        <Tarjeta>
          <div className="tarjeta-encabezado"><h3>Mis datos (derechos ARCO)</h3></div>
          <p className="nota">Puedes revisar y exportar la información que la plataforma guarda sobre ti.</p>
          <button className="btn" onClick={exportar}>Descargar mis datos</button>
        </Tarjeta>
        {directorio && (
          <Tarjeta>
            <div className="tarjeta-encabezado"><h3>¿A quién acudo?</h3></div>
            {Object.entries(directorio).map(([rol, lista]) => (
              <div className="fila-lista" key={rol}>
                <div>
                  <strong>{nombreRol(rol)}</strong>
                  <p>{lista.map((x) => x.nombre).join(", ")}</p>
                </div>
              </div>
            ))}
            <p className="nota">
              Solicitudes → docente asesor y revisores · Logística → Administración · Permisos y salidas → Coordinación · Aprobación final → Dirección
            </p>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
