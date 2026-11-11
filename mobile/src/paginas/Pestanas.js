import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Text, View } from "react-native";
import { useSesion } from "../contexto/Sesion";
import { MENUS } from "../util";
import Inicio from "./Inicio";
import Solicitudes from "./Solicitudes";
import Proyectos from "./Proyectos";
import Anuncios from "./Anuncios";
import Calendario from "./Calendario";
import Autorizaciones from "./Autorizaciones";
import Indicadores from "./Indicadores";
import Perfil from "./Perfil";
import QrHub from "./QrHub";

const PestanasNav = createBottomTabNavigator();

const PANTALLAS = {
  inicio: { pantalla: Inicio, icono: "C" },
  solicitudes: { pantalla: Solicitudes, icono: "S", props: {} },
  bandeja: { pantalla: Solicitudes, icono: "R", props: { bandeja: true } },
  proyectos: { pantalla: Proyectos, icono: "P" },
  anuncios: { pantalla: Anuncios, icono: "A" },
  calendario: { pantalla: Calendario, icono: "K" },
  autorizaciones: { pantalla: Autorizaciones, icono: "F" },
  indicadores: { pantalla: Indicadores, icono: "I" },
  qrs: { pantalla: QrHub, icono: "Q" },
  perfil: { pantalla: Perfil, icono: "@" },
};

const TEXTOS = {
  inicio: "Inicio", solicitudes: "Solicitudes", bandeja: "Revisar", proyectos: "Proyectos",
  anuncios: "Anuncios", calendario: "Agenda", autorizaciones: "Firmas", indicadores: "Datos",
  qrs: "QR", perfil: "Perfil",
};

function IconoPestana({ letra, color, enfocado }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: enfocado ? "#2563eb" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: enfocado ? "#fff" : color, fontSize: 13, fontWeight: "700" }}>{letra}</Text>
    </View>
  );
}

export default function Pestanas() {
  const { usuario } = useSesion();
  const menu = MENUS[usuario.rol] || MENUS.estudiante;
  const claves = [];
  menu.forEach((c) => {
    if (!claves.includes(c) && c !== "explorar" && c !== "documentos" && c !== "usuarios" && c !== "auditoria" && c !== "mensajes") claves.push(c);
  });
  if (!claves.includes("qrs")) claves.push("qrs");
  if (!claves.includes("perfil")) claves.push("perfil");
  const visibles = claves.slice(0, 5);

  return (
    <PestanasNav.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#2563eb" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarIcon: ({ color, focused }) => (
          <IconoPestana letra={(PANTALLAS[route.name] || {}).icono || "?"} color={color} enfocado={focused} />
        ),
      })}
    >
      {visibles.map((clave) => (
        <PestanasNav.Screen
          key={clave}
          name={clave}
          component={PANTALLAS[clave].pantalla}
          initialParams={PANTALLAS[clave].props}
          options={{ title: TEXTOS[clave] || clave }}
        />
      ))}
    </PestanasNav.Navigator>
  );
}
