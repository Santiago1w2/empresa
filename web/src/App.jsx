import { HashRouter, Route, Routes } from "react-router-dom";
import { useSesion } from "./contextos/SesionContexto";
import { Cargando } from "./componentes/basicos";
import Layout from "./paginas/Layout";
import Login from "./paginas/Login";
import Inicio from "./paginas/Inicio";
import Solicitudes from "./paginas/Solicitudes";
import SolicitudDetalle from "./paginas/SolicitudDetalle";
import SolicitudNueva from "./paginas/SolicitudNueva";
import Proyectos from "./paginas/Proyectos";
import ProyectoDetalle from "./paginas/ProyectoDetalle";
import Explorar from "./paginas/Explorar";
import Anuncios from "./paginas/Anuncios";
import Calendario from "./paginas/Calendario";
import Autorizaciones from "./paginas/Autorizaciones";
import Mensajes from "./paginas/Mensajes";
import Documentos from "./paginas/Documentos";
import Indicadores from "./paginas/Indicadores";
import Usuarios from "./paginas/Usuarios";
import Auditoria from "./paginas/Auditoria";
import Notificaciones from "./paginas/Notificaciones";
import Perfil from "./paginas/Perfil";
import Qrs from "./paginas/Qrs";
import Qr from "./paginas/Qr";
import CompartirQr from "./paginas/CompartirQr";

export default function App() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  return (
    <HashRouter>
      {usuario ? (
        <Layout>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/solicitudes" element={<Solicitudes />} />
            <Route path="/solicitudes/nueva" element={<SolicitudNueva />} />
            <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />
            <Route path="/bandeja" element={<Solicitudes bandeja />} />
            <Route path="/proyectos" element={<Proyectos />} />
            <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
            <Route path="/explorar" element={<Explorar />} />
            <Route path="/anuncios" element={<Anuncios />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/autorizaciones" element={<Autorizaciones />} />
            <Route path="/mensajes" element={<Mensajes />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/indicadores" element={<Indicadores />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/auditoria" element={<Auditoria />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/qrs" element={<Qrs />} />
            <Route path="/qr/:codigo" element={<Qr />} />
            <Route path="/compartir/:tipo/:id" element={<CompartirQr />} />
            <Route path="*" element={<Inicio />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      )}
    </HashRouter>
  );
}
