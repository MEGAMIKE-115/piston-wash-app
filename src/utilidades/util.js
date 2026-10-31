// ╔══════════════════════════════════════════════════════════════╗
// ║  UTILIDADES
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Herramientas compartidas: seleccionar elementos, formatos de dinero/fecha, WhatsApp, rangos e insignias, avisos (toast) y ventanas (modal).
// QUÉ CAMBIAR:  Función de rangos (infoNivel) e insignia (insigniaRango).
// CABLES A:     configuracion/config.js

// Utilidades compartidas: DOM, formatos, WhatsApp, niveles, imágenes y modal.
import { NEGOCIO, RANGOS, LEYENDA, PASO_LEYENDA } from "../configuracion/config.js";

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

// Escapa texto del usuario antes de meterlo en innerHTML
export function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Solo deja pasar fotos que la propia app generó (JPEG en base64)
export function srcSeguro(valor) {
  return typeof valor === "string" && valor.startsWith("data:image/jpeg;base64,") ? valor : "";
}

// ===== Formatos =====
const formatoCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const cop = (n) => formatoCOP.format(Number(n) || 0);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function aFecha(valor) {
  if (!valor) return null;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (valor instanceof Date) return valor;
  const d = new Date(valor);
  return isNaN(d) ? null : d;
}
export function fechaCorta(valor) {
  const d = aFecha(valor);
  return d ? `${d.getDate()} ${MESES[d.getMonth()]}` : "—";
}
export function fechaLarga(valor) {
  const d = aFecha(valor);
  return d ? `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}` : "—";
}
export const nombreMes = (fecha) => `${MESES_LARGOS[fecha.getMonth()]} ${fecha.getFullYear()}`;

// "2026-10-10" + "10:00" → "10 oct, 10:00 a. m."
export function fechaDeseadaTexto(fecha, hora) {
  const d = fecha ? new Date(`${fecha}T00:00`) : null;
  let texto = d && !isNaN(d) ? `${d.getDate()} ${MESES[d.getMonth()]}` : "por definir";
  if (hora) {
    const h = new Date(`1970-01-01T${hora}`);
    if (!isNaN(h)) texto += `, ${h.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}`;
  }
  return texto;
}

export const primerNombre = (nombre) => String(nombre || "").trim().split(/\s+/)[0] || "cliente";

// ===== Teléfonos, placas y WhatsApp =====
export const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");

// Guardamos los celulares de 10 dígitos, sin +57 ni espacios
export function normalizarTelefono(s) {
  const d = soloDigitos(s);
  return d.length === 12 && d.startsWith("57") ? d.slice(2) : d;
}
export const normalizarPlaca = (s) => String(s ?? "").toUpperCase().replace(/[\s-]/g, "");

// Con número válido abre el chat; sin número abre WhatsApp para elegir contacto
export function waLink(telefono, texto) {
  let d = soloDigitos(telefono);
  if (d.length === 10) d = "57" + d;
  const destino = /^\d{11,13}$/.test(d) ? d : "";
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}
export const waNegocio = (texto) => waLink(NEGOCIO.whatsapp, texto);

// ===== Rangos (con divisiones y sin final) =====
const ROMANO = ["III", "II", "I"];

// Lista de pasos en orden. Cada paso: { id, rango, division, nombre, desde }
function pasoNumero(n) {
  // n = 0 es Leyenda 1
  return { id: LEYENDA.id, rango: LEYENDA.nombre, division: String(n + 1), nombre: `${LEYENDA.nombre} ${n + 1}`, desde: LEYENDA.desde + n * PASO_LEYENDA };
}
const PASOS = RANGOS.flatMap((r) =>
  r.desde.map((desde, i) => ({ id: r.id, rango: r.nombre, division: ROMANO[i], nombre: `${r.nombre} ${ROMANO[i]}`, desde }))
);

export function infoNivel(puntosAcumulados) {
  const total = Math.max(0, Number(puntosAcumulados) || 0);
  let actual;
  let siguiente;
  if (total >= LEYENDA.desde) {
    const n = Math.floor((total - LEYENDA.desde) / PASO_LEYENDA);
    actual = pasoNumero(n);
    siguiente = pasoNumero(n + 1);
  } else {
    let indice = 0;
    PASOS.forEach((p, i) => {
      if (total >= p.desde) indice = i;
    });
    actual = PASOS[indice];
    siguiente = PASOS[indice + 1] || { id: LEYENDA.id, rango: LEYENDA.nombre, division: "1", nombre: `${LEYENDA.nombre} 1`, desde: LEYENDA.desde };
  }
  const pct = Math.min(100, Math.max(0, Math.round(((total - actual.desde) / (siguiente.desde - actual.desde)) * 100)));
  return { actual, siguiente, faltan: Math.max(0, siguiente.desde - total), pct, total };
}

// Insignia (escudo) del rango; el color sale de las variables --rango-* del contenedor.
export function insigniaRango(paso, tam = 56) {
  const texto = paso.division;
  return `<svg class="insignia-rango" width="${tam}" height="${Math.round(tam * 1.125)}" viewBox="0 0 64 72" role="img" aria-label="Rango ${paso.nombre}">
    <path d="M32 3 58 12v24c0 16-12 27-26 33C18 63 6 52 6 36V12z" fill="var(--rango-acento, #e3b04b)" stroke="rgba(255,255,255,.75)" stroke-width="2"/>
    <path d="M32 9 52 16v20c0 12-9 21-20 26C21 57 12 48 12 36V16z" fill="var(--rango-2, #0a1a3a)"/>
    <path d="m32 17 4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.4L32 38.600l-8.400 4.500 1.600-9.400-6.900-6.700 9.500-1.400z" fill="var(--rango-acento, #e3b04b)"/>
    <text x="32" y="58" text-anchor="middle" font-family="Sora, sans-serif" font-weight="700" font-size="${texto.length > 2 ? 11 : 13}" fill="var(--rango-acento, #e3b04b)">${texto}</text>
  </svg>`;
}

// ===== Interfaz =====
let temporizadorToast;
export function toast(mensaje, tipo = "") {
  const el = $("#toast");
  el.textContent = mensaje;
  el.className = `visible ${tipo}`;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => (el.className = ""), 4000);
}

export async function ocupado(boton, textoOcupado, accion) {
  const original = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoOcupado;
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = original;
  }
}

export function mensajeEn(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.className = `msg ${tipo}`.trim();
}

const icono = (trazos) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trazos}</svg>`;
export const ICONOS = {
  cerrar: icono('<path d="M6 6l12 12M18 6L6 18"/>'),
  mas: icono('<path d="M12 5v14M5 12h14"/>'),
  whatsapp: icono('<path d="M4 20l1.5-4A8 8 0 1 1 8 18.5z"/>'),
  camara: icono('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  descargar: icono('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  salir: icono('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'),
  usuario: icono('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
};

// ===== Imágenes: comprimir para guardarlas en Firestore =====
function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

// Reduce el lado mayor y baja la calidad hasta que el texto base64 quepa en `maxCaracteres`
export async function comprimirImagen(archivo, ladoMayor, calidad, maxCaracteres) {
  const img = await cargarImagen(archivo);
  const escala = Math.min(1, ladoMayor / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  let q = calidad;
  let resultado = canvas.toDataURL("image/jpeg", q);
  while (resultado.length > maxCaracteres && q > 0.3) {
    q -= 0.1;
    resultado = canvas.toDataURL("image/jpeg", q);
  }
  return resultado;
}

// ===== Modal =====
function cerrarConEscape(e) {
  if (e.key === "Escape") cerrarModal();
}

export function abrirModal(titulo, cuerpoHTML) {
  const m = $("#modal");
  m.innerHTML = `
    <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <header class="modal-cabecera">
        <h2 id="modal-titulo">${esc(titulo)}</h2>
        <button type="button" class="icono-btn" data-cerrar-modal aria-label="Cerrar">${ICONOS.cerrar}</button>
      </header>
      <div class="modal-cuerpo">${cuerpoHTML}</div>
    </div>`;
  m.hidden = false;
  document.body.classList.add("modal-abierto");
  m.onclick = (e) => {
    if (e.target === m || e.target.closest("[data-cerrar-modal]")) cerrarModal();
  };
  document.addEventListener("keydown", cerrarConEscape);
  const primero = $("input, select, textarea, a.btn, button:not([data-cerrar-modal])", m) || $("[data-cerrar-modal]", m);
  primero.focus();
  return m;
}

export function cerrarModal() {
  const m = $("#modal");
  m.hidden = true;
  m.innerHTML = "";
  document.body.classList.remove("modal-abierto");
  document.removeEventListener("keydown", cerrarConEscape);
}
