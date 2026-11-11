import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSesion } from "../contextos/SesionContexto";
import { useUi } from "../contextos/UiContexto";
import { fmtFechaHora, iniciales, nombreRol } from "../util";
import { Vacio } from "../componentes/basicos";

const MENUS = {
  estudiante: ["inicio", "solicitudes", "proyectos", "explorar", "anuncios", "calendario", "documentos", "qrs", "perfil"],
  docente: ["inicio", "bandeja", "proyectos", "anuncios", "calendario", "documentos", "qrs", "perfil"],
  coordinacion: ["inicio", "bandeja", "anuncios", "calendario", "indicadores", "qrs", "perfil"],
  direccion: ["inicio", "bandeja", "solicitudes", "proyectos", "anuncios", "calendario", "indicadores", "auditoria", "qrs", "perfil"],
  administracion: ["inicio", "bandeja", "calendario", "anuncios", "documentos", "qrs", "perfil"],
  padre: ["inicio", "autorizaciones", "anuncios", "calendario", "qrs", "perfil"],
  promotor: ["inicio", "indicadores", "anuncios", "qrs", "perfil"],
  ti: ["inicio", "bandeja", "solicitudes", "proyectos", "anuncios", "usuarios", "calendario", "indicadores", "auditoria", "qrs", "perfil"],
};

const TEXTOS = {
  inicio: "Inicio", solicitudes: "Solicitudes", bandeja: "Por revisar", proyectos: "Proyectos",
  explorar: "Explorar", anuncios: "Anuncios", calendario: "Calendario", documentos: "Documentos",
  indicadores: "Indicadores", auditoria: "Auditoría", usuarios: "Usuarios", autorizaciones: "Autorizaciones",
  qrs: "Códigos QR", perfil: "Perfil",
};

export default function Layout({ children }) {
  const { usuario, noLeidas, cambiarTema, cambiarLetra, salir, sonarCampanaAhora } = useSesion();
  const { abrirModal, cerrarModal, toast } = useUi();
  const navegar = useNavigate();
  const menu = MENUS[usuario.rol] || MENUS.estudiante;

  useEffect(() => {
    document.title = "Santa Anita Conecta";
  }, []);

  const irANotificacion = async (id, enlace) => {
    cerrarModal();
    try {
      await api("/notificaciones/" + encodeURIComponent(id) + "/leer", { metodo: "PUT" });
    } catch (e) {}
    sonarCampanaAhora();
    if (enlace) navegar(enlace);
  };

  const abrirCampana = async () => {
    const datos = await sonarCampanaAhora();
    if (!datos) {
      toast("No se pudieron cargar las notificaciones", "error");
      return;
    }
    const ultimas = (datos.notificaciones || []).slice(0, 10);
    abrirModal(
      "Notificaciones",
      ultimas.length === 0 ? (
        <Vacio mensaje="No tienes notificaciones" />
      ) : (
        <div className="lista-notif">
          {ultimas.map((n) => (
            <div key={n.creadoEn__id} className={"notif " + (n.leida ? "" : "no-leida")} onClick={() => irANotificacion(n.creadoEn__id, n.enlace)}>
              <strong>{n.titulo}</strong>
              <p>{n.mensaje}</p>
              <time>{fmtFechaHora(n.creadoEn__id)}</time>
            </div>
          ))}
        </div>
      ),
      <a className="btn bloque" style={{ textAlign: "center" }} href="#/notificaciones" onClick={cerrarModal}>
        Ver todas
      </a>
    );
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo-marca">
          <div className="logo-circulo">SA</div>
          <div>
            <h1>Santa Anita</h1>
            <p>Conecta</p>
          </div>
        </div>
        <nav className="menu-lateral">
          {menu.map((ruta) => (
            <NavLink key={ruta} to={"/" + ruta} className={({ isActive }) => (isActive ? "activa" : "")}>
              {TEXTOS[ruta]}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <span className="rol-etiqueta">{nombreRol(usuario.rol)}</span>
        </div>
      </aside>
      <div className="principal">
        <header className="barra">
          <div className="barra-izq">
            <button className="btn-icono" onClick={cambiarTema} title="Cambiar tema">
              <span className="icono-tema"></span>
            </button>
            <button className="btn-icono" onClick={() => cambiarLetra(-1)} title="Reducir letra">A-</button>
            <button className="btn-icono" onClick={() => cambiarLetra(1)} title="Aumentar letra">A+</button>
          </div>
          <div className="barra-der">
            <button className="btn-icono campana" onClick={abrirCampana} title="Notificaciones">
              <span className="icono-campana"></span>
              {noLeidas > 0 && (
                <span className="campana-conteo" style={{ display: "flex" }}>
                  {noLeidas}
                </span>
              )}
            </button>
            <a href="#/perfil" className="avatar" title={usuario.nombre}>
              {iniciales(usuario.nombre)}
            </a>
          </div>
        </header>
        <main className="contenido">{children}</main>
      </div>
      <nav className="nav-inferior">
        {menu.slice(0, 5).map((ruta) => (
          <NavLink key={ruta} to={"/" + ruta} className={({ isActive }) => (isActive ? "activa" : "")}>
            {TEXTOS[ruta]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
