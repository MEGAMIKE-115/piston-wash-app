// Fotos del antes y el después.
// Se comprimen en el celular y se guardan en Firestore (así no necesitas Firebase Storage ni plan de pago).
// Si algún día pasas a Blaze y quieres Storage, solo cambia las 3 funciones de este archivo.
import { db, collection, doc, getDocs } from "./firebase.js";
import { comprimirImagen } from "./util.js";

export const MAX_FOTOS_POR_TIPO = 3;

// Foto completa (se ve en el reporte) + miniatura (se ve en el feed y en la galería)
export async function prepararFoto(archivo) {
  const completa = await comprimirImagen(archivo, 1000, 0.7, 170000);
  const mini = await comprimirImagen(archivo, 420, 0.6, 45000);
  return { completa, mini };
}

// Agrega las fotos completas como subcolección del servicio, dentro del mismo batch
export function agregarFotosAlBatch(batch, refServicio, tipo, fotos) {
  fotos.forEach((foto, orden) => {
    batch.set(doc(collection(refServicio, "fotos")), { tipo, orden, data: foto.completa });
  });
}

export async function leerFotos(servicioId) {
  const resultado = { antes: [], despues: [] };
  const snap = await getDocs(collection(db, "diagnosticos", servicioId, "fotos"));
  snap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .forEach((f) => {
      if (resultado[f.tipo]) resultado[f.tipo].push(f.data);
    });
  return resultado;
}
