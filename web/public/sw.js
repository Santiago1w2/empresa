const CACHE = "sac-estaticos-v1";

self.addEventListener("install", (evento) => {
  self.skipWaiting();
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
