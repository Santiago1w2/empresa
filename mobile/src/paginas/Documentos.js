import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, Share, Text, View } from "react-native";
import { api, urlDescarga } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { nombreTipoDoc } from "../util";

const CATEGORIAS = ["", "FORMULARIOS", "PLANTILLAS", "INFORMES", "NORMATIVAS", "OTROS"];

export default function Documentos({ navigation }) {
  const [items, setItems] = useState(null);
  const [categoria, setCategoria] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/documentos"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const descargar = async (d) => {
    try {
      if (d.archivoKey) {
        const url = await urlDescarga(d.archivoKey);
        await Linking.openURL(url);
      } else if (d.contenido) {
        await Share.share({ title: d.nombre, message: d.contenido });
      } else {
        Alert.alert("Sin archivo", "Este documento no tiene archivo asociado");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const compartirQr = (d) => navigation.navigate("GenerarQr", { tipo: "documento", refId: d.documentoId, titulo: d.nombre });

  if (error) return <Pantalla><Encabezado titulo="Documentos" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  const filtrados = categoria ? items.filter((d) => d.categoria === categoria) : items;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Documentos" sub="Plantillas, formularios e informes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          {CATEGORIAS.map((c) => (
            <Text
              key={c}
              style={[estilos.chipTexto, categoria === c ? { color: colores.primario, fontWeight: "700" } : null]}
              onPress={() => setCategoria(c)}
            >
              {c ? c.charAt(0) + c.slice(1).toLowerCase() : "Todas"}
            </Text>
          ))}
        </View>
      </ScrollView>
      {filtrados.length === 0 ? (
        <Vacio mensaje="No hay documentos en esta categoría" />
      ) : (
        filtrados.map((d) => (
          <FilaLista key={d.documentoId}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{d.nombre}</Text>
              <Text style={estilos.filaDetalle}>
                {nombreTipoDoc(d.tipo)}
                {d.categoria ? " · " + d.categoria : ""}
                {d.descripcion ? " · " + d.descripcion : ""}
              </Text>
              <View style={[estilos.fila, { marginTop: 8 }]}>
                <Text style={{ color: colores.primario, fontSize: 12.5, fontWeight: "600" }} onPress={() => descargar(d)}>
                  Descargar
                </Text>
                <Text style={{ color: colores.primario, fontSize: 12.5, fontWeight: "600" }} onPress={() => compartirQr(d)}>
                  Compartir QR
                </Text>
              </View>
            </View>
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
