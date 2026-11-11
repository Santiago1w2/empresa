async function api(ruta, opciones = {}) {
  const token = localStorage.getItem("sac-token");
  const config = {
    method: opciones.metodo || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (token) config.headers.Authorization = "Bearer " + token;
  if (opciones.cuerpo !== undefined) config.body = JSON.stringify(opciones.cuerpo);
  const base = (window.CONFIG && window.CONFIG.apiBase) || "";
  const respuesta = await fetch(base + ruta, config);
  let json = {};
  try {
    json = await respuesta.json();
  } catch (e) {
    throw new Error("Respuesta inválida del servidor (" + respuesta.status + ")");
  }
  if (!respuesta.ok || json.ok === false) {
    if (respuesta.status === 401) {
      localStorage.removeItem("sac-token");
      if (location.hash !== "#/inicio") location.hash = "#/inicio";
    }
    throw new Error(json.error || "Error " + respuesta.status);
  }
  return json.datos;
}

async function subirArchivo(archivo, alSubir) {
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

async function urlDescarga(key) {
  const datos = await api("/archivos/descarga-url?key=" + encodeURIComponent(key));
  return datos.url;
}
