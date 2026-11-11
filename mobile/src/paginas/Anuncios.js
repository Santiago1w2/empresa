import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { fmtFechaHora } from "../util";

const CATEGORIAS = ["", "ACADEMICO", "COMPORTAMIENTO", "ADMINISTRATIVO", "EVENTO", "GENERAL"];
const NOMBRE_CAT = { ACADEMICO: "Académico", COMPORTAMIENTO: "Comportamiento", ADMINISTRATIVO: "Administrativo", EVENTO: "Evento", GENERAL: "General" };

export default function Anuncios({ navigation }) {
  const [items, setItems] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/anuncios"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Anuncios" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  let filtrados = items;
  if (filtro === "__no_leidos") filtrados = items.filter((a) => !a.leido);
  else if (filtro) filtrados = items.filter((a) => a.categoria === filtro);

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Anuncios" sub="Comunicados oficiales del colegio" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          <Text
            style={[estilos.chipTexto, filtro === "__no_leidos" ? { color: colores.primario, fontWeight: "700" } : null]}
            onPress={() => setFiltro(filtro === "__no_leidos" ? "" : "__no_leidos")}
          >
            No leídos ({items.filter((a) => !a.leido).length})
          </Text>
          {CATEGORIAS.map((c) => (
            <Text
              key={c}
              style={[estilos.chipTexto, filtro === c ? { color: colores.primario, fontWeight: "700" } : null]}
              onPress={() => setFiltro(c)}
            >
              {c ? NOMBRE_CAT[c] : "Todas"}
            </Text>
          ))}
        </View>
      </ScrollView>
      {filtrados.length === 0 ? (
        <Vacio mensaje={filtro === "__no_leidos" ? "Estás al día: todo leído" : "No hay anuncios para ti"} />
      ) : (
        filtrados.map((a) => (
          <FilaLista key={a.anuncioId} alPresionar={() => navigation.navigate("AnuncioDetalle", { id: a.anuncioId })}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{a.titulo}</Text>
              <Text style={estilos.filaDetalle}>
                {(a.categoria ? NOMBRE_CAT[a.categoria] || a.categoria : "") + " · " + (a.creadoPorNombre || "") + " · " + fmtFechaHora(a.creadoEn)}
              </Text>
              {a.fija ? <Text style={[estilos.filaDetalle, { color: colores.alerta }]}>Fijado</Text> : null}
              {a.encuesta ? <Text style={[estilos.filaDetalle, { color: colores.primario }]}>Incluye encuesta: {a.encuesta.pregunta}</Text> : null}
              {!a.leido ? <Text style={[estilos.filaDetalle, { color: colores.peligro, fontWeight: "600" }]}>Nuevo</Text> : null}
            </View>
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
