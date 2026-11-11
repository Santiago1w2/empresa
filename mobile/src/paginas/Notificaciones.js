import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { fmtFechaHora } from "../util";

export default function Notificaciones({ navigation }) {
  const { refrescarCampana } = useSesion();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/notificaciones"));
      if (refrescarCampana) await refrescarCampana();
    } catch (e) {
      setError(e.message);
    }
  }, [refrescarCampana]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const marcar = async (id) => {
    try {
      await api("/notificaciones/" + encodeURIComponent(id) + "/leer", { metodo: "PUT" });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const abrir = (n) => {
    marcar(n.creadoEn__id);
    if (n.enlace) {
      const m = String(n.enlace).match(/#\/(qr\/)?([a-z]+)/i);
      if (m && m[2] === "qr") {
        const codigo = String(n.enlace).split("/").pop();
        navigation.navigate("QrDetalle", { codigo });
      } else if (m) {
        const rutas = {
          solicitudes: ["SolicitudDetalle", null],
          proyectos: ["ProyectoDetalle", null],
          anuncios: ["AnuncioDetalle", null],
          autorizaciones: ["Autorizaciones", null],
          mensajes: ["Mensajes", null],
        };
        const destino = rutas[m[2]];
        if (destino) navigation.navigate(destino[0], {});
      }
    }
  };

  if (error) return <Pantalla><Encabezado titulo="Notificaciones" sub={error} /></Pantalla>;
  if (!datos) return <Cargando />;

  const items = datos.notificaciones || [];
  const noLeidas = datos.noLeidas || 0;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Notificaciones" sub={noLeidas > 0 ? noLeidas + " sin leer" : "Todo al día"} />
      {items.length === 0 ? (
        <Vacio mensaje="No tienes notificaciones" />
      ) : (
        items.map((n) => (
          <FilaLista key={n.creadoEn__id} alPresionar={() => abrir(n)}>
            <View style={estilos.filaPrincipal}>
              <Text style={[estilos.filaTitulo, n.leida ? { color: colores.textoSuave } : null]}>{n.titulo || "Notificación"}</Text>
              {n.mensaje ? <Text style={estilos.nota} numberOfLines={2}>{n.mensaje}</Text> : null}
              <Text style={estilos.filaDetalle}>{fmtFechaHora(n.creadoEn__id)}</Text>
            </View>
            {!n.leida ? <Text style={{ color: colores.peligro, fontWeight: "700", fontSize: 12 }}>nueva</Text> : null}
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
