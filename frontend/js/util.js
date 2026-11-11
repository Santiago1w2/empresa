function esc(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function $(selector, raiz) {
  return (raiz || document).querySelector(selector);
}

function $$(selector, raiz) {
  return Array.from((raiz || document).querySelectorAll(selector));
}

function toast(mensaje, tipo) {
  const div = document.createElement("div");
  div.className = "toast " + (tipo || "exito");
  div.textContent = mensaje;
  $("#toasts").appendChild(div);
  setTimeout(() => div.classList.add("visible"), 10);
  setTimeout(() => {
    div.classList.remove("visible");
    setTimeout(() => div.remove(), 400);
  }, 3500);
}

function abrirModal(titulo, contenidoHtml, pieHtml) {
  const caja = $("#modal-caja");
  caja.innerHTML =
    '<div class="modal-titulo"><h3>' + esc(titulo) + '</h3><button class="modal-x" onclick="cerrarModal()">&times;</button></div>' +
    '<div class="modal-cuerpo">' + contenidoHtml + '</div>' +
    (pieHtml ? '<div class="modal-pie">' + pieHtml + '</div>' : "");
  $("#modal-fondo").classList.remove("oculto");
  return caja;
}

function cerrarModal() {
  $("#modal-fondo").classList.add("oculto");
  $("#modal-caja").innerHTML = "";
}

function confirmar(mensaje) {
  return new Promise((resolver) => {
    window._confirmarRes = resolver;
    abrirModal(
      "Confirmar",
      '<p>' + esc(mensaje) + '</p>',
      '<button class="btn" onclick="window._confirmarRes(false); cerrarModal()">Cancelar</button>' +
      '<button class="btn primario" onclick="window._confirmarRes(true); cerrarModal()">Aceptar</button>'
    );
  });
}

function promptTexto(titulo, etiqueta, valorInicial) {
  return new Promise((resolver) => {
    window._promptRes = resolver;
    abrirModal(
      titulo,
      '<label class="campo"><span>' + esc(etiqueta) + '</span><textarea id="modal-input" rows="4">' + esc(valorInicial || "") + '</textarea></label>',
      '<button class="btn" onclick="window._promptRes(null); cerrarModal()">Cancelar</button>' +
      '<button class="btn primario" onclick="window._promptRes($(\'#modal-input\').value); cerrarModal()">Aceptar</button>'
    );
    setTimeout(() => { const el = $("#modal-input"); if (el) el.focus(); }, 50);
  });
}

function promptDatos(titulo, camposHtml, alAceptar) {
  abrirModal(
    titulo,
    camposHtml,
    '<button class="btn" onclick="cerrarModal()">Cancelar</button>' +
    '<button class="btn primario" id="modal-ok">Aceptar</button>'
  );
  $("#modal-ok").onclick = () => { alAceptar(); };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fmtFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha + (fecha.length === 10 ? "T12:00:00" : ""));
  if (isNaN(d)) return fecha;
  return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear();
}

function fmtFechaHora(fechaHora) {
  if (!fechaHora) return "—";
  const d = new Date(fechaHora);
  if (isNaN(d)) return fechaHora;
  return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function diasRestantes(fechaIso) {
  if (!fechaIso) return null;
  const d = new Date(fechaIso);
  return Math.ceil((d - new Date()) / 86400000);
}

function hoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const NOMBRES_ROL = {
  estudiante: "Estudiante",
  docente: "Docente / Tutor",
  coordinacion: "Coordinación",
  direccion: "Dirección",
  administracion: "Administración",
  padre: "Padre / Apoderado",
  promotor: "Promotor",
  ti: "Admin TI",
};

const NOMBRES_ESTADO = {
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

function nombreRol(rol) { return NOMBRES_ROL[rol] || rol; }
function nombreEstado(estado) { return NOMBRES_ESTADO[estado] || estado; }

function badge(estado) {
  return '<span class="badge b-' + esc(estado) + '">' + esc(nombreEstado(estado)) + '</span>';
}

function semaforo(estado) {
  const colores = {
    BORRADOR: "gris", EN_REVISION: "amarillo", OBSERVADA: "amarillo",
    EN_AUTORIZACION_PADRES: "amarillo", APROBADA: "verde", APROBADA_CONDICIONES: "verde",
    EN_EJECUCION: "azul", FINALIZADA: "gris", ARCHIVADA: "gris", RECHAZADA: "rojo",
    ACTIVA: "verde", EN_PAUSA: "amarillo", SIN_RESPONSABLE: "rojo", FINALIZADA: "gris",
  };
  const color = colores[estado] || "gris";
  return '<span class="semaforo s-' + color + '" title="' + esc(nombreEstado(estado)) + '"></span>';
}

function vacio(mensaje, icono) {
  return '<div class="vacio"><div class="vacio-icono">' + (icono || "···") + '</div><p>' + esc(mensaje) + '</p></div>';
}

function cargando() {
  return '<div class="cargando"><div class="espiner"></div><p>Cargando…</p></div>';
}

function idCorto(id) {
  return (id || "").slice(0, 8);
}

function urlParams(hash) {
  const qs = hash.split("?")[1] || "";
  const p = {};
  qs.split("&").forEach((par) => {
    const [k, v] = par.split("=");
    if (k) p[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return p;
}
