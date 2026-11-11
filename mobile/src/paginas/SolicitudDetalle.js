import React, { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Boton, Cargando, Encabezado, Estado, FilaLista, Pantalla, colores, estilos } from "../componentes/basicos";
import { PromptModal } from "../componentes/selector";
import { useSesion } from "../contexto/Sesion";
import { fmtFecha, fmtFechaHora, nombreEstado, nombreRol, TEXTOS_ACCION } from "../util";

export default function SolicitudDetalle({ navigation, route }) {
  const { id } = route.params;
  const { usuario } = useSesion();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/solicitudes/" + id));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirPrompt = (accion, titulo, etiqueta, obligatorio, extras) =>
    setPrompt({ accion, titulo, etiqueta, obligatorio, extras: extras || {} });

  const confirmarPrompt = async (texto) => {
    const p = prompt;
    setPrompt(null);
    if (!p) return;
    const valor = (texto || "").trim();
    if (p.obligatorio && !valor) {
      Alert.alert("Falta información", p.etiqueta + " es obligatorio");
      return;
    }
    await ejecutarAccion(p.accion, valor, p.extras);
  };

  const ejecutarAccion = async (accion, valor, extras) => {
    let cuerpo = { accion, ...extras };
    if (accion === "responder_observacion") {
      cuerpo = { ...cuerpo, comentario: valor, titulo: datos.solicitud.titulo };
    } else if (accion === "aprobar" || accion === "observar" || accion === "rechazar") {
      cuerpo = { ...cuerpo, comentario: valor };
    } else if (accion === "aprobar_condiciones") {
      cuerpo = { ...cuerpo, condiciones: valor };
    } else if (accion === "finalizar") {
      cuerpo = { ...cuerpo, informe: valor };
    }
    try {
      await api("/solicitudes/" + id + "/accion", { metodo: "POST", cuerpo });
      Alert.alert("Listo", "Acción realizada");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const delegar = async () => {
    try {
      const usuarios = (await api("/usuarios")).filter((u) => u.rol === usuario.rol && u.usuarioId !== usuario.usuarioId);
      if (usuarios.length === 0) {
        Alert.alert("Sin opciones", "No hay otros usuarios de tu rol para delegar");
        return;
      }
      Alert.alert(
        "Delegar revisión",
        usuarios.map((u, i) => (i + 1) + ". " + u.nombre).join("\n"),
        [
          { text: "Cancelar", style: "cancel" },
          ...usuarios.map((u, i) => ({
            text: String(i + 1),
            onPress: () => ejecutarAccion("delegar", "", { usuarioId: u.usuarioId }),
          })),
        ]
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const elegirAccion = (accion) => {
    if (accion === "enviar") return ejecutarAccion("enviar", "");
    if (accion === "ejecutar") return ejecutarAccion("ejecutar", "");
    if (accion === "delegar") return delegar();
    if (accion === "archivar") {
      Alert.alert("Archivar", "¿Archivar esta solicitud?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Archivar", onPress: () => ejecutarAccion("archivar", "") },
      ]);
      return;
    }
    if (accion === "rechazar") {
      abrirPrompt("rechazar", "Rechazar solicitud", "Motivo del rechazo (obligatorio)", true);
      return;
    }
    const mapa = {
      responder_observacion: ["Responder observación", "Explica los ajustes realizados", false],
      aprobar: ["Aprobar", "Comentario (opcional)", false],
      aprobar_condiciones: ["Aprobar con condiciones", "Condiciones obligatorias", true],
      observar: ["Observar solicitud", "Motivo de la observación", true],
      finalizar: ["Finalizar actividad", "Informe breve", false],
    };
    const [titulo, etiqueta, obligatorio] = mapa[accion] || [TEXTOS_ACCION[accion], "Comentario", false];
    abrirPrompt(accion, titulo, etiqueta, obligatorio);
  };

  if (error) return <Pantalla><Encabezado titulo="Solicitud" sub={error} /></Pantalla>;
  if (!datos) return <Cargando />;

  const s = datos.solicitud;
  const acciones = datos.acciones || [];
  const pasoActual = (datos.pasos || []).find((p) => p.estado === "EN_REVISION") || {};

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado
        titulo={s.titulo}
        sub={(s.tipoNombre || "") + " · " + (s.solicitanteNombre || "") + (s.fecha ? " · " + fmtFecha(s.fecha) : "")}
      />
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Estado</Text>
        <View style={[estilos.fila, { marginTop: 6 }]}>
          <Estado estado={s.estado} />
          {s.estado === "EN_REVISION" && s.revisorActualRol ? (
            <Text style={estilos.filaDetalle}>
              {nombreRol(s.revisorActualRol)}
              {pasoActual.plazoVenceEn ? " · vence " + fmtFecha(pasoActual.plazoVenceEn) : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Línea de tiempo</Text>
        {s.enviadoEn ? (
          <Text style={estilos.nota}>Enviada · {fmtFechaHora(s.enviadoEn)}</Text>
        ) : null}
        {(datos.pasos || []).map((p, i) => (
          <Text style={estilos.nota} key={i}>
            {nombreRol(p.rol)}
            {p.revisorNombre ? " · " + p.revisorNombre : ""} · {nombreEstado(p.estado)}
            {p.plazoVenceEn && p.estado === "EN_REVISION" ? " · vence " + fmtFecha(p.plazoVenceEn) : ""}
            {p.comentario ? "\n" + p.comentario : ""}
            {p.condiciones ? "\nCondiciones: " + p.condiciones : ""}
          </Text>
        ))}
        {(datos.autorizaciones || []).length > 0 ? (
          <Text style={estilos.nota}>
            Autorización de padres:{"\n"}
            {datos.autorizaciones.map((a) => (a.apoderadoNombre || "Apoderado") + " · " + nombreEstado(a.estado)).join("\n")}
          </Text>
        ) : null}
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Detalle</Text>
        <Text style={estilos.filaDetalle}>Objetivo: {s.objetivo || "—"}</Text>
        {s.descripcion ? <Text style={estilos.filaDetalle}>Descripción: {s.descripcion}</Text> : null}
        <Text style={estilos.filaDetalle}>
          Fecha: {s.fecha ? fmtFecha(s.fecha) + (s.horaInicio ? " " + s.horaInicio + "–" + s.horaFin : "") : "—"}
          {s.lugar ? " · Lugar: " + s.lugar : ""}
        </Text>
        {s.recursos ? <Text style={estilos.filaDetalle}>Recursos: {s.recursos}</Text> : null}
        {s.presupuesto ? <Text style={estilos.filaDetalle}>Presupuesto: {s.presupuesto}</Text> : null}
        {s.riesgos ? <Text style={estilos.filaDetalle}>Riesgos: {s.riesgos}</Text> : null}
        <Text style={estilos.filaDetalle}>Participantes: {(s.participantes || []).map((p) => p.nombre || p).join(", ") || "—"}</Text>
        {(s.checklist || []).length > 0 ? (
          <Text style={estilos.nota}>
            Checklist:{"\n"}
            {s.checklist.map((c) => (c.hecho ? "[X] " : "[ ] ") + c.texto).join("\n")}
          </Text>
        ) : null}
        {s.condiciones ? <Text style={[estilos.nota, { color: colores.alerta }]}>Condiciones: {s.condiciones}</Text> : null}
        {s.motivoRechazo ? <Text style={[estilos.nota, { color: colores.peligro }]}>Motivo del rechazo: {s.motivoRechazo}</Text> : null}
        {s.informeFinal ? <Text style={estilos.nota}>Informe final: {s.informeFinal}</Text> : null}
        {datos.proyecto ? (
          <Boton titulo="Ver proyecto vinculado" chico estilo={{ marginTop: 8, alignSelf: "flex-start" }} alPresionar={() => navigation.navigate("ProyectoDetalle", { id: datos.proyecto.proyectoId })} />
        ) : null}
        <Boton
          titulo="Consultas sobre esta solicitud"
          chico
          estilo={{ marginTop: 8, alignSelf: "flex-start" }}
          alPresionar={() => navigation.navigate("MensajeHilo", { hilo: "SOL#" + id })}
        />
        <Text style={[estilos.nota, { color: colores.textoSuave }]}>Los adjuntos se gestionan desde la versión web.</Text>
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Comentarios</Text>
        {(datos.comentarios || []).length === 0 ? (
          <Text style={estilos.nota}>Sin comentarios aún</Text>
        ) : (
          datos.comentarios.map((c, i) => (
            <Text style={estilos.nota} key={i}>
              {c.autorNombre}
              {c.interno ? " (interno)" : ""} · {fmtFechaHora(c.creadoEn__id)}{"\n"}
              {c.texto}
            </Text>
          ))
        )}
        <NuevoComentario id={id} alComentar={cargar} />
      </View>
      {acciones.length > 0 ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Acciones</Text>
          <View style={[estilos.fila, { flexWrap: "wrap", marginTop: 8 }]}>
            {acciones.map((a) => (
              <Boton key={a} titulo={TEXTOS_ACCION[a] || a} chico estilo={{ marginBottom: 8, marginRight: 8 }} alPresionar={() => elegirAccion(a)} />
            ))}
          </View>
        </View>
      ) : null}
      <PromptModal
        visible={!!prompt}
        titulo={prompt ? prompt.titulo : ""}
        etiqueta={prompt ? prompt.etiqueta : ""}
        multilinea={true}
        valorInicial=""
        alAceptar={confirmarPrompt}
        alCancelar={() => setPrompt(null)}
      />
    </Pantalla>
  );
}

function NuevoComentario({ id, alComentar }) {
  const [texto, setTexto] = useState("");
  const enviar = async () => {
    if (!texto.trim()) return;
    try {
      await api("/solicitudes/" + id + "/comentarios", { metodo: "POST", cuerpo: { texto: texto.trim(), interno: false } });
      setTexto("");
      alComentar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={estilos.campoTexto}>Nuevo comentario</Text>
      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="Escribe un comentario…"
        multiline
        style={[estilos.entrada, { textAlignVertical: "top" }]}
      />
      <Boton titulo="Comentar" chico estilo={{ marginTop: 8, alignSelf: "flex-start" }} alPresionar={enviar} />
    </View>
  );
}
