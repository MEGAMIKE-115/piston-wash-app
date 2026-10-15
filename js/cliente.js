// Vista del cliente: inicio (feed), reporte, vehículos, puntos y solicitar servicio.
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "./firebase.js";
import { NEGOCIO, TIPOS_VEHICULO } from "./config.js";
import {
  $,
  $$,
  esc,
  cop,
  aFecha,
  fechaCorta,
  fechaDeseadaTexto,
  primerNombre,
  infoNivel,
  normalizarPlaca,
  normalizarTelefono,
  srcSeguro,
  toast,
  ocupado,
  mensajeEn,
  waLink,
  waNegocio,
  abrirModal,
  cerrarModal,
  ICONOS,
} from "./util.js";
import { leerFotos } from "./fotos.js";
import { salir } from "./auth.js";
import { htmlReporte, accionesReporte, activarImpresion, nombreVehiculo, resumenServicios, textoCompartir, figuraFoto } from "./reporte.js";

let ctx = null; // { user, perfil }
let cache = {}; // servicios, vehiculos, catalogo, premios, canjes, solicitudes

const principal = () => $("#cliente-main");
const porFechaDesc = (campo) => (a, b) => (aFecha(b[campo]) || new Date()) - (aFecha(a[campo]) || new Date());

// ===== Carga de datos (cada cliente solo puede leer lo suyo; lo imponen las reglas de Firestore) =====
async function cargarPerfil() {
  const snap = await getDoc(doc(db, "clientes", ctx.user.uid));
  if (snap.exists()) ctx.perfil = { id: snap.id, ...snap.data() };
  return ctx.perfil;
}

async function propios(coleccion, clave, forzar = false) {
  if (cache[clave] && !forzar) return cache[clave];
  const snap = await getDocs(query(collection(db, coleccion), where("clienteId", "==", ctx.user.uid)));
  cache[clave] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cache[clave];
}

const cargarServicios = async (forzar) => (await propios("diagnosticos", "servicios", forzar)).sort(porFechaDesc("fecha"));
const cargarVehiculos = async (forzar) => (await propios("vehiculos", "vehiculos", forzar)).sort(porFechaDesc("creado"));
const cargarCanjes = async (forzar) => (await propios("canjes", "canjes", forzar)).sort(porFechaDesc("fecha"));
const cargarSolicitudes = async (forzar) => (await propios("solicitudes", "solicitudes", forzar)).sort(porFechaDesc("creada"));

async function cargarLista(coleccion, clave, soloActivos = true) {
  if (cache[clave]) return cache[clave];
  const snap = await getDocs(collection(db, coleccion));
  cache[clave] = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((x) => !soloActivos || x.activo !== false)
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  return cache[clave];
}
const cargarCatalogo = () => cargarLista("servicios_catalogo", "catalogo");
const cargarPremios = () => cargarLista("premios", "premios");

// ===== Navegación =====
export function iniciarCliente(user, perfil) {
  ctx = { user, perfil };
  cache = {};
  $("#cliente-saludo").textContent = `Hola, ${primerNombre(perfil.nombre)}`;
  $("#btn-cliente-salir").onclick = salir;
  $("#btn-cliente-perfil").onclick = abrirModalPerfil;
  $$("#cliente-nav [data-vista]").forEach((b) => (b.onclick = () => irA(b.dataset.vista)));
  irA("inicio");
}

const vistas = { inicio: vistaInicio, vehiculos: vistaVehiculos, puntos: vistaPuntos, solicitar: vistaSolicitar, reporte: vistaReporte };

async function irA(nombre, parametros = {}) {
  const navActiva = nombre === "reporte" ? "inicio" : nombre;
  $$("#cliente-nav [data-vista]").forEach((b) => {
    if (b.dataset.vista === navActiva) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  principal().innerHTML = `<p class="cargando">Cargando…</p>`;
  window.scrollTo(0, 0);
  try {
    await vistas[nombre](parametros);
  } catch (error) {
    console.error(`Vista ${nombre}:`, error);
    principal().innerHTML = `<div class="vacio"><p>No se pudo cargar esta pantalla. Revisa tu conexión.</p><button type="button" class="btn btn-secundario" data-reintentar>Reintentar</button></div>`;
    $("[data-reintentar]", principal()).onclick = () => irA(nombre, parametros);
  }
}

// ===== Piezas compartidas =====
function tarjetaNivel(perfil) {
  const nv = infoNivel(perfil.puntosAcumulados);
  return `<section class="nivel-card" aria-label="Tu nivel y puntos">
    <div class="nivel-top">
      <span class="nivel-nombre">NIVEL ${esc(nv.actual.nombre.toUpperCase())}</span>
      <span>${perfil.serviciosTotal || 0} servicios</span>
    </div>
    <p class="nivel-puntos">${perfil.puntosDisponibles || 0} <small>puntos</small></p>
    <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${nv.pct}" aria-label="Progreso al siguiente nivel"><span style="width:${nv.pct}%"></span></div>
    <p class="nivel-nota">${nv.siguiente ? `${nv.faltan} puntos más para el nivel ${esc(nv.siguiente.nombre)}` : "Nivel máximo alcanzado"}</p>
  </section>`;
}

const ETIQUETA_SOLICITUD = { nueva: "Enviada", confirmada: "Confirmada", hecha: "Realizada", cancelada: "Cancelada" };
const ETIQUETA_CANJE = { pendiente: "Por entregar", entregado: "Entregado", rechazado: "Rechazado" };

// ===== 1. Inicio =====
function tarjetaServicio(d) {
  const portada = d.portada || {};
  const hayFotos = portada.antes || portada.despues;
  const insignia =
    d.estadoPago === "pendiente"
      ? `<span class="badge badge-aviso">Pago por confirmar</span>`
      : d.puntosGanados
        ? `<span class="badge badge-ok">+${d.puntosGanados} pts</span>`
        : "";
  return `<article class="servicio-card">
    <div class="servicio-cabecera">
      <div>
        <h3>${esc(nombreVehiculo(d))}</h3>
        <p class="meta">${esc(fechaCorta(d.fecha))} · ${esc(resumenServicios(d))}</p>
      </div>
      ${insignia}
    </div>
    ${hayFotos ? `<div class="antes-despues">${figuraFoto(portada.antes, "antes")}${figuraFoto(portada.despues, "despues")}</div>` : ""}
    <div class="servicio-pie">
      <strong>${cop(d.total)}</strong>
      <button type="button" class="link" data-reporte="${esc(d.id)}">Ver reporte ›</button>
    </div>
  </article>`;
}

async function vistaInicio() {
  const [perfil, servicios] = await Promise.all([cargarPerfil(), cargarServicios(true)]);
  principal().innerHTML = `
    ${tarjetaNivel(perfil)}
    <h2 class="titulo-seccion">Tus servicios</h2>
    ${
      servicios.length
        ? servicios.map(tarjetaServicio).join("")
        : `<div class="vacio"><p>Aún no tienes servicios registrados.</p><button type="button" class="btn btn-primario" data-ir="solicitar">Solicitar mi primer servicio</button></div>`
    }`;
  $$("[data-reporte]", principal()).forEach((b) => (b.onclick = () => irA("reporte", { id: b.dataset.reporte })));
  $$("[data-ir]", principal()).forEach((b) => (b.onclick = () => irA(b.dataset.ir)));
}

// ===== 2. Reporte =====
async function vistaReporte({ id }) {
  let d = (cache.servicios || []).find((s) => s.id === id);
  if (!d) {
    const snap = await getDoc(doc(db, "diagnosticos", id));
    if (!snap.exists()) throw new Error("Reporte no encontrado");
    d = { id: snap.id, ...snap.data() };
  }
  const fotos = await leerFotos(id).catch(() => ({ antes: [], despues: [] }));
  principal().innerHTML = `
    <div class="no-print"><button type="button" class="link" data-volver>‹ Volver a mis servicios</button></div>
    ${htmlReporte(d, fotos, { conSolicitar: true })}
    ${accionesReporte(waLink("", textoCompartir(d)))}`;
  $("[data-volver]", principal()).onclick = () => irA("inicio");
  $$("[data-solicitar]", principal()).forEach((b) => (b.onclick = () => irA("solicitar", { servicio: b.dataset.solicitar })));
  activarImpresion(d);
}

// ===== 3. Vehículos =====
async function vistaVehiculos() {
  const [vehiculos, servicios] = await Promise.all([cargarVehiculos(true), cargarServicios()]);
  const nombreTipo = (id) => TIPOS_VEHICULO.find((t) => t.id === id)?.nombre || "Vehículo";
  principal().innerHTML = `
    <h2 class="titulo-seccion">Mis vehículos</h2>
    ${
      vehiculos.length
        ? vehiculos
            .map((v) => {
              const hechos = servicios.filter((s) => s.vehiculoId === v.id);
              const ultimo = hechos[0];
              return `<article class="vehiculo-card">
                <div>
                  <h3>${esc([v.marca, v.modelo].filter(Boolean).join(" ") || nombreTipo(v.tipo))}</h3>
                  ${v.placa ? `<span class="placa">${esc(v.placa)}</span>` : ""}
                  <p class="meta">${esc(nombreTipo(v.tipo))} · ${hechos.length} servicio${hechos.length === 1 ? "" : "s"}${ultimo ? ` · último: ${esc(fechaCorta(ultimo.fecha))}` : ""}</p>
                </div>
              </article>`;
            })
            .join("")
        : `<div class="vacio"><p>Aún no registras vehículos.</p></div>`
    }
    <button type="button" class="btn btn-secundario btn-ancho" id="btn-agregar-vehiculo">${ICONOS.mas} Agregar vehículo</button>
    <p class="meta nota">Cada vehículo tiene su propio historial de reportes con fotos del antes y el después.</p>`;
  $("#btn-agregar-vehiculo").onclick = abrirModalVehiculo;
}

function abrirModalVehiculo() {
  abrirModal(
    "Agregar vehículo",
    `<form id="form-vehiculo" class="stack" novalidate>
      <div class="campo"><label for="veh-tipo">Tipo</label>
        <select id="veh-tipo">${TIPOS_VEHICULO.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("")}</select></div>
      <div class="grid-2">
        <div class="campo"><label for="veh-marca">Marca</label><input id="veh-marca" type="text" autocomplete="off" placeholder="Mazda"></div>
        <div class="campo"><label for="veh-modelo">Modelo</label><input id="veh-modelo" type="text" autocomplete="off" placeholder="3"></div>
      </div>
      <div class="campo"><label for="veh-placa" id="veh-placa-label">Placa</label><input id="veh-placa" type="text" autocomplete="off" placeholder="ABC123"></div>
      <p id="veh-msg" class="msg" role="alert"></p>
      <button type="submit" class="btn btn-primario" id="btn-veh-guardar">Guardar</button>
    </form>`
  );
  $("#veh-tipo").onchange = () => {
    $("#veh-placa-label").textContent = $("#veh-tipo").value === "mueble" ? "Referencia (opcional)" : "Placa";
  };
  $("#form-vehiculo").onsubmit = async (e) => {
    e.preventDefault();
    const tipo = $("#veh-tipo").value;
    const marca = $("#veh-marca").value.trim();
    const modelo = $("#veh-modelo").value.trim();
    const placa = normalizarPlaca($("#veh-placa").value);
    const msg = $("#veh-msg");
    if (!marca) return mensajeEn(msg, "Escribe la marca.", "error");
    if (tipo !== "mueble" && placa.length < 5) return mensajeEn(msg, "Escribe la placa.", "error");
    await ocupado($("#btn-veh-guardar"), "Guardando...", async () => {
      try {
        await addDoc(collection(db, "vehiculos"), { clienteId: ctx.user.uid, tipo, marca, modelo, placa, creado: serverTimestamp() });
        cerrarModal();
        toast("Vehículo guardado.", "ok");
        irA("vehiculos");
      } catch (error) {
        console.error("Vehículo:", error);
        mensajeEn(msg, "No se pudo guardar. Intenta de nuevo.", "error");
      }
    });
  };
}

// ===== 4. Puntos y premios =====
function insignias(perfil, servicios) {
  const nv = infoNivel(perfil.puntosAcumulados);
  return [
    { nombre: "Primera lavada", logrado: (perfil.serviciosTotal || 0) >= 1 },
    { nombre: "Cliente frecuente (5 servicios)", logrado: (perfil.serviciosTotal || 0) >= 5 },
    { nombre: "Nivel Oro", logrado: nv.actual.nombre === "Oro" },
  ].map(
    (i) => `<li class="insignia ${i.logrado ? "lograda" : ""}">
      <span class="insignia-circulo" aria-hidden="true">${i.logrado ? "★" : "·"}</span>
      <span>${esc(i.nombre)}<span class="sr-only">${i.logrado ? " (lograda)" : " (pendiente)"}</span></span>
    </li>`
  );
}

async function vistaPuntos() {
  const [perfil, premios, canjes, servicios] = await Promise.all([cargarPerfil(), cargarPremios(), cargarCanjes(true), cargarServicios()]);
  const reservados = canjes.filter((c) => c.estado === "pendiente").reduce((s, c) => s + (c.puntos || 0), 0);
  const libres = (perfil.puntosDisponibles || 0) - reservados;

  principal().innerHTML = `
    ${tarjetaNivel(perfil)}
    <h2 class="titulo-seccion">Premios</h2>
    ${
      premios.length
        ? premios
            .map((p) => {
              const alcanza = libres >= p.puntos;
              return `<div class="premio-fila">
                <div><strong>${esc(p.nombre)}</strong><span class="meta">${p.puntos} puntos</span></div>
                ${
                  alcanza
                    ? `<button type="button" class="btn btn-primario btn-chico" data-canjear="${esc(p.id)}">Canjear</button>`
                    : `<span class="faltan">Faltan ${p.puntos - Math.max(libres, 0)}</span>`
                }
              </div>`;
            })
            .join("")
        : `<div class="vacio"><p>Pronto tendremos premios para ti.</p></div>`
    }
    ${reservados ? `<p class="meta nota">Tienes ${reservados} puntos reservados en canjes por entregar.</p>` : ""}
    ${
      canjes.length
        ? `<h2 class="titulo-seccion">Tus canjes</h2>${canjes
            .map(
              (c) => `<div class="premio-fila"><div><strong>${esc(c.premioNombre)}</strong><span class="meta">${esc(fechaCorta(c.fecha))} · ${c.puntos} puntos</span></div><span class="badge ${c.estado === "entregado" ? "badge-ok" : "badge-aviso"}">${esc(ETIQUETA_CANJE[c.estado] || c.estado)}</span></div>`
            )
            .join("")}`
        : ""
    }
    <h2 class="titulo-seccion">Insignias</h2>
    <ul class="insignias">${insignias(perfil, servicios).join("")}</ul>`;

  $$("[data-canjear]", principal()).forEach((b) => {
    b.onclick = () => canjear(premios.find((p) => p.id === b.dataset.canjear), perfil);
  });
}

async function canjear(premio, perfil) {
  if (!premio || !confirm(`¿Canjear «${premio.nombre}» por ${premio.puntos} puntos?`)) return;
  try {
    await addDoc(collection(db, "canjes"), {
      clienteId: ctx.user.uid,
      clienteNombre: perfil.nombre,
      premioId: premio.id,
      premioNombre: premio.nombre,
      puntos: premio.puntos,
      estado: "pendiente",
      fecha: serverTimestamp(),
    });
  } catch (error) {
    console.error("Canje:", error);
    return toast("No se pudo registrar el canje. Revisa que te alcancen los puntos.", "error");
  }
  cache.canjes = null;
  const mensaje = `Hola ${NEGOCIO.nombre}, soy ${perfil.nombre}. Quiero canjear mi premio «${premio.nombre}» (${premio.puntos} puntos).`;
  abrirModal(
    "Canje solicitado",
    `<p>Quedó registrado. Te lo entregamos en tu próximo servicio. Si quieres, avísanos por WhatsApp.</p>
     <a class="btn btn-primario btn-ancho" target="_blank" rel="noopener" href="${esc(waNegocio(mensaje))}">${ICONOS.whatsapp} Avisar por WhatsApp</a>`
  );
  vistaPuntos();
}

// ===== 5. Solicitar servicio =====
async function vistaSolicitar({ servicio = "" } = {}) {
  const [vehiculos, catalogo, solicitudes] = await Promise.all([cargarVehiculos(true), cargarCatalogo(), cargarSolicitudes(true)]);

  if (!vehiculos.length) {
    principal().innerHTML = `
      <h2 class="titulo-seccion">Solicitar servicio</h2>
      <div class="vacio"><p>Primero registra tu vehículo para poder solicitar un servicio.</p>
      <button type="button" class="btn btn-primario" data-ir="vehiculos">Registrar vehículo</button></div>`;
    $("[data-ir]", principal()).onclick = () => irA("vehiculos");
    return;
  }

  const hoy = new Date();
  const minFecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const nombreVeh = (v) => [[v.marca, v.modelo].filter(Boolean).join(" "), v.placa].filter(Boolean).join(" · ") || "Vehículo";

  principal().innerHTML = `
    <h2 class="titulo-seccion">Solicitar servicio</h2>
    <form id="form-solicitud" class="card stack" novalidate>
      <div class="campo"><label for="sol-vehiculo">Vehículo</label>
        <select id="sol-vehiculo">${vehiculos.map((v) => `<option value="${esc(v.id)}">${esc(nombreVeh(v))}</option>`).join("")}</select></div>
      <div class="campo"><label for="sol-servicio">Servicio</label>
        ${
          catalogo.length
            ? `<select id="sol-servicio">${
                servicio && !catalogo.some((c) => c.nombre === servicio) ? `<option value="${esc(servicio)}" selected>${esc(servicio)} (te cotizamos)</option>` : ""
              }${catalogo
                .map((c) => `<option value="${esc(c.nombre)}" ${c.nombre === servicio ? "selected" : ""}>${esc(c.nombre)} · ${cop(c.precio)}</option>`)
                .join("")}<option value="Otro (cotizar por WhatsApp)">Otro (te cotizamos por WhatsApp)</option></select>`
            : `<input id="sol-servicio" type="text" value="${esc(servicio)}" placeholder="¿Qué servicio necesitas?" autocomplete="off">`
        }</div>
      <div class="grid-2">
        <div class="campo"><label for="sol-fecha">Fecha deseada</label><input id="sol-fecha" type="date" min="${minFecha}"></div>
        <div class="campo"><label for="sol-hora">Hora</label><input id="sol-hora" type="time"></div>
      </div>
      <div class="campo"><label for="sol-direccion">Dirección</label><input id="sol-direccion" type="text" autocomplete="street-address" placeholder="Calle 10 # 5-20, barrio"></div>
      <div class="campo"><label for="sol-notas">Notas (opcional)</label><textarea id="sol-notas" rows="2" placeholder="Ej: tiene manchas en el asiento trasero"></textarea></div>
      <p id="sol-msg" class="msg" role="alert"></p>
      <button type="submit" class="btn btn-primario btn-ancho" id="btn-solicitar">${ICONOS.whatsapp} Enviar solicitud</button>
      <p class="meta nota">Guardamos tu solicitud y se abre WhatsApp con el mensaje ya escrito.</p>
    </form>
    <div id="sol-resultado"></div>
    ${
      solicitudes.length
        ? `<h2 class="titulo-seccion">Tus solicitudes</h2>${solicitudes
            .slice(0, 8)
            .map(
              (s) => `<div class="premio-fila"><div><strong>${esc(s.servicio)}</strong><span class="meta">${esc(s.vehiculoResumen)} · ${esc(fechaDeseadaTexto(s.fechaDeseada, s.hora))}</span></div><span class="badge ${s.estado === "confirmada" || s.estado === "hecha" ? "badge-ok" : "badge-aviso"}">${esc(ETIQUETA_SOLICITUD[s.estado] || s.estado)}</span></div>`
            )
            .join("")}`
        : ""
    }`;

  $("#form-solicitud").onsubmit = async (e) => {
    e.preventDefault();
    const vehiculo = vehiculos.find((v) => v.id === $("#sol-vehiculo").value);
    const datos = {
      servicio: $("#sol-servicio").value.trim(),
      fechaDeseada: $("#sol-fecha").value,
      hora: $("#sol-hora").value,
      direccion: $("#sol-direccion").value.trim(),
      notas: $("#sol-notas").value.trim(),
    };
    const msg = $("#sol-msg");
    if (!datos.servicio) return mensajeEn(msg, "Elige el servicio.", "error");
    if (!datos.fechaDeseada) return mensajeEn(msg, "Elige la fecha que prefieres.", "error");
    if (datos.direccion.length < 5) return mensajeEn(msg, "Escribe la dirección donde te atendemos.", "error");
    mensajeEn(msg, "");

    await ocupado($("#btn-solicitar"), "Enviando...", async () => {
      try {
        await addDoc(collection(db, "solicitudes"), {
          clienteId: ctx.user.uid,
          clienteNombre: ctx.perfil.nombre,
          clienteTelefono: ctx.perfil.telefono,
          vehiculoId: vehiculo.id,
          vehiculoResumen: nombreVeh(vehiculo),
          ...datos,
          estado: "nueva",
          creada: serverTimestamp(),
        });
      } catch (error) {
        console.error("Solicitud:", error);
        return mensajeEn(msg, "No se pudo enviar. Intenta de nuevo.", "error");
      }
      cache.solicitudes = null;
      const texto = [
        `Hola ${NEGOCIO.nombre}, quiero solicitar un servicio:`,
        `• Servicio: ${datos.servicio}`,
        `• Vehículo: ${nombreVeh(vehiculo)}`,
        `• Fecha: ${fechaDeseadaTexto(datos.fechaDeseada, datos.hora)}`,
        `• Dirección: ${datos.direccion}`,
        datos.notas ? `• Notas: ${datos.notas}` : "",
        `Soy ${ctx.perfil.nombre}.`,
      ]
        .filter(Boolean)
        .join("\n");
      $("#form-solicitud").hidden = true;
      $("#sol-resultado").innerHTML = `<div class="card stack">
        <h3>Solicitud guardada</h3>
        <p>Último paso: envíanos el mensaje por WhatsApp para que lo confirmemos.</p>
        <a class="btn btn-primario btn-ancho" target="_blank" rel="noopener" href="${esc(waNegocio(texto))}">${ICONOS.whatsapp} Enviar por WhatsApp</a>
        <button type="button" class="link" id="btn-sol-otra">Hacer otra solicitud</button>
      </div>`;
      $("#btn-sol-otra").onclick = () => irA("solicitar");
    });
  };
}

// ===== Perfil =====
function abrirModalPerfil() {
  const p = ctx.perfil;
  abrirModal(
    "Mi perfil",
    `<form id="form-mi-perfil" class="stack" novalidate>
      <div class="campo"><label for="mp-nombre">Nombre</label><input id="mp-nombre" type="text" value="${esc(p.nombre)}" autocomplete="name"></div>
      <div class="campo"><label for="mp-telefono">Celular</label><input id="mp-telefono" type="tel" inputmode="numeric" value="${esc(p.telefono)}" autocomplete="tel"></div>
      <label class="check"><input type="checkbox" id="mp-fotos" ${p.autorizaFotos ? "checked" : ""}><span>Autorizo mostrar las fotos de mis servicios (sin placa) en la galería de MG Washers.</span></label>
      <p class="meta">Correo: ${esc(p.email)}</p>
      <p id="mp-msg" class="msg" role="alert"></p>
      <button type="submit" class="btn btn-primario" id="btn-mp-guardar">Guardar</button>
    </form>`
  );
  $("#form-mi-perfil").onsubmit = async (e) => {
    e.preventDefault();
    const nombre = $("#mp-nombre").value.trim();
    const telefono = normalizarTelefono($("#mp-telefono").value);
    const msg = $("#mp-msg");
    if (nombre.length < 3) return mensajeEn(msg, "Escribe tu nombre completo.", "error");
    if (!/^\d{10}$/.test(telefono)) return mensajeEn(msg, "Escribe tu celular de 10 dígitos.", "error");
    await ocupado($("#btn-mp-guardar"), "Guardando...", async () => {
      try {
        const cambios = { nombre, telefono, autorizaFotos: $("#mp-fotos").checked };
        await updateDoc(doc(db, "clientes", ctx.user.uid), cambios);
        ctx.perfil = { ...ctx.perfil, ...cambios };
        $("#cliente-saludo").textContent = `Hola, ${primerNombre(nombre)}`;
        cerrarModal();
        toast("Perfil actualizado.", "ok");
      } catch (error) {
        console.error("Perfil:", error);
        mensajeEn(msg, "No se pudo guardar. Intenta de nuevo.", "error");
      }
    });
  };
}
