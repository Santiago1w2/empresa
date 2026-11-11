import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { Boton, Cargando, Encabezado, Pantalla, estilos } from "../componentes/basicos";
import { Selector } from "../componentes/selector";
import { useSesion } from "../contexto/Sesion";
import { nombreRol } from "../util";

const PASOS = ["Tipo", "Datos", "Fecha y lugar", "Equipo", "Revisión"];
const VACIO = {
  tipo: "", titulo: "", objetivo: "", descripcion: "",
  fecha: "", horaInicio: "", horaFin: "", lugar: "", ambienteId: "",
  participantes: [], recursos: "", presupuesto: "", riesgos: "",
  docenteAsesorId: "", adjuntos: [], checklist: [], tipoVisto: "",
};

export default function SolicitudNueva({ navigation }) {
  const { catalogo } = useSesion();
  const [cat, setCat] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estado, setEstado] = useState(VACIO);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCat(catalogo || (await api("/catalogos")));
        const usuarios = await api("/usuarios");
        setDocentes(usuarios.filter((u) => u.rol === "docente"));
        setEstudiantes(usuarios.filter((u) => u.rol === "estudiante"));
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    };
    cargar();
  }, [catalogo]);

  if (!cat) return <Cargando />;

  const set = (campo, valor) => setEstado((e) => ({ ...e, [campo]: valor }));
  const def = (cat.tiposSolicitud || {})[estado.tipo] || {};
  const sla = cat.slaPorRol || {};

  const cambiarTipo = (tipo) => {
    const d = (cat.tiposSolicitud || {})[tipo] || {};
    setEstado((e) => ({
      ...e,
      tipo,
      checklist: tipo && tipo !== e.tipoVisto ? (d.checklist || []).map((c) => ({ texto: c, hecho: false })) : e.checklist,
      tipoVisto: tipo || e.tipoVisto,
    }));
  };

  const agregarParticipante = (usuarioId) => {
    if (!usuarioId) return;
    if (!estado.participantes.some((p) => p.usuarioId === usuarioId)) {
      const u = estudiantes.find((x) => x.usuarioId === usuarioId);
      setEstado((e) => ({ ...e, participantes: [...e.participantes, { usuarioId, nombre: u ? u.nombre : usuarioId }] }));
    }
  };

  const crear = async (enviarAhora) => {
    if (!estado.tipo) {
      Alert.alert("Falta información", "Selecciona el tipo de solicitud");
      return;
    }
    if (!estado.titulo || !estado.titulo.trim()) {
      Alert.alert("Falta información", "El título es obligatorio");
      return;
    }
    try {
      const solicitud = await api("/solicitudes", { metodo: "POST", cuerpo: estado });
      if (enviarAhora) {
        await api("/solicitudes/" + solicitud.solicitudId + "/accion", { metodo: "POST", cuerpo: { accion: "enviar" } });
      }
      Alert.alert("Listo", enviarAhora ? "Solicitud enviada a revisión" : "Borrador guardado");
      navigation.replace("SolicitudDetalle", { id: solicitud.solicitudId });
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <Pantalla estilo={{ backgroundColor: "#eef2f7" }}>
      <Encabezado titulo="Nueva solicitud" sub={"Paso " + (paso + 1) + " de " + PASOS.length + ": " + PASOS[paso]} />
      <View style={estilos.tarjeta}>
        {paso === 0 && (
          <>
            <Selector
              etiqueta="Tipo de solicitud"
              valor={estado.tipo}
              alCambiar={cambiarTipo}
              opciones={Object.entries(cat.tiposSolicitud || {}).map(([k, v]) => ({ valor: k, etiqueta: v.nombre }))}
            />
            {estado.tipo ? (
              <>
                <Text style={estilos.nota}>
                  Ruta: {(def.ruta || []).map((r) => nombreRol(r) + " (" + (sla[r] || 2) + " días)").join(" → ")}
                  {def.requierePadres ? " → Padres" : ""}
                </Text>
                <Text style={estilos.nota}>Requisitos: {(def.checklist || []).join(" · ") || "—"}</Text>
              </>
            ) : null}
          </>
        )}
        {paso === 1 && (
          <>
            <Selector etiqueta="Docente asesor (opcional)" valor={estado.docenteAsesorId} alCambiar={(v) => set("docenteAsesorId", v)} opciones={[{ valor: "", etiqueta: "Sin asesor asignado" }, ...docentes.map((d) => ({ valor: d.usuarioId, etiqueta: d.nombre }))]} />
            <Texto etiqueta="Título" valor={estado.titulo} alCambiar={(v) => set("titulo", v)} />
            <Texto etiqueta="Objetivo" valor={estado.objetivo} alCambiar={(v) => set("objetivo", v)} multilinea />
            <Texto etiqueta="Descripción" valor={estado.descripcion} alCambiar={(v) => set("descripcion", v)} multilinea />
          </>
        )}
        {paso === 2 && (
          <>
            <Texto etiqueta="Fecha (YYYY-MM-DD)" valor={estado.fecha} alCambiar={(v) => set("fecha", v)} />
            <Texto etiqueta="De (HH:MM)" valor={estado.horaInicio} alCambiar={(v) => set("horaInicio", v)} />
            <Texto etiqueta="A (HH:MM)" valor={estado.horaFin} alCambiar={(v) => set("horaFin", v)} />
            <Texto etiqueta="Lugar" valor={estado.lugar} alCambiar={(v) => set("lugar", v)} />
            <Selector
              etiqueta="Ambiente"
              valor={estado.ambienteId}
              alCambiar={(v) => set("ambienteId", v)}
              opciones={[{ valor: "", etiqueta: "Ninguno" }, ...(cat.ambientes || []).map((a) => ({ valor: a.ambienteId, etiqueta: a.nombre }))]}
            />
          </>
        )}
        {paso === 3 && (
          <>
            <Selector
              etiqueta="Agregar estudiante al equipo"
              valor=""
              alCambiar={agregarParticipante}
              marcador="Agregar estudiante…"
              opciones={estudiantes.map((e) => ({ valor: e.usuarioId, etiqueta: e.nombre }))}
            />
            <Text style={estilos.nota}>Equipo: {estado.participantes.map((p) => p.nombre).join(", ") || "—"}</Text>
            <Texto etiqueta="Recursos" valor={estado.recursos} alCambiar={(v) => set("recursos", v)} />
            <Texto etiqueta="Presupuesto" valor={estado.presupuesto} alCambiar={(v) => set("presupuesto", v)} />
            <Texto etiqueta="Riesgos" valor={estado.riesgos} alCambiar={(v) => set("riesgos", v)} />
          </>
        )}
        {paso === 4 && (
          <>
            <Text style={estilos.nota}>
              {estado.titulo || "(sin título)"}{"\n"}
              {estado.fecha || "Sin fecha"}
              {estado.lugar ? " · " + estado.lugar : ""}{"\n"}
              Participantes: {estado.participantes.length} · Adjuntos: 0 (se gestionan en la web)
            </Text>
            <Boton titulo="Guardar borrador" estilo={{ marginTop: 10 }} alPresionar={() => crear(false)} />
            <Boton titulo="Enviar a revisión" primario estilo={{ marginTop: 10 }} alPresionar={() => crear(true)} />
          </>
        )}
        <View style={[estilos.fila, { marginTop: 14, justifyContent: "space-between" }]}>
          {paso > 0 ? (
            <Boton titulo="Anterior" chico alPresionar={() => setPaso(paso - 1)} />
          ) : (
            <View />
          )}
          {paso < PASOS.length - 1 ? (
            <Boton titulo="Siguiente" chico alPresionar={() => setPaso(paso + 1)} />
          ) : (
            <View />
          )}
        </View>
      </View>
    </Pantalla>
  );
}

function Texto({ etiqueta, valor, alCambiar, multilinea }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.campoTexto}>{etiqueta}</Text>
      <TextInput style={[estilos.entrada, multilinea && { textAlignVertical: "top" }]} value={valor} onChangeText={alCambiar} multiline={!!multilinea} />
    </View>
  );
}
