import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, Vacio, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { fmtFecha, nombreEstado, nombreRol } from "../util";

const ESTADOS = ["", "EN_REVISION", "OBSERVADA", "APROBADA", "APROBADA_CONDICIONES", "EN_AUTORIZACION_PADRES", "RECHAZADA", "EN_EJECUCION", "FINALIZADA", "ARCHIVADA"];

export default function Solicitudes({ navigation, route }) {
  const { usuario } = useSesion();
  const bandeja = !!route.params?.bandeja;
  const [datos, setDatos] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(bandeja ? await api("/solicitudes?bandeja=1") : await api("/solicitudes"));
    } catch (e) {
      setError(e.message);
    }
  }, [bandeja]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo={bandeja ? "Por revisar" : "Solicitudes"} sub={error} /></Pantalla>;
  if (!datos) return <Cargando />;

  const puedeCrear = ["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(usuario.rol);
  const items = filtro ? datos.filter((s) => s.estado === filtro) : datos;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado
        titulo={bandeja ? "Por revisar" : "Solicitudes"}
        acciones={
          puedeCrear && !bandeja ? (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13.5 }} onPress={() => navigation.navigate("SolicitudNueva")}>
              + Nueva
            </Text>
          ) : null
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          {ESTADOS.map((e) => (
            <Text
              key={e}
              style={[estilos.chipTexto, filtro === e ? { color: "#2563eb", fontWeight: "700" } : null]}
              onPress={() => setFiltro(e)}
            >
              {e ? nombreEstado(e) : "Todas"}
            </Text>
          ))}
        </View>
      </ScrollView>
      {items.length === 0 ? (
        <Vacio mensaje={bandeja ? "No tienes solicitudes pendientes de revisión" : "No hay solicitudes para mostrar"} />
      ) : (
        items.map((s) => (
          <FilaLista key={s.solicitudId} alPresionar={() => navigation.navigate("SolicitudDetalle", { id: s.solicitudId })}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{s.titulo}</Text>
              <Text style={estilos.filaDetalle}>
                {s.tipoNombre || ""} · {s.solicitanteNombre || ""}
                {s.fecha ? " · " + fmtFecha(s.fecha) : ""}
              </Text>
              {s.estado === "EN_REVISION" && s.revisorActualRol ? (
                <Text style={estilos.filaDetalle}>{nombreRol(s.revisorActualRol)} revisa ahora</Text>
              ) : null}
            </View>
            <Estado estado={s.estado} />
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
