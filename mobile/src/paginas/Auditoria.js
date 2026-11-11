import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { NOMBRES_ROL, fmtFechaHora, nombreRol } from "../util";

export default function Auditoria() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/auditoria"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Auditoría" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  const filtrados = q
    ? items.filter((i) =>
        [i.accion, i.entidad, i.entidadId, i.usuarioNombre, i.detalle]
          .filter(Boolean)
          .some((t) => String(t).toLowerCase().includes(q.toLowerCase()))
      )
    : items;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Auditoría" sub={"Registro de acciones del sistema (últimas " + items.length + ")"} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          {[...new Set(items.map((i) => i.entidad).filter(Boolean))].slice(0, 12).map((e) => (
            <Text
              key={e}
              style={[estilos.chipTexto, q === e ? { color: colores.primario, fontWeight: "700" } : null]}
              onPress={() => setQ(q === e ? "" : e)}
            >
              {e}
            </Text>
          ))}
        </View>
      </ScrollView>
      {filtrados.length === 0 ? (
        <Vacio mensaje="Sin registros que coincidan" />
      ) : (
        filtrados.map((i, idx) => (
          <View style={estilos.tarjeta} key={i.creadoEn__id || idx}>
            <Text style={estilos.filaTitulo}>
              {i.accion + " · " + i.entidad}
              {i.entidadId ? " " + String(i.entidadId).slice(0, 10) : ""}
            </Text>
            <Text style={estilos.filaDetalle}>
              {(i.usuarioNombre || "Sistema") + (i.rol ? " · " + nombreRol(i.rol) : "") + " · " + fmtFechaHora(i.creadoEn__id)}
            </Text>
            {i.detalle ? <Text style={estilos.nota} numberOfLines={3}>{i.detalle}</Text> : null}
          </View>
        ))
      )}
    </Pantalla>
  );
}
