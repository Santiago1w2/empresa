import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Pantalla, colores, estilos } from "../componentes/basicos";
import { nombreEstado, nombreRol } from "../util";

const etiqueta = (k) =>
  k.includes("_") && nombreEstado(k) !== k ? nombreEstado(k) : nombreRol(k) !== k ? nombreRol(k) : k;

export default function Indicadores() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/indicadores"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Indicadores" sub={error} /></Pantalla>;
  if (!datos) return <Cargando />;

  const kpis = [
    { valor: datos.totalSolicitudes, texto: "solicitudes" },
    { valor: datos.tiempoPromedioRespuestaDias, texto: "días promedio de respuesta" },
    { valor: datos.vencidas, texto: "fuera de plazo (SLA)", alerta: datos.vencidas > 0 },
    { valor: (datos.tasaLecturaAnuncios || 0) + "%", texto: "lectura de anuncios" },
  ];

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Indicadores" sub="Tablero institucional en tiempo real" />
      <View style={estilos.kpis}>
        {kpis.map((k, i) => (
          <View style={estilos.kpi} key={i}>
            <Text style={[estilos.kpiValor, k.alerta && { color: colores.peligro }]}>{k.valor}</Text>
            <Text style={estilos.kpiTexto}>{k.texto}</Text>
          </View>
        ))}
      </View>
      {(datos.proyectosEnRiesgo || []).length > 0 ? (
        <View style={[estilos.tarjeta, { borderColor: colores.alerta }]}>
          <Text style={[estilos.filaTitulo, { color: colores.alerta }]}>Proyectos sin movimientos (más de 30 días)</Text>
          {datos.proyectosEnRiesgo.map((n, i) => (
            <Text style={estilos.nota} key={i}>
              {n}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Solicitudes por estado</Text>
        {Object.entries(datos.solicitudesPorEstado || {}).map(([k, v]) => (
          <Text style={estilos.nota} key={k}>
            {etiqueta(k)}: {v}
          </Text>
        ))}
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Tiempo promedio por rol (días)</Text>
        {Object.keys(datos.tiempoPromedioPorRolDias || {}).length === 0 ? (
          <Text style={estilos.nota}>Sin decisiones registradas aún</Text>
        ) : (
          Object.entries(datos.tiempoPromedioPorRolDias).map(([r, v]) => (
            <Text style={estilos.nota} key={r}>
              {nombreRol(r)}: {v}
            </Text>
          ))
        )}
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Comunidad por rol</Text>
        {Object.entries(datos.usuariosPorRol || {}).map(([k, v]) => (
          <Text style={estilos.nota} key={k}>
            {etiqueta(k)}: {v}
          </Text>
        ))}
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Participación por nivel</Text>
        {Object.entries(datos.participacionPorNivel || {}).map(([k, v]) => (
          <Text style={estilos.nota} key={k}>
            {etiqueta(k)}: {v}
          </Text>
        ))}
      </View>
      {(datos.detalleLecturas || []).length > 0 ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Confirmación de lectura de anuncios</Text>
          {datos.detalleLecturas.map((d, i) => (
            <Text style={estilos.nota} key={i}>
              {d.anuncio}: {d.leidos}/{d.total} ({d.tasa}%)
            </Text>
          ))}
        </View>
      ) : null}
    </Pantalla>
  );
}
