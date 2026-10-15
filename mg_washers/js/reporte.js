// Reporte de servicio: lo usan el cliente (su historial) y el admin (al revisar).
import { esc, cop, fechaLarga, aFecha, srcSeguro, ICONOS } from "./util.js";
import { NEGOCIO } from "./config.js";

// Los servicios viejos (solo moto) tienen marca/modelo/placa sueltos
export function nombreVehiculo(d) {
  if (d.vehiculoResumen) return d.vehiculoResumen;
  const modelo = [d.marca, d.modelo].filter(Boolean).join(" ");
  return [modelo, d.placa].filter(Boolean).join(" · ") || "Servicio";
}

export function partesDe(d) {
  const items = Array.isArray(d.items) ? d.items : [];
  const extras = Array.isArray(d.extras) ? d.extras : Array.isArray(d.repuestos) ? d.repuestos : [];
  return { items, extras };
}

export function resumenServicios(d) {
  const { items, extras } = partesDe(d);
  return [...items, ...extras].map((i) => i.nombre).filter(Boolean).join(", ") || "Servicio";
}

export function textoCompartir(d) {
  const lineas = [
    `${NEGOCIO.nombre} - Reporte de servicio`,
    `${nombreVehiculo(d)}`,
    `${fechaLarga(d.fecha) === "—" ? "" : fechaLarga(d.fecha)} · ${resumenServicios(d)}`,
    `Total: ${cop(d.total)}`,
  ];
  if (d.estadoEncontrado) lineas.push(`Estado encontrado: ${d.estadoEncontrado}`);
  (d.recomendaciones || []).forEach((r) => lineas.push(`Recomendado: ${r.texto}`));
  return lineas.join("\n");
}

export function figuraFoto(src, tipo) {
  const etiqueta = tipo === "antes" ? "ANTES" : "DESPUÉS";
  const alt = tipo === "antes" ? "Foto antes del servicio" : "Foto después del servicio";
  const imagen = srcSeguro(src);
  return `<figure class="ad-foto">
    ${imagen ? `<img src="${imagen}" alt="${alt}">` : `<div class="ad-vacio">Sin foto</div>`}
    <figcaption class="ad-etiqueta ${tipo}">${etiqueta}</figcaption>
  </figure>`;
}

function bloqueFotos(titulo, tipo, lista) {
  if (!lista.length) return "";
  return `<div class="reporte-fotos"><h4>${titulo}</h4><div class="reporte-fotos-fila">${lista.map((s) => figuraFoto(s, tipo)).join("")}</div></div>`;
}

// fotos = { antes: [dataURL], despues: [dataURL] }
export function htmlReporte(d, fotos, { conSolicitar = false } = {}) {
  const { items, extras } = partesDe(d);
  const lineas = [...items, ...extras].filter((i) => i.nombre);
  const fecha = aFecha(d.fecha) || new Date();
  const antes = fotos.antes.length ? fotos.antes : d.portada?.antes ? [d.portada.antes] : [];
  const despues = fotos.despues.length ? fotos.despues : d.portada?.despues ? [d.portada.despues] : [];
  const pendiente = d.estadoPago === "pendiente";

  const puntos = pendiente
    ? `<p class="meta">Los puntos se suman cuando se confirma el pago.</p>`
    : d.puntosGanados
      ? `<p class="reporte-puntos">+${d.puntosGanados} puntos</p>`
      : "";

  const recomendaciones = (d.recomendaciones || [])
    .map((r) => {
      const sugerida = new Date(fecha.getTime() + (Number(r.dias) || 0) * 86400000);
      return `<li class="reco">
        <div><strong>${esc(r.texto)}</strong><span class="meta">Sugerido para el ${esc(fechaLarga(sugerida))}</span></div>
        ${conSolicitar ? `<button type="button" class="btn btn-gold btn-chico no-print" data-solicitar="${esc(r.texto)}">Solicitar</button>` : ""}
      </li>`;
    })
    .join("");

  return `
  <article class="reporte" id="reporte-doc">
    <header class="reporte-cabecera">
      <p class="reporte-marca">${esc(NEGOCIO.nombre.toUpperCase())}</p>
      <h2>${esc(nombreVehiculo(d))}</h2>
      <p class="meta">${esc(fechaLarga(fecha))} · ${esc(resumenServicios(d))}</p>
      <p>
        <span class="badge badge-ok">Terminado</span>
        ${pendiente ? `<span class="badge badge-aviso">Pago por confirmar</span>` : ""}
      </p>
    </header>

    <div class="reporte-total"><span>Total</span><strong>${cop(d.total)}</strong></div>
    ${puntos}

    ${bloqueFotos("Antes", "antes", antes)}
    ${bloqueFotos("Después", "despues", despues)}

    ${
      lineas.length
        ? `<section class="reporte-seccion"><h3>Detalle</h3><ul class="detalle">${lineas
            .map((i) => `<li><span>${esc(i.nombre)}</span><span>${i.precio != null || i.costo != null ? cop(i.precio ?? i.costo) : ""}</span></li>`)
            .join("")}</ul></section>`
        : ""
    }

    ${d.estadoEncontrado ? `<section class="reporte-seccion"><h3>Estado encontrado</h3><p class="texto-libre">${esc(d.estadoEncontrado)}</p></section>` : ""}

    ${recomendaciones ? `<section class="reporte-seccion"><h3>Recomendaciones</h3><ul class="recos">${recomendaciones}</ul></section>` : ""}

    <footer class="reporte-pie">
      ${d.atendidoPor ? `<p class="meta">Atendido por ${esc(d.atendidoPor)}</p>` : ""}
      <p class="meta">${esc(NEGOCIO.nombre)} · ${esc(NEGOCIO.ciudad)}</p>
    </footer>
  </article>`;
}

// Botones de PDF y compartir (se usan debajo del reporte)
export function accionesReporte(waHref) {
  return `<div class="acciones-reporte no-print">
    <button type="button" class="btn btn-secundario" id="btn-pdf">${ICONOS.descargar} Descargar PDF</button>
    <a class="btn btn-primario" target="_blank" rel="noopener" href="${esc(waHref)}">${ICONOS.whatsapp} Compartir por WhatsApp</a>
  </div>`;
}

// El PDF sale del diálogo de impresión del navegador ("Guardar como PDF")
export function activarImpresion(d) {
  const boton = document.getElementById("btn-pdf");
  if (!boton) return;
  boton.onclick = () => {
    const tituloOriginal = document.title;
    document.title = `Reporte ${NEGOCIO.nombre} - ${nombreVehiculo(d)}`;
    window.addEventListener("afterprint", () => (document.title = tituloOriginal), { once: true });
    window.print();
  };
}
