import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, Vacio, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { NOMBRES_ROL, nombreRol } from "../util";

export default function Usuarios() {
  const { usuario } = useSesion();
  const [items, setItems] = useState(null);
  const [rol, setRol] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/usuarios"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Usuarios" sub={error} /></Pantalla>;
  if (!items) return <Cargando />;

  const filtrados = items.filter((u) => !rol || u.rol === rol);

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado
        titulo="Usuarios"
        sub={items.length + " registrados · " + items.filter((u) => u.activo === false).length + " desactivados"}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[estilos.fila, { gap: 6 }]}>
          <Text style={[estilos.chipTexto, rol === "" ? { color: colores.primario, fontWeight: "700" } : null]} onPress={() => setRol("")}>
            Todos
          </Text>
          {Object.keys(NOMBRES_ROL).map((r) => (
            <Text key={r} style={[estilos.chipTexto, rol === r ? { color: colores.primario, fontWeight: "700" } : null]} onPress={() => setRol(r)}>
              {NOMBRES_ROL[r]}
            </Text>
          ))}
        </View>
      </ScrollView>
      {filtrados.length === 0 ? (
        <Vacio mensaje="No hay usuarios en este rol" />
      ) : (
        filtrados.map((u) => (
          <FilaLista key={u.usuarioId}>
            <View style={estilos.filaPrincipal}>
              <Text style={estilos.filaTitulo}>
                {u.nombre}
                {u.activo === false ? " (desactivado)" : ""}
              </Text>
              <Text style={estilos.filaDetalle}>
                {(u.email || "") + " · " + nombreRol(u.rol)}
              </Text>
              {u.nivel ? (
                <Text style={estilos.filaDetalle}>{u.nivel + " " + (u.grado || "") + (u.seccion || "")}</Text>
              ) : null}
              {u.rol === "padre" && (u.hijos || []).length > 0 ? (
                <Text style={estilos.filaDetalle}>Hijos vinculados: {(u.hijos || []).length}</Text>
              ) : null}
            </View>
            {u.usuarioId === usuario.usuarioId ? <Estado estado="ACTIVA" /> : null}
          </FilaLista>
        ))
      )}
      <Text style={[estilos.nota, { textAlign: "center" }]}>
        La creación y edición de usuarios se realiza desde la versión web.
      </Text>
    </Pantalla>
  );
}
