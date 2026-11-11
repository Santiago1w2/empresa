import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api, valorQr } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { fmtFecha } from "../util";

const NOMBRE_TIPO = { evento: "Actividad", anuncio: "Anuncio", documento: "Material" };

export default function MisQrs({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [mostrando, setMostrando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/qrs"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <Pantalla><Encabezado titulo="Mis códigos QR" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Mis códigos QR" sub="Toca un código para mostrarlo en pantalla" />
      {items.length === 0 ? (
        <Vacio mensaje="Aún no has generado códigos QR" />
      ) : (
        items.map((q) => (
          <FilaLista key={q.codigo} alPresionar={() => setMostrando(q)}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{q.titulo || "(sin título)"}</Text>
              <Text style={estilos.filaDetalle}>
                {NOMBRE_TIPO[q.tipo]} · {q.usos || 0} apertura(s)
                {q.tipo === "evento" ? " · " + (q.asistencias || []).length + " asistencia(s)" : ""}
                {q.expiraEn ? " · expira " + fmtFecha(q.expiraEn) : ""}
              </Text>
              <Text style={[estilos.filaDetalle, { fontFamily: "monospace" }]}>{q.codigo}</Text>
            </View>
          </FilaLista>
        ))
      )}
      <Modal visible={!!mostrando} transparent animationType="fade" onRequestClose={() => setMostrando(null)}>
        <Pressable style={estilosQr.fondo} onPress={() => setMostrando(null)}>
          <View style={estilosQr.caja}>
            <Text style={estilosQr.titulo}>{(mostrando && mostrando.titulo) || ""}</Text>
            <View style={estilosQr.marco}>
              {mostrando ? <QRCode value={valorQr(mostrando.codigo)} size={220} color={colores.texto} backgroundColor="#fff" /> : null}
            </View>
            <Text style={estilosQr.codigo}>{mostrando ? mostrando.codigo : ""}</Text>
            <Text style={estilosQr.nota}>Toca cualquier parte para cerrar</Text>
            <Pressable
              style={[estilos.botonChico, { marginTop: 12, alignSelf: "center" }]}
              onPress={() => {
                const codigo = mostrando && mostrando.codigo;
                setMostrando(null);
                navigation.navigate("QrDetalle", { codigo });
              }}
            >
              <Text style={estilos.botonChicoTexto}>Abrir como si escaneara</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Pantalla>
  );
}

const estilosQr = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  caja: { backgroundColor: "#fff", borderRadius: 18, padding: 22, alignItems: "center", width: "86%" },
  titulo: { fontSize: 16, fontWeight: "700", color: colores.texto, marginBottom: 12, textAlign: "center" },
  marco: { backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  codigo: { fontFamily: "monospace", fontSize: 15, letterSpacing: 1, color: colores.texto, marginTop: 10 },
  nota: { fontSize: 12, color: colores.textoSuave, marginTop: 6 },
});
