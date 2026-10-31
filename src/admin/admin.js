// ╔══════════════════════════════════════════════════════════════╗
// ║  PANEL JEFE / EMPLEADO
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     El panel de administración: nuevo servicio, clientes, solicitudes, recordatorios, ingresos, premios y catálogo. Cada pestaña es una función vistaXxx().
// QUÉ CAMBIAR:  Una pestaña nueva = agregarla en la lista de pestañas y crear su función vista.
// CABLES A:     conexion/firebase.js · configuracion/config.js · utilidades · reportes/reporte.js

// Panel del personal. Empleado: servicios, clientes, solicitudes y recordatorios.
// Jefe: además premios/canjes, ingresos (con confirmación de pagos) y catálogo.
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  runTransaction,
} from "../conexion/firebase.js";
import { NEGOCIO, PUNTOS_POR_PESOS, TIPOS_VEHICULO, METODOS_PAGO, CATALOGO_INICIAL, PREMIOS_INICIALES } from "../configuracion/config.js";
import {
  $,
  $$,
  esc,
  cop,
  aFecha,
  fechaCorta,
  fechaLarga,
  fechaDeseadaTexto,
  nombreMes,
  primerNombre,
  infoNivel,
  normalizarPlaca,
  normalizarTelefono,
  toast,
  ocupado,
  mensajeEn,
  waLink,
  abrirModal,
  cerrarModal,
  ICONOS,
} from "../utilidades/util.js";
import { prepararFoto, agregarFotosAlBatch, leerFotos, MAX_FOTOS_POR_TIPO } from "../utilidades/fotos.js";
import { salir } from "../autenticacion/auth.js";
import { htmlReporte, accionesReporte, activarImpresion, nombreVehiculo, resumenServicios, textoCompartir, partesDe } from "../reportes/reporte.js";

let ctx = null; // { user, rol, nombre }
let catalogoCache = null;
const esJefe = () => ctx.rol === "jefe";
const zona = () => $("#admin-main");

const porFechaDesc = (campo) => (a, b) => (aFecha(b[campo]) || new Date()) - (aFecha(a[campo]) || new Date());
const conId = (d) => ({ id: d.id, ...d.data() });
const ETIQUETA_SOLICITUD = { nueva: "Nueva", confirmada: "Confirmada", hecha: "Realizada", cancelada: "Cancelada" };

async function getCatalogo(forzar = false) {
  if (catalogoCache && !forzar) return catalogoCache;
  const snap = await getDocs(collection(db, "servicios_catalogo"));
  catalogoCache = snap.docs.map(conId).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  return catalogoCache;
}

// ===== Navegación por pestañas =====
export function iniciarAdmin(user, datosUsuario) {
  ctx = { user, rol: datosUsuario.rol, nombre: datosUsuario.nombre || user.email };
  catalogoCache = null;
  $("#admin-usuario").textContent = `${ctx.nombre} · ${ctx.rol === "jefe" ? "Jefe" : "Empleado"}`;
  $("#btn-admin-salir").onclick = salir;

  const pestanas = [
    ["servicio", "Nuevo servicio"],
    ["clientes", "Clientes"],
    ["solicitudes", "Solicitudes"],
    ["recordatorios", "Recordatorios"],
    ...(esJefe()
      ? [
          ["ingresos", "Ingresos"],
          ["premios", "Premios y canjes"],
          ["catalogo", "Catálogo"],
        ]
      : []),
  ];
  $("#admin-tabs").innerHTML = pestanas.map(([id, texto]) => `<button type="button" class="tab" data-tab="${id}">${esc(texto)}</button>`).join("");
  $$("#admin-tabs [data-tab]").forEach((b) => (b.onclick = () => irATab(b.dataset.tab)));
  irATab("servicio");
}

const pestanasVistas = {
  servicio: vistaServicio,
  clientes: vistaClientes,
  solicitudes: vistaSolicitudes,
  recordatorios: vistaRecordatorios,
  ingresos: vistaIngresos,
  premios: vistaPremios,
  catalogo: vistaCatalogo,
};

async function irATab(nombre) {
  $$("#admin-tabs [data-tab]").forEach((b) => {
    if (b.dataset.tab === nombre) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  zona().innerHTML = `<p class="cargando">Cargando…</p>`;
  try {
    await pestanasVistas[nombre]();
  } catch (error) {
    console.error(`Pestaña ${nombre}:`, error);
    zona().innerHTML = `<div class="vacio"><p>No se pudo cargar. Revisa la conexión o las reglas de Firestore.</p><button type="button" class="btn btn-secundario" data-reintentar>Reintentar</button></div>`;
    $("[data-reintentar]", zona()).onclick = () => irATab(nombre);
  }
}

// ======================================================================
// NUEVO SERVICIO
// ======================================================================
let S = null; // estado del formulario

async function vistaServicio() {
  S = { cliente: null, nuevoCliente: false, vehiculos: [], fotos: { antes: [], despues: [] }, totalManual: false };
  const catalogo = (await getCatalogo()).filter((c) => c.activo !== false);

  zona().innerHTML = `
  <h2 class="titulo-seccion">Nuevo servicio</h2>
  <form id="sv-form" class="stack" novalidate>
    <section class="card stack" aria-labelledby="sv-t1">
      <h3 id="sv-t1">1. Cliente</h3>
      <div class="fila-buscar">
        <label class="sr-only" for="sv-buscar">Teléfono o placa del cliente</label>
        <input id="sv-buscar" type="search" placeholder="Teléfono o placa del cliente" autocomplete="off">
        <button type="button" class="btn btn-gold" id="sv-btn-buscar">Buscar</button>
      </div>
      <p id="sv-buscar-msg" class="msg" role="status"></p>
      <div id="sv-resultados" class="lista-opciones"></div>
      <div id="sv-cliente-sel" hidden></div>
      <button type="button" class="link" id="sv-btn-nuevo-cliente">Registrar cliente nuevo (sin cuenta en la app)</button>
      <div id="sv-nuevo-cliente" class="grid-2" hidden>
        <div class="campo"><label for="sv-nc-nombre">Nombre</label><input id="sv-nc-nombre" type="text" autocomplete="off"></div>
        <div class="campo"><label for="sv-nc-tel">Celular</label><input id="sv-nc-tel" type="tel" inputmode="numeric" autocomplete="off"></div>
      </div>
    </section>

    <div id="sv-resto" class="stack" hidden>
      <section class="card stack" aria-labelledby="sv-t2">
        <h3 id="sv-t2">2. Vehículo o mueble</h3>
        <div class="campo"><label for="sv-veh">Vehículo</label><select id="sv-veh"></select></div>
        <div id="sv-veh-nuevo" class="stack" hidden>
          <div class="grid-2">
            <div class="campo"><label for="sv-vn-tipo">Tipo</label>
              <select id="sv-vn-tipo">${TIPOS_VEHICULO.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("")}</select></div>
            <div class="campo"><label for="sv-vn-placa">Placa o referencia</label><input id="sv-vn-placa" type="text" autocomplete="off" placeholder="ABC123"></div>
            <div class="campo"><label for="sv-vn-marca">Marca</label><input id="sv-vn-marca" type="text" autocomplete="off"></div>
            <div class="campo"><label for="sv-vn-modelo">Modelo</label><input id="sv-vn-modelo" type="text" autocomplete="off"></div>
          </div>
        </div>
      </section>

      <section class="card stack" aria-labelledby="sv-t3">
        <h3 id="sv-t3">3. Servicios realizados</h3>
        ${
          catalogo.length
            ? `<div id="sv-catalogo" class="checks">${catalogo
                .map(
                  (c) => `<label class="check check-fila"><input type="checkbox" data-cat="${esc(c.id)}" data-nombre="${esc(c.nombre)}" data-precio="${Number(c.precio) || 0}"><span>${esc(c.nombre)}</span><b>${cop(c.precio)}</b></label>`
                )
                .join("")}</div>`
            : `<p class="meta">El catálogo está vacío. ${esJefe() ? "Cárgalo en la pestaña Catálogo." : "Pídele al Jefe que lo cargue."} Mientras tanto usa «Otros».</p><div id="sv-catalogo"></div>`
        }
        <h4>Otros (repuestos o trabajos extra)</h4>
        <div id="sv-extras" class="stack"></div>
        <button type="button" class="link" id="sv-add-extra">+ Agregar otro</button>
        <div class="grid-2">
          <div class="campo"><label for="sv-total">Total (COP)</label><input id="sv-total" type="number" min="0" step="1000" inputmode="numeric" value="0"></div>
          <div class="campo"><label for="sv-metodo">Método de pago</label><select id="sv-metodo">${METODOS_PAGO.map((m) => `<option>${esc(m)}</option>`).join("")}</select></div>
        </div>
        <p class="meta" id="sv-puntos-previa"></p>
      </section>

      <section class="card stack" aria-labelledby="sv-t4">
        <h3 id="sv-t4">4. Fotos del antes y el después</h3>
        <div class="grid-2">
          ${["antes", "despues"]
            .map(
              (tipo) => `<div class="stack">
              <h4>${tipo === "antes" ? "Antes" : "Después"}</h4>
              <div id="sv-prev-${tipo}" class="previas"></div>
              <label class="btn btn-secundario archivo">${ICONOS.camara} Agregar fotos<input type="file" id="sv-file-${tipo}" accept="image/*" multiple></label>
            </div>`
            )
            .join("")}
        </div>
        <p class="meta">Máximo ${MAX_FOTOS_POR_TIPO} por categoría. Se comprimen solas.</p>
      </section>

      <section class="card stack" aria-labelledby="sv-t5">
        <h3 id="sv-t5">5. Reporte para el cliente</h3>
        <div class="campo"><label for="sv-estado">Estado encontrado</label>
          <textarea id="sv-estado" rows="3" placeholder="Ej: rayones leves en la puerta, manchas viejas en la tapicería"></textarea></div>
        <fieldset class="stack">
          <legend>Recomendaciones</legend>
          <div class="chips" id="sv-recs">
            ${catalogo.map((c) => `<button type="button" class="chip" aria-pressed="false" data-rec="${esc(c.nombre)}">${esc(c.nombre)}</button>`).join("")}
          </div>
          <div class="grid-2">
            <div class="campo"><label for="sv-rec-otra">Otra recomendación</label><input id="sv-rec-otra" type="text" autocomplete="off" placeholder="Ej: pulido de faros"></div>
            <div class="campo"><label for="sv-rec-dias">Recordar al cliente en</label>
              <select id="sv-rec-dias"><option value="30">30 días</option><option value="45">45 días</option><option value="60" selected>60 días</option><option value="90">90 días</option></select></div>
          </div>
        </fieldset>
        <label class="check"><input type="checkbox" id="sv-galeria" disabled><span id="sv-galeria-txt">Publicar el antes/después en la galería (solo si el cliente lo autorizó)</span></label>
      </section>

      <div class="card stack">
        <p class="meta">Atendido por: <strong>${esc(ctx.nombre)}</strong>${esJefe() ? "" : " · el Jefe confirma el pago y ahí se suman los puntos"}</p>
        <p id="sv-msg" class="msg" role="alert"></p>
        <button type="submit" class="btn btn-primario btn-ancho" id="sv-guardar">Guardar servicio</button>
      </div>
    </div>
  </form>
  <div id="sv-resultado"></div>`;

  enlazarFormularioServicio();
  agregarFilaExtra();
}

async function buscarClientes(valor) {
  const v = valor.trim();
  if (!v) return [];
  const tel = normalizarTelefono(v);
  const placa = normalizarPlaca(v);
  let docs = [];
  if (/^\d{10}$/.test(tel)) docs = (await getDocs(query(collection(db, "clientes"), where("telefono", "==", tel)))).docs;
  if (!docs.length) {
    const porVehiculo = await getDocs(query(collection(db, "vehiculos"), where("placa", "==", placa)));
    const ids = [...new Set(porVehiculo.docs.map((d) => d.data().clienteId))];
    docs = (await Promise.all(ids.map((id) => getDoc(doc(db, "clientes", id))))).filter((s) => s.exists());
  }
  if (!docs.length) docs = (await getDocs(query(collection(db, "clientes"), where("placa", "==", v)))).docs; // clientes del sistema anterior
  return docs.map(conId);
}

function enlazarFormularioServicio() {
  const msgBuscar = $("#sv-buscar-msg");

  const buscar = async () => {
    const valor = $("#sv-buscar").value;
    if (!valor.trim()) return;
    mensajeEn(msgBuscar, "Buscando...");
    $("#sv-resultados").innerHTML = "";
    try {
      const encontrados = await buscarClientes(valor);
      if (!encontrados.length) return mensajeEn(msgBuscar, "No encontramos al cliente. Puedes registrarlo como nuevo.", "error");
      if (encontrados.length === 1) {
        mensajeEn(msgBuscar, "");
        return elegirCliente(encontrados[0]);
      }
      mensajeEn(msgBuscar, "Hay varios con ese dato. Elige uno:");
      $("#sv-resultados").innerHTML = encontrados
        .map((c) => `<button type="button" class="opcion" data-elegir="${esc(c.id)}">${esc(c.nombre)} · ${esc(c.telefono)}${c.uid ? " · con cuenta" : ""}</button>`)
        .join("");
      $$("[data-elegir]", $("#sv-resultados")).forEach((b) => (b.onclick = () => elegirCliente(encontrados.find((c) => c.id === b.dataset.elegir))));
    } catch (error) {
      console.error("Buscar cliente:", error);
      mensajeEn(msgBuscar, "Error al buscar. Intenta de nuevo.", "error");
    }
  };
  $("#sv-btn-buscar").onclick = buscar;
  $("#sv-buscar").onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscar();
    }
  };

  $("#sv-btn-nuevo-cliente").onclick = () => {
    S.cliente = null;
    S.nuevoCliente = true;
    S.vehiculos = [];
    $("#sv-cliente-sel").hidden = true;
    $("#sv-resultados").innerHTML = "";
    $("#sv-nuevo-cliente").hidden = false;
    $("#sv-nc-nombre").focus();
    prepararResto();
  };

  $("#sv-veh").onchange = () => ($("#sv-veh-nuevo").hidden = $("#sv-veh").value !== "__nuevo");
  $("#sv-add-extra").onclick = agregarFilaExtra;

  $("#sv-catalogo").onchange = recalcularTotal;
  $("#sv-total").oninput = () => {
    S.totalManual = $("#sv-total").value !== "";
    actualizarPuntosPrevia();
  };

  $$("#sv-recs [data-rec]").forEach((b) => {
    b.onclick = () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
  });

  ["antes", "despues"].forEach((tipo) => {
    $(`#sv-file-${tipo}`).onchange = async (e) => {
      const archivos = [...e.target.files];
      e.target.value = "";
      const cupo = MAX_FOTOS_POR_TIPO - S.fotos[tipo].length;
      if (archivos.length > cupo) toast(`Máximo ${MAX_FOTOS_POR_TIPO} fotos por categoría.`, "aviso");
      for (const archivo of archivos.slice(0, cupo)) {
        try {
          S.fotos[tipo].push(await prepararFoto(archivo));
        } catch {
          toast("No se pudo leer una de las fotos.", "error");
        }
      }
      pintarPrevias(tipo);
    };
  });

  $("#sv-form").onsubmit = (e) => {
    e.preventDefault();
    guardarServicio();
  };
}

async function elegirCliente(cliente) {
  S.cliente = cliente;
  S.nuevoCliente = false;
  $("#sv-resultados").innerHTML = "";
  $("#sv-nuevo-cliente").hidden = true;
  const nv = infoNivel(cliente.puntosAcumulados);
  const caja = $("#sv-cliente-sel");
  caja.hidden = false;
  caja.innerHTML = `<div class="cliente-sel">
    <div><strong>${esc(cliente.nombre)}</strong><span class="meta">${esc(cliente.telefono)} · Nivel ${esc(nv.actual.nombre)} · ${cliente.puntosDisponibles || 0} pts${cliente.uid ? "" : " · sin cuenta"}</span></div>
    <button type="button" class="link" id="sv-cambiar">Cambiar</button>
  </div>`;
  $("#sv-cambiar").onclick = () => {
    caja.hidden = true;
    $("#sv-resto").hidden = true;
    S.cliente = null;
    $("#sv-buscar").focus();
  };
  const snap = await getDocs(query(collection(db, "vehiculos"), where("clienteId", "==", cliente.id)));
  S.vehiculos = snap.docs.map(conId);
  prepararResto();
}

function prepararResto() {
  $("#sv-resto").hidden = false;
  const opciones = S.vehiculos.map((v) => `<option value="${esc(v.id)}">${esc(nombreVehiculo({ marca: v.marca, modelo: v.modelo, placa: v.placa }))}</option>`);
  opciones.push(`<option value="__nuevo">＋ Vehículo o mueble nuevo</option>`);
  $("#sv-veh").innerHTML = opciones.join("");
  $("#sv-veh").value = S.vehiculos.length ? S.vehiculos[0].id : "__nuevo";
  $("#sv-veh-nuevo").hidden = $("#sv-veh").value !== "__nuevo";

  const galeria = $("#sv-galeria");
  const autoriza = !!S.cliente?.autorizaFotos;
  galeria.disabled = !autoriza;
  galeria.checked = false;
  $("#sv-galeria-txt").textContent = autoriza
    ? "Publicar el antes/después en la galería pública (el cliente lo autorizó)"
    : "Publicar en la galería: el cliente no ha autorizado mostrar sus fotos";
  actualizarPuntosPrevia();
}

function agregarFilaExtra() {
  const fila = document.createElement("div");
  fila.className = "extra-fila";
  fila.innerHTML = `
    <label class="sr-only">Nombre del trabajo o repuesto</label><input type="text" class="extra-nombre" placeholder="Nombre" autocomplete="off">
    <label class="sr-only">Costo</label><input type="number" class="extra-costo" min="0" step="1000" inputmode="numeric" placeholder="Costo">
    <button type="button" class="icono-btn" aria-label="Quitar">${ICONOS.cerrar}</button>`;
  fila.querySelector(".extra-costo").oninput = recalcularTotal;
  fila.querySelector("button").onclick = () => {
    fila.remove();
    recalcularTotal();
  };
  $("#sv-extras").appendChild(fila);
}

function recalcularTotal() {
  if (!S.totalManual) {
    let total = 0;
    $$("#sv-catalogo input:checked").forEach((c) => (total += Number(c.dataset.precio) || 0));
    $$("#sv-extras .extra-costo").forEach((i) => (total += Number(i.value) || 0));
    $("#sv-total").value = total;
  }
  actualizarPuntosPrevia();
}

function actualizarPuntosPrevia() {
  const puntos = Math.floor((Number($("#sv-total").value) || 0) / PUNTOS_POR_PESOS);
  $("#sv-puntos-previa").textContent = `Puntos para el cliente: ${puntos}${esJefe() ? "" : " (se suman al confirmar el pago)"}`;
}

function pintarPrevias(tipo) {
  $(`#sv-prev-${tipo}`).innerHTML = S.fotos[tipo]
    .map(
      (f, i) => `<div class="previa"><img src="${f.mini}" alt="Foto ${i + 1} (${tipo === "antes" ? "antes" : "después"})">
      <button type="button" class="previa-quitar" data-quitar="${i}" aria-label="Quitar foto ${i + 1}">${ICONOS.cerrar}</button></div>`
    )
    .join("");
  $$("[data-quitar]", $(`#sv-prev-${tipo}`)).forEach((b) => {
    b.onclick = () => {
      S.fotos[tipo].splice(Number(b.dataset.quitar), 1);
      pintarPrevias(tipo);
    };
  });
}

async function guardarServicio() {
  const msg = $("#sv-msg");
  mensajeEn(msg, "");

  // ---- Cliente
  let datosCliente = null;
  if (S.nuevoCliente) {
    const nombre = $("#sv-nc-nombre").value.trim();
    const telefono = normalizarTelefono($("#sv-nc-tel").value);
    if (nombre.length < 3) return mensajeEn(msg, "Escribe el nombre del cliente.", "error");
    if (!/^\d{10}$/.test(telefono)) return mensajeEn(msg, "El celular debe tener 10 dígitos.", "error");
    datosCliente = { nombre, telefono };
  } else if (!S.cliente) {
    return mensajeEn(msg, "Busca o registra al cliente primero.", "error");
  }

  // ---- Vehículo
  let vehiculoNuevo = null;
  let vehiculoExistente = null;
  if ($("#sv-veh").value === "__nuevo") {
    const tipo = $("#sv-vn-tipo").value;
    const marca = $("#sv-vn-marca").value.trim();
    const modelo = $("#sv-vn-modelo").value.trim();
    const placa = normalizarPlaca($("#sv-vn-placa").value);
    if (!marca) return mensajeEn(msg, "Escribe la marca del vehículo o mueble.", "error");
    if (tipo !== "mueble" && placa.length < 5) return mensajeEn(msg, "Escribe la placa.", "error");
    vehiculoNuevo = { tipo, marca, modelo, placa };
  } else {
    vehiculoExistente = S.vehiculos.find((v) => v.id === $("#sv-veh").value);
  }

  // ---- Servicios y total
  const items = $$("#sv-catalogo input:checked").map((c) => ({ nombre: c.dataset.nombre, precio: Number(c.dataset.precio) || 0, catalogoId: c.dataset.cat }));
  const extras = $$("#sv-extras .extra-fila")
    .map((f) => ({ nombre: $(".extra-nombre", f).value.trim(), costo: Number($(".extra-costo", f).value) || 0 }))
    .filter((e) => e.nombre);
  if (!items.length && !extras.length) return mensajeEn(msg, "Marca al menos un servicio.", "error");
  const total = Number($("#sv-total").value) || 0;
  if (total <= 0) return mensajeEn(msg, "El total debe ser mayor a 0.", "error");

  // ---- Reporte
  const dias = Number($("#sv-rec-dias").value) || 60;
  const textosRec = [...$$("#sv-recs [aria-pressed='true']").map((b) => b.dataset.rec), $("#sv-rec-otra").value.trim()].filter(Boolean);
  const recomendaciones = textosRec.map((texto) => ({ texto, dias }));

  const confirmado = esJefe();
  const puntos = Math.floor(total / PUNTOS_POR_PESOS);

  await ocupado($("#sv-guardar"), "Guardando...", async () => {
    try {
      const batch = writeBatch(db);

      // Cliente
      let refCliente;
      let clienteId;
      let nombreCliente;
      let telefonoCliente;
      if (datosCliente) {
        refCliente = doc(collection(db, "clientes"));
        clienteId = refCliente.id;
        nombreCliente = datosCliente.nombre;
        telefonoCliente = datosCliente.telefono;
        batch.set(refCliente, {
          uid: null,
          ...datosCliente,
          email: "",
          autorizaFotos: false,
          puntosDisponibles: confirmado ? puntos : 0,
          puntosAcumulados: confirmado ? puntos : 0,
          serviciosTotal: confirmado ? 1 : 0,
          totalGastado: confirmado ? total : 0,
          creado: serverTimestamp(),
          creadoPor: ctx.user.uid,
        });
      } else {
        refCliente = doc(db, "clientes", S.cliente.id);
        clienteId = S.cliente.id;
        nombreCliente = S.cliente.nombre;
        telefonoCliente = S.cliente.telefono;
        if (confirmado) {
          batch.update(refCliente, {
            puntosDisponibles: increment(puntos),
            puntosAcumulados: increment(puntos),
            serviciosTotal: increment(1),
            totalGastado: increment(total),
          });
        }
      }

      // Vehículo
      let vehiculoId;
      let vehiculoResumen;
      let tipoVehiculo;
      if (vehiculoNuevo) {
        const refVeh = doc(collection(db, "vehiculos"));
        vehiculoId = refVeh.id;
        batch.set(refVeh, { clienteId, ...vehiculoNuevo, creado: serverTimestamp() });
        vehiculoResumen = nombreVehiculo(vehiculoNuevo);
        tipoVehiculo = vehiculoNuevo.tipo;
      } else {
        vehiculoId = vehiculoExistente.id;
        vehiculoResumen = nombreVehiculo(vehiculoExistente);
        tipoVehiculo = vehiculoExistente.tipo || "";
      }

      // Servicio (colección «diagnosticos», la misma que ya usabas)
      const refServicio = doc(collection(db, "diagnosticos"));
      batch.set(refServicio, {
        clienteId,
        clienteNombre: nombreCliente,
        clienteTelefono: telefonoCliente,
        vehiculoId,
        vehiculoResumen,
        tipoVehiculo,
        items,
        extras,
        total,
        metodoPago: $("#sv-metodo").value,
        estadoEncontrado: $("#sv-estado").value.trim(),
        recomendaciones,
        ...(recomendaciones.length
          ? { proximoRecordatorio: Timestamp.fromDate(new Date(Date.now() + dias * 86400000)), recordatorioEnviado: false }
          : {}),
        portada: { antes: S.fotos.antes[0]?.mini || null, despues: S.fotos.despues[0]?.mini || null },
        estadoPago: confirmado ? "confirmado" : "pendiente",
        puntosGanados: confirmado ? puntos : 0,
        atendidoPor: ctx.nombre,
        atendidoPorUid: ctx.user.uid,
        fecha: serverTimestamp(),
      });
      agregarFotosAlBatch(batch, refServicio, "antes", S.fotos.antes);
      agregarFotosAlBatch(batch, refServicio, "despues", S.fotos.despues);

      // Galería pública (solo con autorización del cliente)
      const publicar = $("#sv-galeria").checked && S.fotos.antes[0] && S.fotos.despues[0];
      if (publicar) {
        batch.set(doc(collection(db, "galeria")), {
          antes: S.fotos.antes[0].mini,
          despues: S.fotos.despues[0].mini,
          servicio: items[0]?.nombre || extras[0]?.nombre || "Servicio",
          fecha: serverTimestamp(),
          servicioId: refServicio.id,
        });
      }

      await batch.commit();
      mostrarServicioGuardado({ nombreCliente, telefonoCliente, vehiculoResumen, items, extras, total, tieneCuenta: !!S.cliente?.uid });
    } catch (error) {
      console.error("Guardar servicio:", error);
      mensajeEn(msg, "No se pudo guardar. Revisa la conexión e intenta de nuevo (si el error sigue, mira la consola).", "error");
    }
  });
}

function mostrarServicioGuardado({ nombreCliente, telefonoCliente, vehiculoResumen, items, extras, total, tieneCuenta }) {
  const servicios = [...items, ...extras].map((i) => i.nombre).join(", ");
  const invitacion = tieneCuenta
    ? `Mira tu reporte con las fotos del antes y el después ingresando a ${location.origin}`
    : `Crea tu cuenta gratis en ${location.origin} para ver tu historial, tus puntos y premios.`;
  const texto = `Hola ${primerNombre(nombreCliente)}, tu servicio en ${NEGOCIO.nombre} ya quedó listo (${vehiculoResumen}: ${servicios}). Total: ${cop(total)}. ${invitacion}`;
  $("#sv-form").hidden = true;
  $("#sv-resultado").innerHTML = `<div class="card stack">
    <h3>Servicio guardado</h3>
    <p>${esJefe() ? "Los puntos ya se sumaron al cliente." : "Quedó pendiente de confirmar el pago por el Jefe; ahí se suman los puntos."}</p>
    <a class="btn btn-primario btn-ancho" target="_blank" rel="noopener" href="${esc(waLink(telefonoCliente, texto))}">${ICONOS.whatsapp} Avisar al cliente por WhatsApp</a>
    <button type="button" class="btn btn-secundario btn-ancho" id="sv-otro">Registrar otro servicio</button>
  </div>`;
  $("#sv-otro").onclick = () => irATab("servicio");
}

// ======================================================================
// REPORTE (modal) — lo usan Clientes y Pagos
// ======================================================================
async function abrirReporte(servicioId) {
  const snap = await getDoc(doc(db, "diagnosticos", servicioId));
  if (!snap.exists()) return toast("No se encontró el reporte.", "error");
  const d = conId(snap);
  const fotos = await leerFotos(servicioId).catch(() => ({ antes: [], despues: [] }));
  abrirModal("Reporte de servicio", `${htmlReporte(d, fotos)}${accionesReporte(waLink(d.clienteTelefono || d.telefono || "", textoCompartir(d)))}`);
  activarImpresion(d);
}

// ======================================================================
// CLIENTES
// ======================================================================
async function vistaClientes() {
  const snap = await getDocs(query(collection(db, "clientes"), limit(500)));
  const lista = snap.docs.map(conId).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  zona().innerHTML = `
    <h2 class="titulo-seccion">Clientes <span class="meta">(${lista.length})</span></h2>
    <div class="campo"><label for="cl-filtro">Filtrar por nombre, celular o placa</label><input id="cl-filtro" type="search" autocomplete="off"></div>
    <div id="cl-lista" class="stack"></div>`;
  const pintar = () => {
    const f = $("#cl-filtro").value.trim().toLowerCase();
    const visibles = lista.filter((c) => !f || [c.nombre, c.telefono, c.placa].some((v) => String(v || "").toLowerCase().includes(f)));
    $("#cl-lista").innerHTML = visibles.length
      ? visibles
          .map((c) => {
            const nv = infoNivel(c.puntosAcumulados);
            return `<button type="button" class="fila-cliente" data-cliente="${esc(c.id)}">
              <span><strong>${esc(c.nombre)}</strong><span class="meta">${esc(c.telefono)}${c.uid ? " · con cuenta" : ""}</span></span>
              <span class="badge badge-nivel">${esc(nv.actual.nombre)} · ${c.puntosDisponibles || 0} pts</span>
            </button>`;
          })
          .join("")
      : `<div class="vacio"><p>No hay clientes con ese dato.</p></div>`;
    $$("[data-cliente]", $("#cl-lista")).forEach((b) => (b.onclick = () => abrirCliente(b.dataset.cliente)));
  };
  $("#cl-filtro").oninput = pintar;
  pintar();
}

async function abrirCliente(id) {
  const [clienteSnap, vehSnap, servSnap] = await Promise.all([
    getDoc(doc(db, "clientes", id)),
    getDocs(query(collection(db, "vehiculos"), where("clienteId", "==", id))),
    getDocs(query(collection(db, "diagnosticos"), where("clienteId", "==", id))),
  ]);
  if (!clienteSnap.exists()) return toast("Cliente no encontrado.", "error");
  const c = conId(clienteSnap);
  const vehiculos = vehSnap.docs.map(conId);
  const servicios = servSnap.docs.map(conId).sort(porFechaDesc("fecha"));
  const nv = infoNivel(c.puntosAcumulados);

  abrirModal(
    c.nombre,
    `<div class="stack">
      <p class="meta">${esc(c.telefono)}${c.email ? ` · ${esc(c.email)}` : ""}${c.uid ? " · con cuenta" : " · sin cuenta"}</p>
      <p><span class="badge badge-nivel">Nivel ${esc(nv.actual.nombre)}</span> <span class="badge badge-ok">${c.puntosDisponibles || 0} puntos</span> <span class="meta">${c.serviciosTotal || 0} servicios · ${cop(c.totalGastado)}</span></p>
      <a class="btn btn-primario" target="_blank" rel="noopener" href="${esc(waLink(c.telefono, `Hola ${primerNombre(c.nombre)}, te escribe ${NEGOCIO.nombre}.`))}">${ICONOS.whatsapp} Escribir por WhatsApp</a>
      <h3>Vehículos</h3>
      ${vehiculos.length ? `<ul class="lista-simple">${vehiculos.map((v) => `<li>${esc(nombreVehiculo({ marca: v.marca, modelo: v.modelo, placa: v.placa }))}</li>`).join("")}</ul>` : `<p class="meta">Sin vehículos.</p>`}
      <h3>Historial</h3>
      ${
        servicios.length
          ? servicios
              .map(
                (s) => `<div class="premio-fila"><div><strong>${esc(fechaLarga(s.fecha))} · ${cop(s.total)}</strong><span class="meta">${esc(nombreVehiculo(s))} · ${esc(resumenServicios(s))}</span></div><button type="button" class="link" data-ver-reporte="${esc(s.id)}">Reporte</button></div>`
              )
              .join("")
          : `<p class="meta">Aún sin servicios.</p>`
      }
    </div>`
  );
  $$("[data-ver-reporte]", $("#modal")).forEach((b) => (b.onclick = () => abrirReporte(b.dataset.verReporte)));
}

// ======================================================================
// SOLICITUDES
// ======================================================================
async function vistaSolicitudes() {
  const snap = await getDocs(query(collection(db, "solicitudes"), orderBy("creada", "desc"), limit(60)));
  const lista = snap.docs.map(conId);
  const activas = lista.filter((s) => s.estado === "nueva" || s.estado === "confirmada");
  const cerradas = lista.filter((s) => !activas.includes(s));

  const tarjeta = (s) => {
    const fecha = fechaDeseadaTexto(s.fechaDeseada, s.hora);
    const msgConfirmar = `Hola ${primerNombre(s.clienteNombre)}, confirmamos tu servicio de ${s.servicio} para el ${fecha} en ${s.direccion}. ¡Nos vemos!`;
    return `<article class="card stack solicitud">
      <div class="servicio-cabecera">
        <div><h3>${esc(s.servicio)}</h3><p class="meta">${esc(s.clienteNombre)} · ${esc(s.vehiculoResumen)}</p></div>
        <span class="badge ${s.estado === "nueva" ? "badge-aviso" : s.estado === "cancelada" ? "badge-gris" : "badge-ok"}">${esc(ETIQUETA_SOLICITUD[s.estado] || s.estado)}</span>
      </div>
      <p class="meta">${esc(fecha)} · ${esc(s.direccion)}${s.notas ? ` · ${esc(s.notas)}` : ""}</p>
      <div class="acciones">
        <a class="btn btn-secundario btn-chico" target="_blank" rel="noopener" href="${esc(waLink(s.clienteTelefono, msgConfirmar))}">${ICONOS.whatsapp} WhatsApp</a>
        ${s.estado === "nueva" ? `<button type="button" class="btn btn-primario btn-chico" data-estado="confirmada" data-id="${esc(s.id)}">Confirmar</button>` : ""}
        ${s.estado === "confirmada" ? `<button type="button" class="btn btn-primario btn-chico" data-estado="hecha" data-id="${esc(s.id)}">Marcar realizada</button>` : ""}
        ${s.estado === "nueva" || s.estado === "confirmada" ? `<button type="button" class="btn btn-peligro btn-chico" data-estado="cancelada" data-id="${esc(s.id)}">Cancelar</button>` : ""}
      </div>
    </article>`;
  };

  zona().innerHTML = `
    <h2 class="titulo-seccion">Solicitudes</h2>
    ${activas.length ? activas.map(tarjeta).join("") : `<div class="vacio"><p>No hay solicitudes pendientes.</p></div>`}
    ${cerradas.length ? `<h2 class="titulo-seccion">Anteriores</h2>${cerradas.slice(0, 15).map(tarjeta).join("")}` : ""}`;

  $$("[data-estado]", zona()).forEach((b) => {
    b.onclick = async () => {
      try {
        await updateDoc(doc(db, "solicitudes", b.dataset.id), { estado: b.dataset.estado });
        irATab("solicitudes");
      } catch (error) {
        console.error("Solicitud:", error);
        toast("No se pudo actualizar la solicitud.", "error");
      }
    };
  });
}

// ======================================================================
// RECORDATORIOS DE RECOMPRA
// ======================================================================
async function vistaRecordatorios() {
  const limite = Timestamp.fromDate(new Date(Date.now() + 14 * 86400000));
  const snap = await getDocs(query(collection(db, "diagnosticos"), where("proximoRecordatorio", "<=", limite)));
  const lista = snap.docs
    .map(conId)
    .filter((d) => d.recordatorioEnviado !== true)
    .sort((a, b) => aFecha(a.proximoRecordatorio) - aFecha(b.proximoRecordatorio));

  zona().innerHTML = `
    <h2 class="titulo-seccion">Recordatorios</h2>
    <p class="meta">Clientes a los que les toca volver en los próximos 14 días (o ya se pasó la fecha).</p>
    ${
      lista.length
        ? lista
            .map((d) => {
              const recs = (d.recomendaciones || []).map((r) => r.texto).join(", ");
              const vencido = aFecha(d.proximoRecordatorio) < new Date();
              const texto = `Hola ${primerNombre(d.clienteNombre)}, te escribe ${NEGOCIO.nombre}. Hace un tiempo atendimos tu ${nombreVehiculo(d)} (${resumenServicios(d)}). Te recomendamos: ${recs}. ¿Te agendamos esta semana?`;
              return `<article class="card stack">
                <div class="servicio-cabecera">
                  <div><h3>${esc(d.clienteNombre)}</h3><p class="meta">${esc(nombreVehiculo(d))} · atendido el ${esc(fechaCorta(d.fecha))}</p></div>
                  <span class="badge ${vencido ? "badge-aviso" : "badge-gris"}">${vencido ? "Ya toca" : `Toca el ${esc(fechaCorta(d.proximoRecordatorio))}`}</span>
                </div>
                <p class="meta">Recomendado: ${esc(recs)}</p>
                <div class="acciones">
                  <a class="btn btn-primario btn-chico" target="_blank" rel="noopener" href="${esc(waLink(d.clienteTelefono, texto))}">${ICONOS.whatsapp} Escribir</a>
                  <button type="button" class="btn btn-secundario btn-chico" data-enviado="${esc(d.id)}">Marcar como enviado</button>
                </div>
              </article>`;
            })
            .join("")
        : `<div class="vacio"><p>No hay recordatorios por ahora.</p></div>`
    }`;

  $$("[data-enviado]", zona()).forEach((b) => {
    b.onclick = async () => {
      try {
        await updateDoc(doc(db, "diagnosticos", b.dataset.enviado), { recordatorioEnviado: true });
        irATab("recordatorios");
      } catch (error) {
        console.error("Recordatorio:", error);
        toast("No se pudo marcar.", "error");
      }
    };
  });
}

// ======================================================================
// INGRESOS Y CONFIRMACIÓN DE PAGOS (jefe)
// ======================================================================
let mesIngresos = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

async function confirmarPago(servicioId) {
  await runTransaction(db, async (tx) => {
    const refServicio = doc(db, "diagnosticos", servicioId);
    const snap = await tx.get(refServicio);
    const d = snap.data();
    if (d.estadoPago !== "pendiente") throw new Error("Este pago ya fue confirmado.");
    const puntos = Math.floor((d.total || 0) / PUNTOS_POR_PESOS);
    tx.update(refServicio, { estadoPago: "confirmado", puntosGanados: puntos, confirmadoPor: ctx.user.uid, confirmadoEn: serverTimestamp() });
    if (d.clienteId) {
      tx.update(doc(db, "clientes", d.clienteId), {
        puntosDisponibles: increment(puntos),
        puntosAcumulados: increment(puntos),
        serviciosTotal: increment(1),
        totalGastado: increment(d.total || 0),
      });
    }
  });
}

async function vistaIngresos() {
  const inicio = mesIngresos;
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  const [mesSnap, pendSnap] = await Promise.all([
    getDocs(query(collection(db, "diagnosticos"), where("fecha", ">=", Timestamp.fromDate(inicio)), where("fecha", "<", Timestamp.fromDate(fin)))),
    getDocs(query(collection(db, "diagnosticos"), where("estadoPago", "==", "pendiente"))),
  ]);
  const delMes = mesSnap.docs.map(conId);
  const pendientes = pendSnap.docs.map(conId).sort(porFechaDesc("fecha"));

  const confirmados = delMes.filter((d) => d.estadoPago !== "pendiente");
  const totalConfirmado = confirmados.reduce((s, d) => s + (d.total || 0), 0);
  const totalPendiente = delMes.filter((d) => d.estadoPago === "pendiente").reduce((s, d) => s + (d.total || 0), 0);
  const porEmpleado = {};
  const porServicio = {};
  confirmados.forEach((d) => {
    porEmpleado[d.atendidoPor || "—"] = (porEmpleado[d.atendidoPor || "—"] || 0) + (d.total || 0);
    const { items, extras } = partesDe(d);
    [...items, ...extras].forEach((i) => {
      if (!i.nombre) return;
      porServicio[i.nombre] = (porServicio[i.nombre] || 0) + 1;
    });
  });
  const ordenar = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

  zona().innerHTML = `
    <div class="mes-nav">
      <button type="button" class="btn btn-secundario btn-chico" id="ing-ant" aria-label="Mes anterior">‹</button>
      <h2 class="titulo-seccion">Ingresos de ${esc(nombreMes(inicio))}</h2>
      <button type="button" class="btn btn-secundario btn-chico" id="ing-sig" aria-label="Mes siguiente">›</button>
    </div>
    <div class="metricas">
      <div class="metrica"><span>Confirmados</span><strong>${cop(totalConfirmado)}</strong></div>
      <div class="metrica"><span>Por confirmar</span><strong>${cop(totalPendiente)}</strong></div>
      <div class="metrica"><span>Servicios</span><strong>${confirmados.length}</strong></div>
      <div class="metrica"><span>Ticket promedio</span><strong>${cop(confirmados.length ? totalConfirmado / confirmados.length : 0)}</strong></div>
    </div>
    <div class="grid-2">
      <section class="card"><h3>Por empleado</h3>${
        ordenar(porEmpleado).length
          ? `<ul class="detalle">${ordenar(porEmpleado).map(([n, v]) => `<li><span>${esc(n)}</span><span>${cop(v)}</span></li>`).join("")}</ul>`
          : `<p class="meta">Sin datos.</p>`
      }</section>
      <section class="card"><h3>Servicios más vendidos</h3>${
        ordenar(porServicio).length
          ? `<ul class="detalle">${ordenar(porServicio).slice(0, 8).map(([n, v]) => `<li><span>${esc(n)}</span><span>${v}</span></li>`).join("")}</ul>`
          : `<p class="meta">Sin datos.</p>`
      }</section>
    </div>
    <h2 class="titulo-seccion">Pagos por confirmar <span class="meta">(${pendientes.length})</span></h2>
    ${
      pendientes.length
        ? pendientes
            .map(
              (d) => `<article class="card stack">
                <div class="servicio-cabecera"><div><h3>${esc(d.clienteNombre)} · ${cop(d.total)}</h3><p class="meta">${esc(fechaCorta(d.fecha))} · ${esc(nombreVehiculo(d))} · ${esc(d.metodoPago || "")} · por ${esc(d.atendidoPor)}</p></div></div>
                <div class="acciones">
                  <button type="button" class="btn btn-secundario btn-chico" data-reporte="${esc(d.id)}">Ver reporte</button>
                  <button type="button" class="btn btn-primario btn-chico" data-confirmar="${esc(d.id)}">Confirmar pago</button>
                </div>
              </article>`
            )
            .join("")
        : `<div class="vacio"><p>No hay pagos pendientes.</p></div>`
    }`;

  $("#ing-ant").onclick = () => {
    mesIngresos = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
    irATab("ingresos");
  };
  $("#ing-sig").onclick = () => {
    mesIngresos = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    irATab("ingresos");
  };
  $$("[data-reporte]", zona()).forEach((b) => (b.onclick = () => abrirReporte(b.dataset.reporte)));
  $$("[data-confirmar]", zona()).forEach((b) => {
    b.onclick = async () => {
      await ocupado(b, "Confirmando...", async () => {
        try {
          await confirmarPago(b.dataset.confirmar);
          toast("Pago confirmado y puntos sumados.", "ok");
          irATab("ingresos");
        } catch (error) {
          console.error("Confirmar pago:", error);
          toast(error.message || "No se pudo confirmar.", "error");
        }
      });
    };
  });
}

// ======================================================================
// LISTAS EDITABLES (catálogo y premios) — jefe
// ======================================================================
function vistaListaEditable({ titulo, coleccion, campoNumero, etiquetaNumero, items, vacio, extraArriba = "", alCambiar }) {
  zona().innerHTML = `
    ${extraArriba}
    <h2 class="titulo-seccion">${esc(titulo)}</h2>
    <form id="le-nuevo" class="card fila-editable" novalidate>
      <div class="campo"><label for="le-n-nombre">Nombre</label><input id="le-n-nombre" type="text" autocomplete="off"></div>
      <div class="campo"><label for="le-n-num">${esc(etiquetaNumero)}</label><input id="le-n-num" type="number" min="0" step="${campoNumero === "precio" ? 1000 : 10}" inputmode="numeric"></div>
      <button type="submit" class="btn btn-gold">Agregar</button>
    </form>
    <div id="le-lista" class="stack">
      ${
        items.length
          ? items
              .map(
                (it) => `<form class="card fila-editable" data-id="${esc(it.id)}" novalidate>
                <div class="campo"><label>Nombre<input type="text" name="nombre" value="${esc(it.nombre)}" autocomplete="off"></label></div>
                <div class="campo"><label>${esc(etiquetaNumero)}<input type="number" name="num" min="0" value="${Number(it[campoNumero]) || 0}" inputmode="numeric"></label></div>
                <label class="check"><input type="checkbox" name="activo" ${it.activo !== false ? "checked" : ""}><span>Activo</span></label>
                <button type="submit" class="btn btn-secundario btn-chico">Guardar</button>
              </form>`
              )
              .join("")
          : `<div class="vacio">${vacio}</div>`
      }
    </div>`;

  $("#le-nuevo").onsubmit = async (e) => {
    e.preventDefault();
    const nombre = $("#le-n-nombre").value.trim();
    const num = Number($("#le-n-num").value);
    if (!nombre || !(num >= 0) || $("#le-n-num").value === "") return toast("Completa el nombre y el valor.", "error");
    try {
      await addDoc(collection(db, coleccion), { nombre, [campoNumero]: num, activo: true });
      toast("Agregado.", "ok");
      await alCambiar();
    } catch (error) {
      console.error(error);
      toast("No se pudo agregar.", "error");
    }
  };
  $$("#le-lista form[data-id]").forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = f.elements.nombre.value.trim();
      if (!nombre) return toast("El nombre no puede quedar vacío.", "error");
      try {
        await updateDoc(doc(db, coleccion, f.dataset.id), { nombre, [campoNumero]: Number(f.elements.num.value) || 0, activo: f.elements.activo.checked });
        toast("Guardado.", "ok");
        await alCambiar();
      } catch (error) {
        console.error(error);
        toast("No se pudo guardar.", "error");
      }
    };
  });
}

async function vistaCatalogo() {
  const items = await getCatalogo(true);
  vistaListaEditable({
    titulo: "Catálogo de servicios",
    coleccion: "servicios_catalogo",
    campoNumero: "precio",
    etiquetaNumero: "Precio (COP)",
    items,
    vacio: `<p>El catálogo está vacío.</p><button type="button" class="btn btn-primario" id="cat-cargar">Cargar catálogo inicial</button><p class="meta">Precios reales de MG Washers (el cliente pone el agua). Puedes editarlos después.</p>`,
    alCambiar: () => irATab("catalogo"),
  });
  const cargar = $("#cat-cargar");
  if (cargar) {
    cargar.onclick = async () => {
      await ocupado(cargar, "Cargando...", async () => {
        try {
          const batch = writeBatch(db);
          CATALOGO_INICIAL.forEach((s) => batch.set(doc(collection(db, "servicios_catalogo")), { ...s, activo: true }));
          await batch.commit();
          irATab("catalogo");
        } catch (error) {
          console.error(error);
          toast("No se pudo cargar el catálogo.", "error");
        }
      });
    };
  }
}

async function entregarCanje(id) {
  await runTransaction(db, async (tx) => {
    const refCanje = doc(db, "canjes", id);
    const canje = (await tx.get(refCanje)).data();
    if (canje.estado !== "pendiente") throw new Error("Este canje ya fue procesado.");
    const refCliente = doc(db, "clientes", canje.clienteId);
    const cliente = (await tx.get(refCliente)).data();
    if ((cliente.puntosDisponibles || 0) < canje.puntos) throw new Error("El cliente ya no tiene puntos suficientes.");
    tx.update(refCliente, { puntosDisponibles: increment(-canje.puntos) });
    tx.update(refCanje, { estado: "entregado", entregadoPor: ctx.user.uid, entregadoEn: serverTimestamp() });
  });
}

async function vistaPremios() {
  const [premiosSnap, canjesSnap] = await Promise.all([
    getDocs(collection(db, "premios")),
    getDocs(query(collection(db, "canjes"), orderBy("fecha", "desc"), limit(60))),
  ]);
  const premios = premiosSnap.docs.map(conId).sort((a, b) => (a.puntos || 0) - (b.puntos || 0));
  const pendientes = canjesSnap.docs.map(conId).filter((c) => c.estado === "pendiente");

  const arriba = `<h2 class="titulo-seccion">Canjes por entregar <span class="meta">(${pendientes.length})</span></h2>
    ${
      pendientes.length
        ? pendientes
            .map(
              (c) => `<article class="card stack">
              <div class="servicio-cabecera"><div><h3>${esc(c.premioNombre)}</h3><p class="meta">${esc(c.clienteNombre)} · ${c.puntos} puntos · ${esc(fechaCorta(c.fecha))}</p></div></div>
              <div class="acciones">
                <button type="button" class="btn btn-primario btn-chico" data-entregar="${esc(c.id)}">Entregado (descontar puntos)</button>
                <button type="button" class="btn btn-peligro btn-chico" data-rechazar="${esc(c.id)}">Rechazar</button>
              </div></article>`
            )
            .join("")
        : `<div class="vacio"><p>No hay canjes pendientes.</p></div>`
    }`;

  vistaListaEditable({
    titulo: "Premios",
    coleccion: "premios",
    campoNumero: "puntos",
    etiquetaNumero: "Puntos",
    items: premios,
    vacio: `<p>Aún no hay premios.</p><button type="button" class="btn btn-primario" id="prem-cargar">Cargar premios iniciales</button><p class="meta">Los de moto y carro por 150, 250, 300 y 400 puntos. Los puedes editar después.</p>`,
    extraArriba: arriba,
    alCambiar: () => irATab("premios"),
  });

  const cargarPremiosIni = $("#prem-cargar");
  if (cargarPremiosIni) {
    cargarPremiosIni.onclick = async () => {
      await ocupado(cargarPremiosIni, "Cargando...", async () => {
        try {
          const batch = writeBatch(db);
          PREMIOS_INICIALES.forEach((p) => batch.set(doc(collection(db, "premios")), { ...p, activo: true }));
          await batch.commit();
          irATab("premios");
        } catch (error) {
          console.error(error);
          toast("No se pudieron cargar los premios.", "error");
        }
      });
    };
  }

  $$("[data-entregar]", zona()).forEach((b) => {
    b.onclick = async () => {
      await ocupado(b, "Procesando...", async () => {
        try {
          await entregarCanje(b.dataset.entregar);
          toast("Canje entregado y puntos descontados.", "ok");
          irATab("premios");
        } catch (error) {
          console.error("Canje:", error);
          toast(error.message || "No se pudo procesar.", "error");
        }
      });
    };
  });
  $$("[data-rechazar]", zona()).forEach((b) => {
    b.onclick = async () => {
      try {
        await updateDoc(doc(db, "canjes", b.dataset.rechazar), { estado: "rechazado" });
        irATab("premios");
      } catch (error) {
        console.error(error);
        toast("No se pudo rechazar.", "error");
      }
    };
  });
}
