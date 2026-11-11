import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, FilaLista, Pantalla, Vacio, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { nombreEstado } from "../util";

export default function Mensajes({ navigation }) {
  const { usuario } = useSesion();
  const [hilos, setHilos] = useState(null);

  const cargar = useCallback(async () => {
    if (usuario.rol === "padre") {
      setHilos([]);
      return;
    }
    try {
      const [solicitudes, proyectos] = await Promise.all([
        ["estudiante", "docente", "coordinacion", "direccion", "administracion", "ti"].includes(usuario.rol)
          ? api("/solicitudes")
          : Promise.resolve([]),
        api("/proyectos").catch(() => []),
      ]);
      const lista = [];
      solicitudes
        .filter((s) => s.estado !== "BORRADOR")
        .slice(0, 30)
        .forEach((s) =>
          lista.push({
            hilo: "SOL#" + s.solicitudId,
            titulo: s.titulo,
            detalle: nombreEstado(s.estado) + " · " + (s.solicitanteNombre || ""),
          })
        );
      proyectos
        .filter((p) => (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId) || ["ti", "direccion"].includes(usuario.rol))
        .slice(0, 30)
        .forEach((p) =>
          lista.push({
            hilo: "PROY#" + p.proyectoId,
            titulo: p.nombre,
            detalle: nombreEstado(p.estado) + " · " + (p.responsableNombre || ""),
          })
        );
      setHilos(lista);
    } catch (e) {
      setHilos([]);
    }
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (!hilos) return <Cargando />;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Consultas" sub="Hilos de solicitudes y proyectos" />
      {usuario.rol === "padre" ? (
        <Vacio mensaje="Las consultas se abren desde una solicitud o un proyecto. No tienes hilos activos." />
      ) : hilos.length === 0 ? (
        <Vacio mensaje="No tienes hilos de consulta. Se abren desde una solicitud o un proyecto." />
      ) : (
        hilos.map((h) => (
          <FilaLista key={h.hilo} alPresionar={() => navigation.navigate("MensajeHilo", { hilo: h.hilo })}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>{h.titulo}</Text>
              <Text style={estilos.filaDetalle}>{h.detalle}</Text>
            </View>
            <Text style={{ color: "#2563eb", fontSize: 12.5, fontWeight: "600" }}>Abrir</Text>
          </FilaLista>
        ))
      )}
    </Pantalla>
  );
}
