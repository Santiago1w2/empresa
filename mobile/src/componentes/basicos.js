import React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

export const colores = {
  primario: "#2563eb",
  fondo: "#eef2f7",
  superficie: "#ffffff",
  borde: "#dbe2ea",
  texto: "#1f2937",
  textoSuave: "#6b7280",
  exito: "#16a34a",
  alerta: "#d97706",
  peligro: "#dc2626",
};

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: "700", color: colores.texto, marginBottom: 4 },
  subtitulo: { fontSize: 13, color: colores.textoSuave, marginBottom: 14 },
  tarjeta: { backgroundColor: colores.superficie, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colores.borde },
  fila: { flexDirection: "row", alignItems: "center", gap: 10 },
  filaLista: { backgroundColor: colores.superficie, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colores.borde },
  filaPrincipal: { flex: 1 },
  filaTitulo: { fontSize: 15, fontWeight: "600", color: colores.texto },
  filaDetalle: { fontSize: 12.5, color: colores.textoSuave, marginTop: 2 },
  nota: { fontSize: 12.5, color: colores.textoSuave, marginTop: 6 },
  etiquetaEstado: { fontSize: 11, fontWeight: "700", color: "#fff", backgroundColor: colores.primario, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  campo: { marginBottom: 12 },
  campoTexto: { fontSize: 12.5, color: colores.textoSuave, marginBottom: 4 },
  entrada: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 10, fontSize: 15, color: colores.texto },
  boton: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" },
  botonPrimario: { backgroundColor: colores.primario, borderWidth: 0, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  botonTexto: { color: colores.primario, fontWeight: "600", fontSize: 14 },
  botonPrimarioTexto: { color: "#fff", fontWeight: "600", fontSize: 14 },
  botonChico: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colores.borde, backgroundColor: "#f8fafc" },
  botonChicoTexto: { fontSize: 12.5, color: colores.primario, fontWeight: "600" },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colores.borde, backgroundColor: "#f8fafc" },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipTexto: { fontSize: 12.5, color: colores.texto },
  chipActivoTexto: { color: "#fff", fontWeight: "600" },
  vacio: { alignItems: "center", padding: 30 },
  vacioTexto: { color: colores.textoSuave, fontSize: 14, textAlign: "center" },
  centrar: { flex: 1, justifyContent: "center", alignItems: "center" },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { flexBasis: "47%", flexGrow: 1, backgroundColor: colores.superficie, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colores.borde },
  kpiValor: { fontSize: 22, fontWeight: "700", color: colores.primario },
  kpiTexto: { fontSize: 12, color: colores.textoSuave, marginTop: 2 },
  mensajeBurbuja: { backgroundColor: colores.superficie, borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: "85%", alignSelf: "flex-start", borderWidth: 1, borderColor: colores.borde },
  mensajePropio: { alignSelf: "flex-end", backgroundColor: "#dbeafe", borderColor: "#bfdbfe" },
});

export function Pantalla({ children, refrescar, refreshing, estilo }) {
  return (
    <View style={[estilos.pantalla, estilo]}>
      <FlatList
        data={[{ clave: "unica" }]}
        keyExtractor={(i) => i.clave}
        renderItem={() => <View style={estilos.contenido}>{children}</View>}
        refreshControl={refrescar ? <RefreshControl refreshing={!!refreshing} onRefresh={refrescar} /> : undefined}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </View>
  );
}

export function Encabezado({ titulo, sub, acciones }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[estilos.fila, { justifyContent: "space-between", alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {sub ? <Text style={[estilos.subtitulo, { marginBottom: 0 }]}>{sub}</Text> : null}
        </View>
        {acciones}
      </View>
    </View>
  );
}

export function FilaLista({ alPresionar, children }) {
  return (
    <Pressable style={({ pressed }) => [estilos.filaLista, pressed && { opacity: 0.6 }]} onPress={alPresionar}>
      <View style={[estilos.fila, { alignItems: "flex-start" }]}>{children}</View>
    </Pressable>
  );
}

export function Estado({ estado, color }) {
  const mapa = {
    EN_REVISION: colores.alerta, OBSERVADA: colores.alerta, EN_AUTORIZACION_PADRES: colores.alerta, PENDIENTE: colores.alerta,
    EN_PAUSA: colores.alerta, APROBADA: colores.exito, APROBADA_CONDICIONES: colores.exito, ACEPTADA: colores.exito,
    ACTIVA: colores.exito, EN_EJECUCION: colores.primario, RECHAZADA: colores.peligro, SIN_RESPONSABLE: colores.peligro,
    FINALIZADA: colores.textoSuave, ARCHIVADA: colores.textoSuave, BORRADOR: colores.textoSuave,
  };
  return (
    <Text style={[estilos.etiquetaEstado, { backgroundColor: color || mapa[estado] || colores.textoSuave }]}>
      {estadoTexto(estado)}
    </Text>
  );
}

function estadoTexto(estado) {
  const N = {
    BORRADOR: "Borrador", EN_REVISION: "En revisión", OBSERVADA: "Observada", APROBADA: "Aprobada",
    APROBADA_CONDICIONES: "Aprob. c/ cond.", EN_AUTORIZACION_PADRES: "Espera padres", RECHAZADA: "Rechazada",
    EN_EJECUCION: "En ejecución", FINALIZADA: "Finalizada", ARCHIVADA: "Archivada", PENDIENTE: "Pendiente",
    ACEPTADA: "Aceptada", ACTIVA: "Activa", EN_PAUSA: "En pausa", SIN_RESPONSABLE: "Sin resp.", POR_HACER: "Por hacer",
    EN_CURSO: "En curso", HECHO: "Hecho",
  };
  return N[estado] || estado;
}

export function Vacio({ mensaje }) {
  return (
    <View style={estilos.vacio}>
      <Text style={estilos.vacioTexto}>{mensaje}</Text>
    </View>
  );
}

export function Cargando() {
  return (
    <View style={estilos.centrar}>
      <ActivityIndicator size="large" color={colores.primario} />
    </View>
  );
}

export function Campo({ etiqueta, children }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.campoTexto}>{etiqueta}</Text>
      {children}
    </View>
  );
}

export function Boton({ titulo, primario, chico, alPresionar, deshabilitado, estilo, textoEstilo }) {
  if (chico) {
    return (
      <Pressable style={({ pressed }) => [estilos.botonChico, pressed && { opacity: 0.6 }, estilo]} disabled={deshabilitado} onPress={alPresionar}>
        <Text style={[estilos.botonChicoTexto, textoEstilo]}>{titulo}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      style={({ pressed }) => [
        primario ? estilos.botonPrimario : estilos.boton,
        pressed && { opacity: 0.7 },
        deshabilitado && { opacity: 0.5 },
        estilo,
      ]}
      disabled={deshabilitado}
      onPress={alPresionar}
    >
      <Text style={primario ? estilos.botonPrimarioTexto : estilos.botonTexto}>{titulo}</Text>
    </Pressable>
  );
}

export function Toast({ mensaje, tipo }) {
  if (!mensaje) return null;
  return (
    <View
      style={{
        position: "absolute",
        bottom: 90,
        left: 20,
        right: 20,
        backgroundColor: tipo === "error" ? colores.peligro : colores.exito,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={{ color: "#fff", textAlign: "center", fontSize: 13.5 }}>{mensaje}</Text>
    </View>
  );
}
