import { apiBase } from "./config";

export async function api(ruta, opciones = {}) {
  const token = localStorage.getItem("sac-token");
  const config = {
    method: opciones.metodo || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (token) config.headers.Authorization = "Bearer " + token;
  if (opciones.cuerpo !== undefined) config.body = JSON.stringify(opciones.cuerpo);
  const respuesta = await fetch(apiBase + ruta, config);
  let json = {};
  try {
    json = await respuesta.json();
  } catch (e) {
    throw new Error("Respuesta inválida del servidor (" + respuesta.status + ")");
  }
  if (!respuesta.ok || json.ok === false) {
    if (respuesta.status === 401) {
      localStorage.removeItem("sac-token");
      window.dispatchEvent(new Event("sac-token-invalido"));
    }
    throw new Error(json.error || "Error " + respuesta.status);
  }
  return json.datos;
}

export async function subirArchivo(archivo) {
  const datos = await api("/archivos/subida-url", {
    metodo: "POST",
    cuerpo: { nombre: archivo.name, contentType: archivo.type || "application/octet-stream" },
  });
  const resp = await fetch(datos.url, {
    method: "PUT",
    headers: { "Content-Type": archivo.type || "application/octet-stream" },
    body: archivo,
  });
  if (!resp.ok) throw new Error("No se pudo subir el archivo a S3");
  return datos.key;
}

export async function urlDescarga(key) {
  const datos = await api("/archivos/descarga-url?key=" + encodeURIComponent(key));
  return datos.url;
}

export function valorQr(codigo) {
  return "sac://qr/" + codigo;
}

export function codigoDesde(texto) {
  texto = (texto || "").trim();
  if (texto.startsWith("sac://qr/")) return texto.slice(10);
  const i = texto.indexOf("#/qr/");
  if (i >= 0) return texto.slice(i + 5).split(/[?/]/)[0];
  return texto;
}
