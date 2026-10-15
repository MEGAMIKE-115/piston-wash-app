// Service worker de MG Washers: la app abre al instante y el cascarón funciona sin internet.
// Los datos (Firestore) nunca pasan por aquí: siempre vienen de la nube.
// Para publicar cambios: sube el número de VERSION.
const VERSION = "mg-v1";
const CASCARON = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "js/config.js",
  "js/firebase.js",
  "js/util.js",
  "js/fotos.js",
  "js/reporte.js",
  "js/auth.js",
  "js/galeria.js",
  "js/cliente.js",
  "js/admin.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CASCARON)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // SDK de Firebase (versionado en la URL): primero caché
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    evento.respondWith(
      caches.match(request).then(
        (guardado) =>
          guardado ||
          fetch(request).then((respuesta) => {
            const copia = respuesta.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copia));
            return respuesta;
          })
      )
    );
    return;
  }

  // Archivos propios: primero la red (para ver cambios nuevos) y, si no hay internet, la caché
  if (url.origin === self.location.origin) {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copia));
          return respuesta;
        })
        .catch(() => caches.match(request).then((guardado) => guardado || caches.match("index.html")))
    );
  }
  // Todo lo demás (Firestore, Auth, Google Fonts) va directo a la red
});
