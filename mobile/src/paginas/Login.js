import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Boton, colores, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";

export default function Login() {
  const { entrar } = useSesion();
  const [registro, setRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "", email: "", clave: "", rol: "estudiante", nivel: "", grado: "", seccion: "",
  });
  const set = (campo) => (v) => setForm({ ...form, [campo]: v });

  const entrarApp = async () => {
    setError("");
    setCargando(true);
    try {
      const datos = registro
        ? await api("/auth/registrar", { metodo: "POST", cuerpo: form })
        : await api("/auth/login", { metodo: "POST", cuerpo: { email: form.email, clave: form.clave } });
      entrar(datos.token, datos.usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={estilosLogin.fondo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={estilosLogin.caja}>
        <View style={estilosLogin.marca}>
          <View style={estilosLogin.circulo}>
            <Text style={estilosLogin.circuloTexto}>SA</Text>
          </View>
          <Text style={estilosLogin.titulo}>Santa Anita Conecta</Text>
          <Text style={estilosLogin.sub}>La plataforma oficial del colegio</Text>
        </View>
        {error ? <Text style={estilosLogin.error}>{error}</Text> : null}
        {registro ? (
          <>
            <TextInput style={estilos.entrada} placeholder="Nombre completo" value={form.nombre} onChangeText={set("nombre")} />
            <TextInput style={estilos.entrada} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set("email")} />
            <TextInput style={estilos.entrada} placeholder="Clave (mínimo 6)" secureTextEntry value={form.clave} onChangeText={set("clave")} />
            <View style={[estilos.fila, { marginBottom: 12 }]}>
              <Boton
                titulo={form.rol === "estudiante" ? "Estudiante" : "Docente"}
                chico
                estilo={{ flex: 1 }}
                alPresionar={() => set("rol")(form.rol === "estudiante" ? "docente" : "estudiante")}
              />
              <Boton
                titulo={form.nivel || "Nivel"}
                chico
                estilo={{ flex: 1 }}
                alPresionar={() => set("nivel")(form.nivel === "Primaria" ? "Secundaria" : "Primaria")}
              />
            </View>
            <View style={[estilos.fila, { marginBottom: 12 }]}>
              <TextInput style={[estilos.entrada, { flex: 1 }]} placeholder="Grado (5°)" value={form.grado} onChangeText={set("grado")} />
              <TextInput style={[estilos.entrada, { flex: 1 }]} placeholder="Sección (A)" value={form.seccion} onChangeText={set("seccion")} />
            </View>
          </>
        ) : (
          <>
            <TextInput
              style={estilos.entrada}
              placeholder="Correo"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={set("email")}
            />
            <TextInput style={estilos.entrada} placeholder="Clave" secureTextEntry value={form.clave} onChangeText={set("clave")} />
          </>
        )}
        <Boton titulo={cargando ? "Un momento…" : registro ? "Crear cuenta" : "Ingresar"} primario deshabilitado={cargando} alPresionar={entrarApp} />
        <Boton titulo={registro ? "Ya tengo cuenta" : "Regístrate (estudiante o docente)"} estilo={{ marginTop: 10 }} alPresionar={() => setRegistro(!registro)} />
        {!registro ? (
          <Text style={estilosLogin.demo}>
            Cuentas demo (clave demo1234):{"\n"}omar@santaanita.edu.pe (estudiante){"\n"}lucia@santaanita.edu.pe (docente){"\n"}ti@santaanita.edu.pe (admin TI)
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilosLogin = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  caja: { padding: 24, justifyContent: "center", flexGrow: 1 },
  marca: { alignItems: "center", marginBottom: 28 },
  circulo: { width: 74, height: 74, borderRadius: 22, backgroundColor: colores.primario, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  circuloTexto: { color: "#fff", fontSize: 26, fontWeight: "800" },
  titulo: { fontSize: 24, fontWeight: "800", color: colores.texto },
  sub: { fontSize: 13.5, color: colores.textoSuave, marginTop: 2 },
  error: { color: colores.peligro, textAlign: "center", marginBottom: 12, fontSize: 13.5 },
  demo: { fontSize: 12, color: colores.textoSuave, textAlign: "center", marginTop: 18, lineHeight: 18 },
});
