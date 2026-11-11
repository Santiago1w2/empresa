import React, { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../api";
import { Boton, Cargando, Encabezado, Estado, FilaLista, Pantalla, colores, estilos } from "../componentes/basicos";
import { PromptModal } from "../componentes/selector";
import { useSesion } from "../contexto/Sesion";
import { fmtFecha, fmtFechaHora, nombreEstado } from "../util";

const COLUMNAS = ["POR_HACER", "EN_CURSO", "HECHO"];

export default function ProyectoDetalle({ navigation, route }) {
  const { id } = route.params;
  const { usuario } = useSesion();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/proyectos/" + id));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (estado) => {
    try {
      await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { estado } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const unirme = async () => {
    try {
      await api("/proyectos/" + id + "/unirse", { metodo: "POST", cuerpo: {} });
      Alert.alert("Listo", "Te uniste al proyecto");
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const crearTarea = async (titulo) => {
    setCreando(null);
    if (!titulo.trim()) return;
    try {
      await api("/proyectos/" + id + "/tareas", { metodo: "POST", cuerpo: { titulo: titulo.trim() } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const crearHito = async (titulo) => {
    setCreando(null);
    if (!titulo.trim()) return;
    const nuevos = [...hitos, { titulo: titulo.trim(), cumplido: false }];
    try {
      await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos: nuevos } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const alternarHito = async (i) => {
    const nuevos = hitos.slice();
    nuevos[i] = { ...nuevos[i], cumplido: !nuevos[i].cumplido };
    try {
      await api("/proyectos/" + id, { metodo: "PUT", cuerpo: { hitos: nuevos } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const moverTarea = async (tarea) => {
    const nuevo = tarea.estado === "HECHO" ? "EN_CURSO" : tarea.estado === "EN_CURSO" ? "HECHO" : "EN_CURSO";
    try {
      await api("/proyectos/" + id + "/tareas/" + tarea.tareaId, { metodo: "PUT", cuerpo: { estado: nuevo } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const escribirBitacora = async (texto) => {
    setCreando(null);
    if (!texto.trim()) return;
    try {
      await api("/proyectos/" + id + "/bitacora", { metodo: "POST", cuerpo: { texto: texto.trim(), evidencias: [] } });
      cargar();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (error) return <Pantalla><Encabezado titulo="Proyecto" sub={error} /></Pantalla>;
  if (!datos) return <Cargando />;

  const p = datos.proyecto;
  const puedeEditar = datos.puedeEditar;
  const esMiembro = (p.equipo || []).some((m) => m.usuarioId === usuario.usuarioId);
  const puedeUnirse = usuario.rol === "estudiante" && p.abiertoUnirse && p.estado === "ACTIVA" && !esMiembro;
  const hitos = p.hitos || [];
  const cumplidos = hitos.filter((h) => h.cumplido).length;
  const avance = hitos.length ? Math.round((cumplidos * 100) / hitos.length) : 0;
  const tareas = datos.tareas || [];
  const bitacora = datos.bitacora || [];

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado
        titulo={p.nombre}
        sub={(p.categoria || "") + " · Responsable: " + (p.responsableNombre || "—") + " · Avance " + avance + "%"}
        acciones={puedeEditar ? null : <Estado estado={p.estado} />}
      />
      {puedeEditar ? (
        <View style={[estilos.tarjeta, estilos.fila, { flexWrap: "wrap", gap: 6 }]}>
          {["ACTIVA", "EN_PAUSA", "SIN_RESPONSABLE", "FINALIZADA"].map((e) => (
            <Text
              key={e}
              style={[estilos.chipTexto, p.estado === e ? { color: colores.primario, fontWeight: "700" } : null]}
              onPress={() => cambiarEstado(e)}
            >
              {nombreEstado(e)}
            </Text>
          ))}
        </View>
      ) : null}
      {p.solicitudId ? (
        <Boton titulo="Ver solicitud de origen" chico alPresionar={() => navigation.navigate("SolicitudDetalle", { id: p.solicitudId })} />
      ) : null}
      <View style={estilos.tarjeta}>
        <View style={[estilos.fila, { justifyContent: "space-between" }]}>
          <Text style={estilos.filaTitulo}>Tablero de tareas</Text>
          {puedeEditar ? (
            <Text style={{ color: colores.primario, fontSize: 13, fontWeight: "600" }} onPress={() => setCreando("tarea")}>
              + Tarea
            </Text>
          ) : null}
        </View>
        {tareas.length === 0 ? (
          <Text style={estilos.nota}>Sin tareas aún</Text>
        ) : (
          COLUMNAS.map((col) => {
            const colTareas = tareas.filter((t) => t.estado === col);
            if (colTareas.length === 0) return null;
            return (
              <View key={col} style={{ marginTop: 8 }}>
                <Text style={[estilos.filaDetalle, { fontWeight: "700" }]}>{nombreEstado(col)} ({colTareas.length})</Text>
                {colTareas.map((t) => (
                  <FilaLista key={t.tareaId} alPresionar={puedeEditar ? () => moverTarea(t) : undefined}>
                    <View style={estilos.filaPrincipal}>
                      <Text style={[estilos.filaTitulo, t.estado === "HECHO" && { textDecorationLine: "line-through", color: colores.textoSuave }]}>
                        {t.titulo}
                      </Text>
                      {t.descripcion ? <Text style={estilos.nota} numberOfLines={2}>{t.descripcion}</Text> : null}
                      <Text style={estilos.filaDetalle}>
                        {t.responsableNombre || "Sin responsable"}
                        {t.vence ? " · vence " + fmtFecha(t.vence) : ""}
                      </Text>
                    </View>
                    {puedeEditar ? <Text style={{ color: colores.primario, fontSize: 12.5, fontWeight: "600" }}>mover</Text> : null}
                  </FilaLista>
                ))}
              </View>
            );
          })
        )}
      </View>
      <View style={estilos.tarjeta}>
        <View style={[estilos.fila, { justifyContent: "space-between" }]}>
          <Text style={estilos.filaTitulo}>Hitos</Text>
          {puedeEditar ? (
            <Text style={{ color: colores.primario, fontSize: 13, fontWeight: "600" }} onPress={() => setCreando("hito")}>
              + Hito
            </Text>
          ) : null}
        </View>
        <Text style={estilos.nota}>
          {avance}% · {cumplidos} de {hitos.length} hitos cumplidos
        </Text>
        {hitos.length === 0 ? (
          <Text style={estilos.nota}>Sin hitos definidos</Text>
        ) : (
          hitos.map((h, i) => (
            <FilaLista key={i} alPresionar={puedeEditar ? () => alternarHito(i) : undefined}>
              <View style={estilos.filaPrincipal}>
                <Text style={estilos.filaTitulo}>
                  {(h.cumplido ? "[X] " : "[ ] ") + (h.titulo || h.texto || "Hito")}
                </Text>
                {h.fecha ? <Text style={estilos.filaDetalle}>{fmtFecha(h.fecha)}</Text> : null}
              </View>
            </FilaLista>
          ))
        )}
      </View>
      <View style={estilos.tarjeta}>
        <View style={[estilos.fila, { justifyContent: "space-between" }]}>
          <Text style={estilos.filaTitulo}>Equipo</Text>
          {puedeUnirse ? <Boton titulo="Unirme" chico alPresionar={unirme} /> : null}
        </View>
        {(p.equipo || []).length === 0 ? (
          <Text style={estilos.nota}>Sin miembros aún</Text>
        ) : (
          (p.equipo || []).map((m, i) => (
            <View key={i} style={[estilos.fila, { marginTop: 6 }]}>
              <View style={estilos.filaPrincipal}>
                <Text style={estilos.filaTitulo}>{m.nombre || m.usuarioId}</Text>
                <Text style={estilos.filaDetalle}>{m.cargo === "lider" ? "Líder" : "Miembro"}</Text>
              </View>
            </View>
          ))
        )}
        <Boton titulo="Consultas del proyecto" chico estilo={{ marginTop: 10 }} alPresionar={() => navigation.navigate("MensajeHilo", { hilo: "PROY#" + id })} />
      </View>
      <View style={estilos.tarjeta}>
        <View style={[estilos.fila, { justifyContent: "space-between" }]}>
          <Text style={estilos.filaTitulo}>Bitácora</Text>
          {puedeEditar ? (
            <Text style={{ color: colores.primario, fontSize: 13, fontWeight: "600" }} onPress={() => setCreando("bitacora")}>
              + Avance
            </Text>
          ) : null}
        </View>
        {bitacora.length === 0 ? (
          <Text style={estilos.nota}>Aún no hay registros en la bitácora</Text>
        ) : (
          bitacora.map((b, i) => (
            <View key={i} style={{ marginTop: 8 }}>
              <Text style={estilos.filaTitulo}>{b.autorNombre}</Text>
              <Text style={estilos.filaDetalle}>{fmtFechaHora(b.creadoEn__id)}</Text>
              <Text style={estilos.nota}>{b.texto}</Text>
            </View>
          ))
        )}
        <Text style={estilos.nota}>Las evidencias adjuntas se gestionan desde la versión web.</Text>
      </View>
      {p.legado && Object.keys(p.legado).length > 0 ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Legado</Text>
          <Text style={estilos.nota}>{p.legado.aprendizajes || "Sin aprendizajes registrados"}</Text>
          {(p.legado.contactos || []).length > 0 ? (
            <Text style={estilos.nota}>Contactos: {p.legado.contactos.join(", ")}</Text>
          ) : null}
        </View>
      ) : null}
      <PromptModal visible={creando === "tarea"} titulo="Nueva tarea" etiqueta="Título de la tarea" alAceptar={crearTarea} alCancelar={() => setCreando(null)} />
      <PromptModal visible={creando === "hito"} titulo="Nuevo hito" etiqueta="Título del hito" alAceptar={crearHito} alCancelar={() => setCreando(null)} />
      <PromptModal
        visible={creando === "bitacora"}
        titulo="Registrar avance"
        etiqueta="Describe el avance o incidente"
        multilinea
        alAceptar={escribirBitacora}
        alCancelar={() => setCreando(null)}
      />
    </Pantalla>
  );
}
