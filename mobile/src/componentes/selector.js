import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colores, estilos } from "./basicos";

export function Selector({ etiqueta, opciones, valor, alCambiar, marcador }) {
  const [abierto, setAbierto] = useState(false);
  const etiquetaDe = (v) => {
    const o = opciones.find((x) => x.valor === v);
    return o ? o.etiqueta : v;
  };
  return (
    <View style={estilos.campo}>
      <Text style={estilos.campoTexto}>{etiqueta}</Text>
      <Pressable style={estilos.entrada} onPress={() => setAbierto(true)}>
        <Text style={{ fontSize: 15, color: valor ? colores.texto : colores.textoSuave }}>
          {valor ? etiquetaDe(valor) : marcador || "Selecciona…"}
        </Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilosModal.fondo} onPress={() => setAbierto(false)}>
          <View style={estilosModal.caja}>
            <FlatList
              data={opciones}
              keyExtractor={(i) => String(i.valor)}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [estilosModal.opcion, pressed && { opacity: 0.6 }]}
                  onPress={() => {
                    alCambiar(item.valor);
                    setAbierto(false);
                  }}
                >
                  <Text style={estilosModal.opcionTexto}>{item.etiqueta}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const estilosModal = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  caja: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", paddingBottom: 20 },
  opcion: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colores.borde },
  opcionTexto: { fontSize: 15, color: colores.texto },
});

export function PromptModal({ visible, titulo, etiqueta, multilinea, alAceptar, alCancelar, valorInicial }) {
  const [valor, setValor] = useState(valorInicial || "");
  useEffect(() => {
    if (visible) setValor(valorInicial || "");
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCancelar}>
      <View style={estilosModal2.fondo}>
        <View style={estilosModal2.caja}>
          <Text style={estilosModal2.titulo}>{titulo}</Text>
          <Text style={estilos.campoTexto}>{etiqueta}</Text>
          <TextInput
            style={estilos.entrada}
            value={valor}
            autoFocus
            multiline={multilinea}
            numberOfLines={multilinea ? 4 : 1}
            onChangeText={setValor}
          />
          <View style={[estilos.fila, { marginTop: 14, justifyContent: "flex-end" }]}>
            <Pressable style={[estilos.boton, { marginRight: 8, paddingVertical: 8 }]} onPress={alCancelar}>
              <Text style={estilos.botonTexto}>Cancelar</Text>
            </Pressable>
            <Pressable style={[estilos.botonPrimario, { paddingVertical: 8 }]} onPress={() => alAceptar(valor)}>
              <Text style={estilos.botonPrimarioTexto}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilosModal2 = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
  caja: { backgroundColor: "#fff", borderRadius: 16, padding: 18 },
  titulo: { fontSize: 17, fontWeight: "700", color: colores.texto, marginBottom: 10 },
});
