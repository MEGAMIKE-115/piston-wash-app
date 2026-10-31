// ╔══════════════════════════════════════════════════════════════╗
// ║  GALERÍA PÚBLICA
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Muestra en la pantalla de acceso las fotos de servicios que los clientes autorizaron.
// QUÉ CAMBIAR:  Cantidad de fotos y diseño de la galería.
// CABLES A:     conexion/firebase.js · utilidades/util.js

// Galería pública: antes/después de clientes que autorizaron mostrar sus fotos (sin placas).
import { db, collection, getDocs, query, orderBy, limit } from "../conexion/firebase.js";
import { $, esc, fechaCorta, srcSeguro } from "../utilidades/util.js";

export async function cargarGaleria() {
  const seccion = $("#galeria-publica");
  const lista = $("#galeria-lista");
  try {
    const snap = await getDocs(query(collection(db, "galeria"), orderBy("fecha", "desc"), limit(8)));
    if (snap.empty) {
      seccion.hidden = true;
      return;
    }
    lista.innerHTML = snap.docs
      .map((d) => {
        const g = d.data();
        return `<figure class="galeria-item">
          <div class="galeria-par">
            <img src="${srcSeguro(g.antes)}" alt="Antes">
            <img src="${srcSeguro(g.despues)}" alt="Después">
          </div>
          <figcaption>${esc(g.servicio)} · ${esc(fechaCorta(g.fecha))}</figcaption>
        </figure>`;
      })
      .join("");
    seccion.hidden = false;
  } catch (error) {
    console.warn("Galería no disponible:", error.code || error);
    seccion.hidden = true;
  }
}
