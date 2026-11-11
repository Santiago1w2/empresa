import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api";
import { Cargando, Encabezado, Estado, FilaLista, Pantalla, estilos } from "../componentes/basicos";
import { useSesion } from "../contexto/Sesion";
import { fmtFecha, nombreRol } from "../util";

export default function Inicio({ navigation }) {
  const { usuario } = useSesion();
  const [cuerpo, setCuerpo] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const rol = usuario.rol;
      if (rol === "estudiante" || rol === "padre") {
        const [solicitudes, anuncios] = await Promise.all([api("/solicitudes"), api("/anuncios?noLeidos=1")]);
        setCuerpo({
          solicitudes: solicitudes.filter((s) =>
            ["EN_REVISION", "OBSERVADA", "EN_AUTORIZACION_PADRES", "EN_EJECUCION"].includes(s.estado)
          ),
          anuncios,
        });
      } else if (rol === "docente") {
        const bandeja = await api("/solicitudes?bandeja=1");
        setCuerpo({ bandeja });
      } else {
        const [bandeja, indicadores] = await Promise.all([
          rol === "promotor" ? Promise.resolve([]) : api("/solicitudes?bandeja=1"),
          api("/indicadores"),
        ]);
        setCuerpo({ bandeja, indicadores });
      }
    } catch (e) {
      setError(e.message);
    }
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error) return <Pantalla><Encabezado titulo="Inicio" sub={error} /></Pantalla>;
  if (!cuerpo) return <Cargando />;

  const irA = (pantalla, params) => navigation.navigate(pantalla, params || {});

  return (
    <Pantalla refrescar={cargar}>
      <Encabezado titulo={"Hola, " + (usuario.nombre || "").split(" ")[0]} sub={fechaBonita()} />
      {cuerpo.solicitudes !== undefined && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Mis solicitudes activas</Text>
          {cuerpo.solicitudes.length === 0 ? (
            <Text style={estilos.nota}>No tienes solicitudes en curso. ¡Propón una iniciativa!</Text>
          ) : (
            cuerpo.solicitudes.map((s) => (
              <FilaLista key={s.solicitudId} alPresionar={() => irA("SolicitudDetalle", { id: s.solicitudId })}>
                <View style={estilos.filaPrincipal}>
                  <Text style={estilos.filaTitulo}>{s.titulo}</Text>
                  <Text style={estilos.filaDetalle}>
                    {s.estado === "EN_REVISION" && s.revisorActualRol ? nombreRol(s.revisorActualRol) + " revisa ahora" : ""}
                  </Text>
                </View>
                <Estado estado={s.estado} />
              </FilaLista>
            ))
          )}
        </View>
      )}
      {cuerpo.anuncios !== undefined && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Anuncios sin leer ({cuerpo.anuncios.length})</Text>
          {cuerpo.anuncios.length === 0 ? (
            <Text style={estilos.nota}>Estás al día con los anuncios</Text>
          ) : (
            cuerpo.anuncios.slice(0, 5).map((a) => (
              <FilaLista key={a.anuncioId} alPresionar={() => irA("AnuncioDetalle", { id: a.anuncioId })}>
                <View style={estilos.filaPrincipal}>
                  <Text style={estilos.filaTitulo}>{a.titulo}</Text>
                  <Text style={estilos.filaDetalle}>{a.categoria || ""}</Text>
                </View>
              </FilaLista>
            ))
          )}
        </View>
      )}
      {cuerpo.bandeja !== undefined && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Por revisar ({cuerpo.bandeja.length})</Text>
          {cuerpo.bandeja.length === 0 ? (
            <Text style={estilos.nota}>Tu bandeja está vacía</Text>
          ) : (
            cuerpo.bandeja.slice(0, 6).map((s) => (
              <FilaLista key={s.solicitudId} alPresionar={() => irA("SolicitudDetalle", { id: s.solicitudId })}>
                <View style={estilos.filaPrincipal}>
                  <Text style={estilos.filaTitulo}>{s.titulo}</Text>
                  <Text style={estilos.filaDetalle}>
                    {s.solicitanteNombre || ""} {s.fecha ? "· " + fmtFecha(s.fecha) : ""}
                  </Text>
                </View>
                <Estado estado={s.estado} />
              </FilaLista>
            ))
          )}
        </View>
      )}
      {cuerpo.indicadores !== undefined && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.filaTitulo}>Resumen institucional</Text>
          <View style={[estilos.kpis, { marginTop: 8 }]}>
            <View style={estilos.kpi}>
              <Text style={estilos.kpiValor}>{cuerpo.indicadores.tiempoPromedioRespuestaDias}</Text>
              <Text style={estilos.kpiTexto}>días prom. de respuesta</Text>
            </View>
            <View style={estilos.kpi}>
              <Text style={[estilos.kpiValor, cuerpo.indicadores.vencidas > 0 ? { color: "#dc2626" } : null]}>
                {cuerpo.indicadores.vencidas}
              </Text>
              <Text style={estilos.kpiTexto}>fuera de plazo (SLA)</Text>
            </View>
            <View style={estilos.kpi}>
              <Text style={estilos.kpiValor}>{cuerpo.indicadores.tasaLecturaAnuncios}%</Text>
              <Text style={estilos.kpiTexto}>lectura de anuncios</Text>
            </View>
          </View>
        </View>
      )}
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaTitulo}>Accesos</Text>
        <View style={[estilos.fila, { marginTop: 8, flexWrap: "wrap" }]}>
          {["estudiante", "docente", "coordinacion", "direccion", "administracion"].includes(usuario.rol) ? (
            <BotonTexto titulo="Nueva solicitud" accion={() => irA("SolicitudNueva")} />
          ) : null}
          {usuario.rol === "estudiante" ? <BotonTexto titulo="Explorar" accion={() => irA("Explorar")} /> : null}
          <BotonTexto titulo="Agenda" accion={() => irA("Calendario")} />
          <BotonTexto titulo="Anuncios" accion={() => irA("Anuncios")} />
          <BotonTexto titulo="Documentos" accion={() => irA("Documentos")} />
          <BotonTexto titulo="Consultas" accion={() => irA("Mensajes")} />
          {["coordinacion", "direccion", "ti", "promotor", "administracion"].includes(usuario.rol) ? (
            <BotonTexto titulo="Indicadores" accion={() => irA("Indicadores")} />
          ) : null}
          {usuario.rol === "ti" ? <BotonTexto titulo="Usuarios" accion={() => irA("Usuarios")} /> : null}
          {["ti", "direccion"].includes(usuario.rol) ? <BotonTexto titulo="Auditoría" accion={() => irA("Auditoria")} /> : null}
        </View>
      </View>
    </Pantalla>
  );
}

function BotonTexto({ titulo, accion }) {
  return (
    <Text style={{ color: "#2563eb", fontSize: 13.5, paddingVertical: 6, paddingRight: 14, fontWeight: "600" }} onPress={accion}>
      {titulo}
    </Text>
  );
}

function fechaBonita() {
  const d = new Date();
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  return dias[d.getDay()] + ", " + d.getDate() + " de " + meses[d.getMonth()] + " de " + d.getFullYear();
}
