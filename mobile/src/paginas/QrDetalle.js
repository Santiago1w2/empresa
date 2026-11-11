import React, { useCallback, useEffect, useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import { api, urlDescarga } from "../api";
import { Boton, Cargando, Encabezado, Pantalla, colores, estilos } from "../componentes/basicos";
import { fmtFecha, fmtFechaHora, nombreTipoDoc } from "../util";

const NOMBRE_TIPO = { evento: "Actividad", anuncio: "Anuncio", documento: "Material" };

export default function QrDetalle({ navigation, route }) {
  const [codigo, setCodigo] = useState(route.params?.codigo || "");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(route.params?.codigo ? "" : "Escribe o escanea un código");
  const [registrando, setRegistrando] = useState(false);

  const cargar = useCallback(async (codigoBuscado) => {
    if (!codigoBuscado) return;
    setError("");
    setDatos(null);
    try {
      setDatos(await api("/qrs/" + codigoBuscado));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (route.params?.codigo) {
      setCodigo(route.params.codigo);
      cargar(route.params.codigo);
    }
  }, [route.params?.codigo, cargar]);

  const abrir = () => cargar(codigo.trim());

  const registrarEntrada = async () => {
    setRegistrando(true);
    try {
      await api("/qrs/" + codigo + "/checkin", { metodo: "POST", cuerpo: {} });
      cargar(codigo);
    } catch (e) {
      setError(e.message);
    } finally {
      setRegistrando(false);
    }
  };

  const descargarDocumento = async () => {
    try {
      const d = datos.destino;
      if (d.archivoKey) {
        const url = await urlDescarga(d.archivoKey);
        await Linking.openURL(url);
      } else {
        setError("Las plantillas de texto se descargan desde la versión web");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <Pantalla>
        <Encabezado titulo="Abrir código QR" />
        <View style={estilos.tarjeta}>
          <Text style={estilos.nota}>{error}</Text>
          <TextInput
            style={[estilos.entrada, { marginTop: 10 }]}
            placeholder="Ej: demo-feria"
            autoCapitalize="none"
            value={codigo}
            onChangeText={setCodigo}
          />
          <Boton titulo="Abrir" primario estilo={{ marginTop: 10 }} alPresionar={abrir} />
          <Boton titulo="Escanear con la cámara" estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("Escanear")} />
        </View>
      </Pantalla>
    );
  }
  if (!datos) return <Cargando />;

  const { qr, destino, yaRegistrado, asistencias, totalAsistencias } = datos;

  return (
    <Pantalla>
      <Encabezado titulo={qr.titulo || NOMBRE_TIPO[qr.tipo]} sub={NOMBRE_TIPO[qr.tipo] + " · compartido por " + (qr.creadoPorNombre || "—")} />
      {qr.tipo === "evento" && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>{destino.titulo}</Text>
          <Text style={estilos.filaDetalle}>
            {destino.fecha ? fmtFecha(destino.fecha) : ""}
            {destino.horaInicio ? " · " + destino.horaInicio + (destino.horaFin ? "–" + destino.horaFin : "") : ""}
            {destino.lugar ? " · " + destino.lugar : ""}
          </Text>
          {destino.descripcion ? <Text style={estilos.nota}>{destino.descripcion}</Text> : null}
          {yaRegistrado ? (
            <Text style={[estilos.nota, { color: colores.exito, fontWeight: "600" }]}>Ya tienes tu entrada registrada en esta actividad.</Text>
          ) : (
            <Boton titulo={registrando ? "Registrando…" : "Registrar mi entrada"} primario deshabilitado={registrando} estilo={{ marginTop: 10 }} alPresionar={registrarEntrada} />
          )}
        </View>
      )}
      {qr.tipo === "anuncio" && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaDetalle}>
            {destino.categoria || ""} · {destino.creadoPorNombre || ""} · {fmtFechaHora(destino.creadoEn)}
          </Text>
          <Text style={{ color: colores.texto, marginTop: 8, fontSize: 14.5, lineHeight: 21 }}>{destino.contenido || ""}</Text>
        </View>
      )}
      {qr.tipo === "documento" && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>{destino.nombre}</Text>
          <Text style={estilos.filaDetalle}>
            {nombreTipoDoc(destino.tipo)}
            {destino.categoria ? " · " + destino.categoria : ""}
          </Text>
          {destino.descripcion ? <Text style={estilos.nota}>{destino.descripcion}</Text> : null}
          <Boton titulo="Descargar" primario estilo={{ marginTop: 10 }} alPresionar={descargarDocumento} />
        </View>
      )}
      {asistencias !== undefined && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Asistencias ({totalAsistencias})</Text>
          {asistencias.length === 0 ? (
            <Text style={estilos.nota}>Aún nadie ha registrado su entrada</Text>
          ) : (
            asistencias.map((a, i) => (
              <View key={i} style={[estilos.filaLista, { borderWidth: 0, paddingVertical: 8 }]}>
                <View style={estilos.filaPrincipal}>
                  <Text style={estilos.filaTitulo}>{a.nombre}</Text>
                  <Text style={estilos.filaDetalle}>
                    {a.grado ? a.grado + (a.seccion || "") + " · " : ""}
                    {fmtFechaHora(a.cuando)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
      <Text style={[estilos.nota, { textAlign: "center" }]}>Código: {qr.codigo}</Text>
    </Pantalla>
  );
}
