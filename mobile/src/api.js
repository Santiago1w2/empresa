import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

export async function api(ruta, opciones = {}) {
  const token = await AsyncStorage.getItem("sac-token");
  const config = {
    method: opciones.metodo || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (token) config.headers.Authorization = "Bearer " + token;
  if (opciones.cuerpo !== undefined) config.body = JSON.stringify(opciones.cuerpo);
  const respuesta = await fetch(API_URL + ruta, config);
  let json = {};
  try {
    json = await respuesta.json();
  } catch (e) {
    throw new Error("Respuesta inválida del servidor (" + respuesta.status + ")");
  }
  if (!respuesta.ok || json.ok === false) {
    if (respuesta.status === 401) {
      await AsyncStorage.removeItem("sac-token");
    }
    throw new Error(json.error || "Error " + respuesta.status);
  }
  return json.datos;
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
