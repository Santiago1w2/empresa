import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Boton, Cargando, Encabezado, Pantalla, estilos } from "../componentes/basicos";
import { Selector } from "../componentes/selector";
import { useSesion } from "../contexto/Sesion";
import { CAPAS, nombreCapa } from "../util";

export default function EventoNuevo({ navigation, route }) {
  const { catalogo } = useSesion();
  const [cat, setCat] = useState(null);
  const [estado, setEstado] = useState({
    titulo: "",
    descripcion: "",
    tipo: "ACTIVIDAD",
    fecha: route.params?.fecha || "",
    horaInicio: "",
    horaFin: "",
    ambienteId: "",
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCat(catalogo || (await api("/catalogos")));
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    };
    cargar();
  }, [catalogo]);

  if (!cat) return <Cargando />;

  const set = (campo, valor) => setEstado((e) => ({ ...e, [campo]: valor }));

  const crear = async () => {
    if (!estado.titulo.trim() || !estado.fecha) {
      Alert.alert("Falta información", "El título y la fecha son obligatorios");
      return;
    }
    setCreando(true);
    try {
      const r = await api("/eventos", { metodo: "POST", cuerpo: estado });
      if (r.conflictos && r.conflictos.length > 0) {
        Alert.alert(
          "Choques detectados",
          "Se guardó el evento, pero choca con: " + r.conflictos.join(" | ")
        );
      } else {
        Alert.alert("Listo", "Evento creado");
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <Pantalla>
      <Encabezado titulo="Nuevo evento" sub="Al guardar se avisa si hay choque de ambiente o con evaluaciones" />
      <View style={estilos.tarjeta}>
        <View style={estilos.campo}>
          <Text style={estilos.campoTexto}>Título</Text>
          <TextInput style={estilos.entrada} value={estado.titulo} onChangeText={(v) => set("titulo", v)} />
        </View>
        <View style={estilos.campo}>
          <Text style={estilos.campoTexto}>Descripción</Text>
          <TextInput style={estilos.entrada} value={estado.descripcion} onChangeText={(v) => set("descripcion", v)} />
        </View>
        <Selector
          etiqueta="Tipo"
          valor={estado.tipo}
          alCambiar={(v) => set("tipo", v)}
          opciones={CAPAS.map((c) => ({ valor: c, etiqueta: nombreCapa(c) }))}
        />
        <View style={estilos.campo}>
          <Text style={estilos.campoTexto}>Fecha (YYYY-MM-DD)</Text>
          <TextInput style={estilos.entrada} value={estado.fecha} onChangeText={(v) => set("fecha", v)} placeholder="2026-05-20" />
        </View>
        <View style={[estilos.fila, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.campoTexto}>De (HH:MM)</Text>
            <TextInput style={estilos.entrada} value={estado.horaInicio} onChangeText={(v) => set("horaInicio", v)} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.campoTexto}>A (HH:MM)</Text>
            <TextInput style={estilos.entrada} value={estado.horaFin} onChangeText={(v) => set("horaFin", v)} placeholder="11:00" />
          </View>
        </View>
        <Selector
          etiqueta="Ambiente (opcional)"
          valor={estado.ambienteId}
          alCambiar={(v) => set("ambienteId", v)}
          marcador="Ninguno"
          opciones={[{ valor: "", etiqueta: "Ninguno" }, ...(cat.ambientes || []).map((a) => ({ valor: a.ambienteId, etiqueta: a.nombre }))]}
        />
        <Boton titulo={creando ? "Guardando…" : "Guardar"} primario deshabilitado={creando} alPresionar={crear} />
      </View>
    </Pantalla>
  );
}
