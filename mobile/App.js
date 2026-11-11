import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Cargando } from "./src/componentes/basicos";
import { SesionProveedor, useSesion } from "./src/contexto/Sesion";
import Login from "./src/paginas/Login";
import Pestanas from "./src/paginas/Pestanas";
import Inicio from "./src/paginas/Inicio";
import Solicitudes from "./src/paginas/Solicitudes";
import SolicitudDetalle from "./src/paginas/SolicitudDetalle";
import SolicitudNueva from "./src/paginas/SolicitudNueva";
import Proyectos from "./src/paginas/Proyectos";
import ProyectoDetalle from "./src/paginas/ProyectoDetalle";
import Explorar from "./src/paginas/Explorar";
import Anuncios from "./src/paginas/Anuncios";
import AnuncioDetalle from "./src/paginas/AnuncioDetalle";
import Calendario from "./src/paginas/Calendario";
import EventoNuevo from "./src/paginas/EventoNuevo";
import Autorizaciones from "./src/paginas/Autorizaciones";
import Mensajes from "./src/paginas/Mensajes";
import MensajeHilo from "./src/paginas/MensajeHilo";
import Documentos from "./src/paginas/Documentos";
import Indicadores from "./src/paginas/Indicadores";
import Usuarios from "./src/paginas/Usuarios";
import Auditoria from "./src/paginas/Auditoria";
import Notificaciones from "./src/paginas/Notificaciones";
import Perfil from "./src/paginas/Perfil";
import Escanear from "./src/paginas/Escanear";
import QrDetalle from "./src/paginas/QrDetalle";
import MisQrs from "./src/paginas/MisQrs";
import GenerarQr from "./src/paginas/GenerarQr";

const Pila = createNativeStackNavigator();

function Raiz() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  return (
    <Pila.Navigator screenOptions={{ headerStyle: { backgroundColor: "#2563eb" }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "600" } }}>
      {usuario ? (
        <>
          <Pila.Screen name="Pestanas" component={Pestanas} options={{ headerShown: false }} />
          <Pila.Screen name="SolicitudDetalle" component={SolicitudDetalle} options={{ title: "Solicitud" }} />
          <Pila.Screen name="SolicitudNueva" component={SolicitudNueva} options={{ title: "Nueva solicitud" }} />
          <Pila.Screen name="ProyectoDetalle" component={ProyectoDetalle} options={{ title: "Proyecto" }} />
          <Pila.Screen name="Explorar" component={Explorar} options={{ title: "Explorar" }} />
          <Pila.Screen name="Anuncios" component={Anuncios} options={{ title: "Anuncios" }} />
          <Pila.Screen name="AnuncioDetalle" component={AnuncioDetalle} options={{ title: "Anuncio" }} />
          <Pila.Screen name="Calendario" component={Calendario} options={{ title: "Calendario" }} />
          <Pila.Screen name="EventoNuevo" component={EventoNuevo} options={{ title: "Nuevo evento" }} />
          <Pila.Screen name="Autorizaciones" component={Autorizaciones} options={{ title: "Autorizaciones" }} />
          <Pila.Screen name="Mensajes" component={Mensajes} options={{ title: "Consultas" }} />
          <Pila.Screen name="MensajeHilo" component={MensajeHilo} options={{ title: "Consulta" }} />
          <Pila.Screen name="Documentos" component={Documentos} options={{ title: "Documentos" }} />
          <Pila.Screen name="Indicadores" component={Indicadores} options={{ title: "Indicadores" }} />
          <Pila.Screen name="Usuarios" component={Usuarios} options={{ title: "Usuarios" }} />
          <Pila.Screen name="Auditoria" component={Auditoria} options={{ title: "Auditoría" }} />
          <Pila.Screen name="Notificaciones" component={Notificaciones} options={{ title: "Notificaciones" }} />
          <Pila.Screen name="Perfil" component={Perfil} options={{ title: "Mi perfil" }} />
          <Pila.Screen name="Escanear" component={Escanear} options={{ title: "Escanear QR" }} />
          <Pila.Screen name="QrDetalle" component={QrDetalle} options={{ title: "Código QR" }} />
          <Pila.Screen name="MisQrs" component={MisQrs} options={{ title: "Mis códigos QR" }} />
          <Pila.Screen name="GenerarQr" component={GenerarQr} options={{ title: "Nuevo código QR" }} />
        </>
      ) : (
        <Pila.Screen name="Login" component={Login} options={{ headerShown: false }} />
      )}
    </Pila.Navigator>
  );
}

export default function App() {
  return (
    <SesionProveedor>
      <StatusBar style="light" />
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>
    </SesionProveedor>
  );
}
