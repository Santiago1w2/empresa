import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, Vacio, estilos } from "../componentes/basicos";
import { nombreEstado } from "../util";

export default function Proyectos({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/proyectos"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Proyectos" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Proyectos" sub="Actividades aprobadas en ejecución" />
      {items.length === 0 ? (
        <Vacio mensaje="Aún no hay proyectos" />
      ) : (
        items.map((p) => {
          const hitos = p.hitos || [];
          const cumplidos = hitos.filter((h) => h.cumplido).length;
          const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;
          return (
            <FilaLista key={p.proyectoId} alPresionar={() => navigation.navigate("ProyectoDetalle", { id: p.proyectoId })}>
              <View style={estilos.filaPrincipal}>
                <Text style={estilos.filaTitulo}>{p.nombre}</Text>
                <Text style={estilos.filaDetalle}>
                  {(p.categoria || "") + " · Responsable: " + (p.responsableNombre || "—") + " · Equipo: " + (p.equipo || []).length}
                </Text>
                <Text style={estilos.filaDetalle}>Avance {avance}% ({cumplidos}/{hitos.length} hitos)</Text>
              </View>
              <Estado estado={p.estado} />
            </FilaLista>
          );
        })
      )}
    </Pantalla>
  );
}
