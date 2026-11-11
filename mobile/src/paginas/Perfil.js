import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { api } from "../api";
import { Boton, Encabezado, Pantalla, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { nombreRol } from "../util";

export default function Perfil() {
  const { usuario, salir } = useSesion();
  const [insignias, setInsignias] = useState(0);
  const [finalizadas, setFinalizadas] = useState(0);
  const [directorios, setDirectorios] = useState(null);
  const [consentimiento, setConsentimiento] = useState(!!usuario.consentimientoDatos);

  const cargar = useCallback(async () => {
    try {
      const solicitudes = await api("/solicitudes");
      setFinalizadas(solicitudes.filter((s) => s.estado === "FINALIZADA" || s.estado === "ARCHIVADA").length);
      const proyectos = await api("/proyectos");
      setInsignias(
        proyectos.filter((p) => (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId) && p.estado === "FINALIZADA").length
      );
    } catch (e) {}
    try {
      const usuarios = await api("/usuarios");
      const grupos = {};
      usuarios.forEach((x) => {
        if (["docente", "coordinacion", "direccion", "administracion"].includes(x.rol)) {
          grupos[x.rol] = grupos[x.rol] || [];
          grupos[x.rol].push(x);
        }
      });
      setDirectorios(grupos);
    } catch (e) {}
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const guardar = async () => {
    try {
      await api("/usuarios/" + usuario.usuarioId, { metodo: "PUT", cuerpo: { consentimientoDatos: consentimiento } });
      Alert.alert("Listo", "Preferencias guardadas");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const exportar = async () => {
    try {
      await Share.share({ title: "Mis datos", message: JSON.stringify(usuario, null, 2) });
    } catch (e) {}
  };

  return (
    <Pantalla>
      <Encabezado titulo={usuario.nombre} sub={nombreRol(usuario.rol)} />
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Datos</Text>
        <Text style={estilos.filaDetalle}>Correo: {usuario.email || usuario.correo || "—"}</Text>
        {usuario.nivel ? (
          <Text style={estilos.filaDetalle}>
            {usuario.nivel + " " + (usuario.grado || "") + (usuario.seccion || "")}
          </Text>
        ) : null}
        <Text style={estilos.nota}>
          Insignias ganadas: {insignias} · Actividades finalizadas: {finalizadas}
        </Text>
        <Boton titulo="Cerrar sesión" primario estilo={{ marginTop: 12 }} alPresionar={salir} />
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Preferencias</Text>
        <Text style={[estilos.fila, { marginTop: 8, justifyContent: "space-between" }]}>
          <Text style={estilos.filaDetalle}>Consentimiento de datos (Ley 29733)</Text>
          <Text style={{ color: "#2563eb", fontWeight: "600", fontSize: 13 }} onPress={() => setConsentimiento(!consentimiento)}>
            {consentimiento ? "Sí" : "No"}
          </Text>
        </Text>
        <Text style={estilos.nota}>El tema oscuro y el tamaño de letra se ajustan en tu dispositivo.</Text>
        <Boton titulo="Guardar preferencias" chico estilo={{ marginTop: 10, alignSelf: "flex-start" }} alPresionar={guardar} />
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Mis datos (derechos ARCO)</Text>
        <Text style={estilos.nota}>Puedes revisar y exportar la información que la plataforma guarda sobre ti.</Text>
        <Boton titulo="Exportar mis datos" chico estilo={{ marginTop: 10, alignSelf: "flex-start" }} alPresionar={exportar} />
      </View>
      {directorios ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>¿A quién acudo?</Text>
          {Object.entries(directorios).map(([rol, lista]) => (
            <View key={rol} style={{ marginTop: 6 }}>
              <Text style={estilos.filaTitulo}>{nombreRol(rol)}</Text>
              <Text style={estilos.filaDetalle}>{lista.map((x) => x.nombre).join(", ")}</Text>
            </View>
          ))}
          <Text style={estilos.nota}>
            Solicitudes: docente asesor y revisores · Logística: Administración · Permisos y salidas: Coordinación · Aprobación final: Dirección
          </Text>
        </View>
      ) : null}
      <Text style={[estilos.nota, { textAlign: "center" }]}>
        Santa Anita Conecta · app móvil v1{"\n"}Adjuntos y evidencias se gestionan desde la versión web.
      </Text>
    </Pantalla>
  );
}
