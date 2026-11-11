const CACHE = "sac-estaticos-v1";
const ACTIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icono.svg",
  "./css/estilos.css",
  "./js/config.js",
  "./js/util.js",
  "./js/api.js",
  "./js/app.js",
  "./js/vistas/solicitudes.js",
  "./js/vistas/proyectos.js",
  "./js/vistas/anuncios.js",
  "./js/vistas/calendario.js",
  "./js/vistas/autorizaciones.js",
  "./js/vistas/mensajes.js",
  "./js/vistas/documentos.js",
  "./js/vistas/indicadores.js",
  "./js/vistas/usuarios.js",
  "./js/vistas/auditoria.js",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ACTIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("execute-api") || url.hostname.includes("amazonaws.com")) return;
  evento.respondWith(
    caches.match(evento.request).then((enCache) => {
      const red = fetch(evento.request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
          }
          return respuesta;
        })
        .catch(() => enCache || caches.match("./index.html"));
      return enCache || red;
    })
  );
});
