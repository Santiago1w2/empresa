import React, { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Pantalla, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { fmtFechaHora } from "../util";

const NOMBRE_CAT = { ACADEMICO: "Académico", COMPORTAMIENTO: "Comportamiento", ADMINISTRATIVO: "Administrativo", EVENTO: "Evento", GENERAL: "General" };

export default function AnuncioDetalle({ navigation, route }) {
  const { id } = route.params;
  const { usuario } = useSesion();
  const [a, setA] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const datos = await api("/anuncios/" + id);
      setA(datos);
      if (!datos.leido) {
        await api("/anuncios/" + id + "/leer", { metodo: "POST", cuerpo: {} }).catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const votar = async (opcion) => {
    try {
      await api("/anuncios/" + id + "/leer", { metodo: "POST", cuerpo: { voto: opcion } });
      Alert.alert("Gracias", "Voto registrado");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (error) return <Pantalla><Encabezado titulo="Anuncio" sub={error} /></Pantalla>;
  if (!a) return <Cargando />;

  const encuesta = a.encuesta;
  const resultados = (encuesta && encuesta.resultados) || {};
  const totalVotos = Object.values(resultados).reduce((s, v) => s + v, 0);

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo={a.titulo} sub={(NOMBRE_CAT[a.categoria] || a.categoria || "") + " · " + (a.creadoPorNombre || "") + " · " + fmtFechaHora(a.creadoEn)} />
      <View style={estilos.tarjeta}>
        <Text style={{ fontSize: 15, color: colores.texto, lineHeight: 22 }}>{a.contenido}</Text>
      </View>
      {encuesta && encuesta.pregunta ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>{encuesta.pregunta}</Text>
          <Text style={estilos.nota}>{encuesta.descripcion || ""}</Text>
          {(encuesta.opciones || []).map((op) => {
            const votos = resultados[op] || 0;
            return (
              <View key={op} style={{ marginTop: 10 }}>
                <Text
                  style={{ color: colores.primario, fontSize: 14, fontWeight: "600" }}
                  onPress={a.miVoto ? undefined : () => votar(op)}
                >
                  {op}
                  {a.miVoto === op ? " (tu voto)" : ""}
                </Text>
                <Text style={estilos.filaDetalle}>
                  {votos} voto(s){totalVotos ? " · " + Math.round((votos * 100) / totalVotos) + "%" : ""}
                </Text>
              </View>
            );
          })}
          <Text style={estilos.nota}>{totalVotos} voto(s) registrados</Text>
        </View>
      ) : null}
      {["ti", "direccion"].includes(usuario.rol) || a.creadoPor === usuario.usuarioId ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Compartir</Text>
          <Text style={estilos.nota}>Genera un código QR para que la comunidad abra este anuncio al escanearlo.</Text>
          <Text
            style={{ color: colores.primario, fontWeight: "600", fontSize: 13, marginTop: 8 }}
            onPress={() => navigation.navigate("GenerarQr", { tipo: "anuncio", refId: id, titulo: a.titulo })}
          >
            Compartir con código QR
          </Text>
        </View>
      ) : null}
    </Pantalla>
  );
}
