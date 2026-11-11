import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { codigoDesde } from "../api";
import { colores } from "../componentes/basicos";

export default function Escanear({ navigation }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [flash, setFlash] = useState(false);

  if (!permiso) {
    return (
      <View style={estilosEscanear.centrar}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }
  if (!permiso.granted) {
    return (
      <View style={estilosEscanear.sinPermiso}>
        <Text style={estilosEscanear.titulo}>Sin acceso a la cámara</Text>
        <Text style={estilosEscanear.texto}>La cámara se usa solo para escanear los códigos QR del colegio.</Text>
        <TouchableOpacity style={estilosEscanear.boton} onPress={pedirPermiso}>
          <Text style={estilosEscanear.botonTexto}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const alEscanear = ({ data }) => {
    if (escaneado) return;
    const codigo = codigoDesde(data);
    if (!codigo) return;
    setEscaneado(true);
    navigation.replace("QrDetalle", { codigo });
  };

  return (
    <View style={estilosEscanear.pantalla}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={alEscanear}
        enableTorch={flash}
      />
      <View style={estilosEscanear.mascara}>
        <View style={estilosEscanear.marco} />
        <Text style={estilosEscanear.texto}>Apunta al código QR del colegio</Text>
        {escaneado ? <Text style={[estilosEscanear.texto, { marginTop: 8, color: "#a5f3fc" }]}>Abriendo…</Text> : null}
      </View>
      <TouchableOpacity style={estilosEscanear.flash} onPress={() => setFlash(!flash)}>
        <Text style={estilosEscanear.flashTexto}>{flash ? "Luz: sí" : "Luz: no"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={estilosEscanear.cancelar} onPress={() => navigation.goBack()}>
        <Text style={estilosEscanear.flashTexto}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilosEscanear = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#000" },
  centrar: { flex: 1, justifyContent: "center", alignItems: "center" },
  sinPermiso: { flex: 1, backgroundColor: colores.fondo, justifyContent: "center", alignItems: "center", padding: 30 },
  titulo: { fontSize: 18, fontWeight: "700", color: colores.texto, marginBottom: 8 },
  texto: { color: "#e2e8f0", textAlign: "center", fontSize: 13.5 },
  boton: { backgroundColor: colores.primario, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 16 },
  botonTexto: { color: "#fff", fontWeight: "600" },
  mascara: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  marco: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: "#60a5fa",
    borderRadius: 24,
    marginBottom: 18,
    opacity: 0.9,
  },
  flash: { position: "absolute", bottom: 110, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  cancelar: { position: "absolute", top: 60, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  flashTexto: { color: "#fff", fontSize: 13.5, fontWeight: "600" },
});
