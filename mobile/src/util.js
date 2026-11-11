export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
export const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

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

export const MENUS = {
  estudiante: ["inicio", "solicitudes", "proyectos", "explorar", "anuncios", "calendario", "documentos", "qrs", "perfil"],
  docente: ["inicio", "bandeja", "proyectos", "anuncios", "calendario", "documentos", "qrs", "perfil"],
  coordinacion: ["inicio", "bandeja", "anuncios", "calendario", "indicadores", "qrs", "perfil"],
  direccion: ["inicio", "bandeja", "solicitudes", "proyectos", "anuncios", "calendario", "indicadores", "auditoria", "qrs", "perfil"],
  administracion: ["inicio", "bandeja", "calendario", "anuncios", "documentos", "qrs", "perfil"],
  padre: ["inicio", "autorizaciones", "anuncios", "calendario", "qrs", "perfil"],
  promotor: ["inicio", "indicadores", "anuncios", "qrs", "perfil"],
  ti: ["inicio", "bandeja", "solicitudes", "proyectos", "anuncios", "usuarios", "calendario", "indicadores", "auditoria", "qrs", "perfil"],
};

export const TEXTOS_MENU = {
  inicio: "Inicio", solicitudes: "Solicitudes", bandeja: "Por revisar", proyectos: "Proyectos",
  explorar: "Explorar", anuncios: "Anuncios", calendario: "Calendario", documentos: "Documentos",
  indicadores: "Indicadores", auditoria: "Auditoría", usuarios: "Usuarios", autorizaciones: "Autorizaciones",
  qrs: "QR", perfil: "Perfil",
};
