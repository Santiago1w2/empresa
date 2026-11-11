import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { CAPAS, MESES_LARGOS, fmtFecha, hoyISO, isoDe, nombreCapa } from "../util";

export default function Calendario({ navigation }) {
  const { usuario } = useSesion();
  const hoy = new Date();
  const [mes, setMes] = useState({ a: hoy.getFullYear(), m: hoy.getMonth() });
  const [items, setItems] = useState(null);
  const [capa, setCapa] = useState("");
  const [error, setError] = useState("");

  const desde = useMemo(() => isoDe(new Date(mes.a, mes.m, 1)), [mes]);
  const hasta = useMemo(() => isoDe(new Date(mes.a, mes.m + 1, 0)), [mes]);

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/eventos?desde=" + desde + "&hasta=" + hasta + "&capas=" + CAPAS.join(",")));
    } catch (e) {
      setError(e.message);
    }
  }, [desde, hasta]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const moverMes = (delta) =>
    setMes((x) => {
      const d = new Date(x.a, x.m + delta, 1);
      return { a: d.getFullYear(), m: d.getMonth() };
    });

  if (error) return <Pantalla><Encabezado titulo="Calendario" sub={error} /></Pantalla>;

  const filtrados = items ? (capa ? items.filter((e) => e.tipo === capa) : items) : null;
  const hoyStr = hoyISO();
  const puedeCrear = ["docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol);

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado
        titulo="Calendario"
        sub={MESES_LARGOS[mes.m] + " " + mes.a}
        acciones={
          puedeCrear ? (
            <Text style={{ color: "#2563eb", fontWeight: "600", fontSize: 13.5 }} onPress={() => navigation.navigate("EventoNuevo", { fecha: desde })}>
              + Evento
            </Text>
          ) : null
        }
      />
      <View style={[estilos.fila, { justifyContent: "space-between", marginBottom: 10 }]}>
        <Text style={estilos.chipTexto} onPress={() => moverMes(-1)}>
          Mes anterior
        </Text>
        <Text style={estilos.chipTexto} onPress={() => setMes({ a: hoy.getFullYear(), m: hoy.getMonth() })}>
          Hoy
        </Text>
        <Text style={estilos.chipTexto} onPress={() => moverMes(1)}>
          Mes siguiente
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          <Text style={[estilos.chipTexto, capa === "" ? { color: colores.primario, fontWeight: "700" } : null]} onPress={() => setCapa("")}>
            Todas
          </Text>
          {CAPAS.map((c) => (
            <Text key={c} style={[estilos.chipTexto, capa === c ? { color: colores.primario, fontWeight: "700" } : null]} onPress={() => setCapa(c)}>
              {nombreCapa(c)}
            </Text>
          ))}
        </View>
      </ScrollView>
      {!filtrados ? (
        <Cargando />
      ) : filtrados.length === 0 ? (
        <Vacio mensaje="No hay eventos este mes" />
      ) : (
        filtrados.map((e) => (
          <FilaLista key={e.eventoId}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{e.titulo}</Text>
              <Text style={estilos.filaDetalle}>
                {fmtFecha(e.fecha)}
                {e.horaInicio ? " · " + e.horaInicio + (e.horaFin ? "–" + e.horaFin : "") : ""}
              </Text>
              <Text style={[estilos.filaDetalle, e.fecha === hoyStr ? { color: colores.alerta, fontWeight: "600" } : null]}>
                {nombreCapa(e.tipo)}
                {e.creadoPorNombre ? " · " + e.creadoPorNombre : ""}
                {e.fecha === hoyStr ? " · HOY" : ""}
              </Text>
              {e.descripcion ? <Text style={estilos.nota} numberOfLines={2}>{e.descripcion}</Text> : null}
              {puedeCrear ? (
                <Text
                  style={{ color: colores.primario, fontSize: 12.5, fontWeight: "600", marginTop: 6 }}
                  onPress={() => navigation.navigate("GenerarQr", { tipo: "evento", refId: e.eventoId, titulo: e.titulo })}
                >
                  Compartir con QR
                </Text>
              ) : null}
            </View>
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
