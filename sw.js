// Service worker de MG Washers: la app abre al instante y el cascarón funciona sin internet.
// Los datos (Firestore) nunca pasan por aquí: siempre vienen de la nube.
// Para publicar cambios: sube el número de VERSION.
const VERSION = "mg-v9";
const CASCARON = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "estilos/01-variables-y-base.css",
  "estilos/02-piezas-basicas.css",
  "estilos/03-botones.css",
  "estilos/04-insignias-y-avisos.css",
  "estilos/05-pantalla-acceso.css",
  "estilos/06-estructura-app.css",
  "estilos/07-cliente.css",
  "estilos/08-reporte.css",
  "estilos/09-panel-admin.css",
  "estilos/10-modal.css",
  "estilos/11-impresion-pdf.css",
  "estilos/12-textos-largos.css",
  "estilos/13-aviso-instalar.css",
  "estilos/14-tema-azul-dorado.css",
  "estilos/15-rangos-y-colores.css",
  "src/admin/admin.js",
  "src/autenticacion/auth.js",
  "src/cliente/cliente.js",
  "src/conexion/firebase.js",
  "src/configuracion/config.js",
  "src/galeria/galeria.js",
  "src/instalacion/instalar.js",
  "src/main.js",
  "src/reportes/reporte.js",
  "src/utilidades/fotos.js",
  "src/utilidades/util.js",
  "assets/iconos/icon-192.png",
  "assets/iconos/icon-512.png",
  "assets/iconos/logo.png",
  "assets/iconos/logo-grande.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => Promise.all(CASCARON.map((u) => cache.add(u).catch(() => null)))).then(() => self.skipWaiting()));
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
