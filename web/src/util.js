export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function fmtFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha + (fecha.length === 10 ? "T12:00:00" : ""));
  if (isNaN(d)) return fecha;
  return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear();
}

export function fmtFechaHora(fechaHora) {
  if (!fechaHora) return "—";
  const d = new Date(fechaHora);
  if (isNaN(d)) return fechaHora;
  return (
    d.getDate() + " " + MESES[d.getMonth()] + " " +
    String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")
  );
}

export function hoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function isoDe(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export const NOMBRES_ROL = {
  estudiante: "Estudiante",
  docente: "Docente / Tutor",
  coordinacion: "Coordinación",
  direccion: "Dirección",
  administracion: "Administración",
  padre: "Padre / Apoderado",
  promotor: "Promotor",
  ti: "Admin TI",
};

export const NOMBRES_ESTADO = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  OBSERVADA: "Observada",
  APROBADA: "Aprobada",
  APROBADA_CONDICIONES: "Aprobada con condiciones",
  EN_AUTORIZACION_PADRES: "Esperando a los padres",
  RECHAZADA: "Rechazada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA: "Finalizada",
  ARCHIVADA: "Archivada",
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  ACTIVA: "Activa",
  EN_PAUSA: "En pausa",
  SIN_RESPONSABLE: "Sin responsable",
  POR_HACER: "Por hacer",
  EN_CURSO: "En curso",
  HECHO: "Hecho",
};

export function nombreRol(rol) {
  return NOMBRES_ROL[rol] || rol;
}

export function nombreEstado(estado) {
  return NOMBRES_ESTADO[estado] || estado;
}

export function nombreCapa(tipo) {
  return (
    {
      CLASE: "Clases",
      EVALUACION: "Evaluaciones",
      ACTIVIDAD: "Actividades",
      REUNION: "Reuniones",
      FERIADO: "Feriados",
      INSTITUCIONAL: "Institucional",
    }[tipo] || tipo
  );
}

export function nombreTipoDoc(tipo) {
  return { PLANTILLA: "Plantilla", INFORME: "Informe", EVIDENCIA: "Evidencia", OTRO: "Otro" }[tipo] || tipo;
}

export function nombreAmbiente(cat, ambienteId) {
  const a = ((cat && cat.ambientes) || []).find((x) => x.ambienteId === ambienteId);
  return a ? a.nombre : "Ambiente";
}

export function iniciales(nombre) {
  return (nombre || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function idCorto(id) {
  return (id || "").slice(0, 8);
}

export const TEXTOS_ACCION = {
  enviar: "Enviar a revisión",
  responder_observacion: "Responder observación",
  aprobar: "Aprobar",
  aprobar_condiciones: "Aprobar con condiciones",
  observar: "Observar (pedir ajustes)",
  rechazar: "Rechazar",
  delegar: "Delegar revisión",
  ejecutar: "Pasar a ejecución",
  finalizar: "Finalizar",
  archivar: "Archivar",
};

export const CAPAS = ["CLASE", "EVALUACION", "ACTIVIDAD", "REUNION", "FERIADO", "INSTITUCIONAL"];
