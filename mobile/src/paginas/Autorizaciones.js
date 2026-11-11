import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, Vacio, estilos } from "../componentes/basicos";
import { PromptModal } from "../componentes/selector";
import { useSesion } from "../contexto/Sesion";
import { fmtFecha, fmtFechaHora } from "../util";

export default function Autorizaciones({ navigation }) {
  const { usuario } = useSesion();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [decidiendo, setDecidiendo] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/autorizaciones"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const confirmar = async (firma) => {
    const d = decidiendo;
    setDecidiendo(null);
    if (!d) return;
    const valor = (firma || "").trim();
    if (!valor) {
      Alert.alert("Falta información", "Escribe tu nombre completo como firma digital");
      return;
    }
    try {
      await api("/autorizaciones/" + d.id + "/decidir", { metodo: "POST", cuerpo: { decision: d.decision, firma: valor } });
      Alert.alert("Listo", d.decision === "aceptar" ? "Autorización aceptada" : "Autorización rechazada");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (error) return <Pantalla><Encabezado titulo="Autorizaciones" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  const esPadre = usuario.rol === "padre";

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Autorizaciones" sub={esPadre ? "Firma digital para actividades de tu hijo(a)" : "Autorizaciones de padres"} />
      {items.length === 0 ? (
        <Vacio mensaje={esPadre ? "No hay autorizaciones pendientes para ti" : "No hay autorizaciones registradas"} />
      ) : (
        items.map((a) => (
          <FilaLista key={a.autorizacionId}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{a.solicitudTitulo}</Text>
              <Text style={estilos.filaDetalle}>
                {a.fecha ? fmtFecha(a.fecha) : ""}
                {a.horaInicio ? " " + a.horaInicio + (a.horaFin ? "–" + a.horaFin : "") : ""}
                {a.lugar ? " · " + a.lugar : ""}
              </Text>
              <Text style={estilos.nota}>Estudiante responsable: {a.responsable || "—"}</Text>
              {!esPadre ? <Text style={estilos.nota}>Apoderado: {a.apoderadoNombre || ""}</Text> : null}
              {a.estado !== "PENDIENTE" ? (
                <Text style={estilos.nota}>
                  {(a.estado === "ACEPTADA" ? "Aceptada" : "Rechazada") + " por " + (a.firma || "") + " · " + fmtFechaHora(a.decididoEn)}
                </Text>
              ) : null}
            </View>
            {esPadre && a.estado === "PENDIENTE" ? (
              <View>
                <Text
                  style={{ color: "#16a34a", fontWeight: "600", fontSize: 12.5, marginBottom: 6 }}
                  onPress={() => setDecidiendo({ decision: "aceptar", id: a.autorizacionId })}
                >
                  Aceptar
                </Text>
                <Text
                  style={{ color: "#dc2626", fontWeight: "600", fontSize: 12.5 }}
                  onPress={() => setDecidiendo({ decision: "rechazar", id: a.autorizacionId })}
                >
                  Rechazar
                </Text>
              </View>
            ) : (
              <Estado estado={a.estado} />
            )}
          </FilaLista>
        ))
      )}
      <PromptModal
        visible={!!decidiendo}
        titulo={decidiendo && decidiendo.decision === "aceptar" ? "Aceptar autorización" : "Rechazar autorización"}
        etiqueta="Firma digital (tu nombre completo)"
        alAceptar={confirmar}
        alCancelar={() => setDecidiendo(null)}
      />
    </Pantalla>
  );
}
