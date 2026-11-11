import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, Vacio, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";

export default function Explorar({ navigation }) {
  const { usuario } = useSesion();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/proyectos?explorar=1"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const unirme = async (proyectoId) => {
    try {
      await api("/proyectos/" + proyectoId + "/unirse", { metodo: "POST", cuerpo: {} });
      Alert.alert("Listo", "Te uniste al proyecto");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (error) return <Pantalla><Encabezado titulo="Explorar" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo="Explorar" sub="Proyectos activos que aceptan nuevos miembros" />
      {items.length === 0 ? (
        <Vacio mensaje="No hay iniciativas abiertas por ahora. Puedes proponer la tuya." />
      ) : (
        items.map((p) => {
          const miembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
          return (
            <FilaLista key={p.proyectoId} alPresionar={() => navigation.navigate("ProyectoDetalle", { id: p.proyectoId })}>
              <View style={estilos.filaPrincipal}>
                <Text style={estilos.filaTitulo}>{p.nombre}</Text>
                <Text style={estilos.nota} numberOfLines={2}>{p.descripcion || p.objetivo || ""}</Text>
                <Text style={estilos.filaDetalle}>
                  Lidera: {p.responsableNombre || "—"}
                  {p.docenteAsesorId ? " · Con asesoría docente" : ""}
                </Text>
                {usuario.rol === "estudiante" && !miembro ? (
                  <Text style={{ color: "#2563eb", fontSize: 12.5, fontWeight: "600", marginTop: 6 }} onPress={() => unirme(p.proyectoId)}>
                    Unirme
                  </Text>
                ) : null}
              </View>
              <Estado estado={p.estado} />
            </FilaLista>
          );
        })
      )}
    </Pantalla>
  );
}
