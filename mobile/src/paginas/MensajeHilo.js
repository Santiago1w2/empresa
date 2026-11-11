import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Cargando, Pantalla, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { fmtFechaHora, nombreRol } from "../util";

export default function MensajeHilo({ route }) {
  const { hilo } = route.params;
  const { usuario } = useSesion();
  const [datos, setDatos] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tituloDe = async () => {
    try {
      if (hilo.startsWith("SOL#")) {
        const d = await api("/solicitudes/" + hilo.slice(4));
        return "Solicitud: " + d.solicitud.titulo;
      }
      if (hilo.startsWith("PROY#")) {
        const d = await api("/proyectos/" + hilo.slice(5));
        return "Proyecto: " + d.proyecto.nombre;
      }
    } catch (e) {}
    return "Hilo " + (hilo || "").slice(0, 12);
  };

  const cargar = useCallback(async () => {
    try {
      const [mensajes, tituloHilo] = await Promise.all([api("/mensajes?hilo=" + encodeURIComponent(hilo)), tituloDe()]);
      setDatos(mensajes);
      setTitulo(tituloHilo);
    } catch (e) {
      setError(e.message);
      setDatos([]);
    }
  }, [hilo]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const enviar = async () => {
    const valor = texto.trim();
    if (!valor) return;
    setEnviando(true);
    try {
      await api("/mensajes", { metodo: "POST", cuerpo: { hiloId: hilo, texto: valor } });
      setTexto("");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!datos) return <Cargando />;

  return (
    <View style={estilos.pantalla}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={[estilos.subtitulo, { marginBottom: 12 }]}>{titulo}</Text>
        {error ? <Text style={[estilos.nota, { color: colores.peligro }]}>{error}</Text> : null}
        {datos.length === 0 ? (
          <Text style={estilos.nota}>Sin mensajes todavía. Escribe la primera consulta.</Text>
        ) : (
          datos.map((m) => {
            const propio = m.autorId === usuario.usuarioId;
            return (
              <View key={m.creadoEn__id} style={[estilos.mensajeBurbuja, propio && estilos.mensajePropio]}>
                <Text style={{ fontSize: 12, color: colores.textoSuave }}>
                  {m.autorNombre} · {nombreRol(m.autorRol)}
                </Text>
                <Text style={{ fontSize: 14.5, color: colores.texto, marginTop: 3 }}>{m.texto}</Text>
                <Text style={{ fontSize: 11, color: colores.textoSuave, marginTop: 3 }}>{fmtFechaHora(m.creadoEn__id)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colores.borde, backgroundColor: colores.superficie }}>
        <TextInput style={estilos.entrada} placeholder="Escribe tu mensaje…" value={texto} onChangeText={setTexto} />
        <Text
          style={{
            marginTop: 8,
            color: texto.trim() && !enviando ? colores.primario : colores.textoSuave,
            fontWeight: "600",
            textAlign: "center",
          }}
          onPress={texto.trim() && !enviando ? enviar : undefined}
        >
          {enviando ? "Enviando…" : "Enviar"}
        </Text>
      </View>
    </View>
  );
}
