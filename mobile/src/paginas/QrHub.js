import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Boton, Encabezado, Pantalla, colores, estilos } from "../componentes/basicos";

export default function QrHub({ navigation }) {
  return (
    <Pantalla>
      <Encabezado titulo="Códigos QR" sub="Entra a actividades, comparte anuncios y materiales" />
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Escanear un código</Text>
        <Text style={estilos.nota}>
          Apunta la cámara al QR del colegio para entrar a una actividad (con registro de asistencia) o abrir un anuncio
          o material compartido.
        </Text>
        <Boton titulo="Escanear con la cámara" primario estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("Escanear")} />
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Mis códigos QR</Text>
        <Text style={estilos.nota}>Los códigos que generaste para compartir y llevar control de asistencias.</Text>
        <Boton titulo="Ver mis códigos" estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("MisQrs")} />
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Generar un código</Text>
        <Text style={estilos.nota}>Crea un QR para una actividad, un anuncio o un material.</Text>
        <Boton titulo="Nuevo código QR" estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("GenerarQr")} />
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>¿Sin cámara?</Text>
        <Text style={estilos.nota}>Puedes escribir el código que aparece debajo de cada QR.</Text>
        <Boton titulo="Abrir por código" estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("QrDetalle", {})} />
      </View>
    </Pantalla>
  );
}
