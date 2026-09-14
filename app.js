// Importamos las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// Configuración de tu proyecto Firebase (piston-wash-app)
const firebaseConfig = {
  apiKey: "AIzaSyCw8BOb3r0l1_AZ1GlgfFb0eNQ7eAwSh6A",
  authDomain: "piston-wash-app.firebaseapp.com",
  projectId: "piston-wash-app",
  storageBucket: "piston-wash-app.firebasestorage.app",
  messagingSenderId: "421425730281",
  appId: "1:421425730281:web:df0a9760fe01af85181678"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos los servicios que vamos a usar
const db = getFirestore(app);   // Conexión a Firestore (base de datos)
const auth = getAuth(app);      // Conexión a Authentication (login)

console.log("✅ Firebase conectado correctamente a Piston Wash App");
console.log(db, auth);

// ===== Pantallas =====
const pantallas = {
  login: document.getElementById("login-screen"),
  dashboard: document.getElementById("dashboard-screen"),
  diagnostico: document.getElementById("diagnostico-screen"),
};

function mostrarPantalla(nombre) {
  Object.entries(pantallas).forEach(([clave, elemento]) => {
    if (elemento) elemento.hidden = clave !== nombre;
  });
}

onAuthStateChanged(auth, (usuario) => {
  mostrarPantalla(usuario ? "dashboard" : "login");
});

// ===== Cerrar sesión =====
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });
}

// ===== Login =====
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");

// Traduce los códigos de error de Firebase Auth a mensajes amigables en español
function traducirErrorFirebase(codigo) {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada. Contacta al Jefe del taller.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intenta de nuevo más tarde.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisa tu internet e intenta de nuevo.";
    case "auth/missing-password":
      return "Debes ingresar tu contraseña.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}

function mostrarMensajeEn(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.classList.remove("error", "success");
  if (tipo) {
    elemento.classList.add(tipo);
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.querySelector(".btn-text").textContent = "Iniciando sesión...";
    mostrarMensajeEn(loginMessage, "", "");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged se encarga de mostrar el dashboard
    } catch (error) {
      console.error("Error de login:", error.code, error.message);
      mostrarMensajeEn(loginMessage, traducirErrorFirebase(error.code), "error");
    } finally {
      loginBtn.disabled = false;
      loginBtn.querySelector(".btn-text").textContent = "Iniciar sesión";
    }
  });
}

// ===== Nuevo Diagnóstico =====
const btnNuevoDiagnostico = document.getElementById("btn-nuevo-diagnostico");
const volverDashboardBtn = document.getElementById("volver-dashboard-btn");

const buscarClienteInput = document.getElementById("buscar-cliente");
const buscarClienteBtn = document.getElementById("buscar-cliente-btn");
const buscarMensaje = document.getElementById("buscar-mensaje");

const clienteNombreInput = document.getElementById("cliente-nombre");
const clienteTelefonoInput = document.getElementById("cliente-telefono");
const motoMarcaInput = document.getElementById("moto-marca");
const motoModeloInput = document.getElementById("moto-modelo");
const motoPlacaInput = document.getElementById("moto-placa");

const repuestosList = document.getElementById("repuestos-list");
const agregarRepuestoBtn = document.getElementById("agregar-repuesto-btn");
const totalCostoInput = document.getElementById("total-costo");
const atendidoPorInput = document.getElementById("atendido-por");

const diagnosticoForm = document.getElementById("diagnostico-form");
const guardarDiagnosticoBtn = document.getElementById("guardar-diagnostico-btn");
const diagnosticoMensaje = document.getElementById("diagnostico-mensaje");

let clienteEncontradoId = null;

function recalcularTotal() {
  const costos = repuestosList.querySelectorAll(".repuesto-costo");
  let suma = 0;
  costos.forEach((input) => {
    const valor = parseFloat(input.value);
    if (!isNaN(valor)) suma += valor;
  });
  totalCostoInput.value = suma.toFixed(2);
}

function crearFilaRepuesto() {
  const fila = document.createElement("div");
  fila.className = "repuesto-row";
  fila.innerHTML = `
    <input type="text" class="repuesto-nombre" placeholder="Nombre del repuesto o servicio">
    <input type="number" class="repuesto-costo" placeholder="Costo" min="0" step="0.01">
    <button type="button" class="btn-quitar-repuesto" aria-label="Quitar">✕</button>
  `;
  fila.querySelector(".repuesto-costo").addEventListener("input", recalcularTotal);
  fila.querySelector(".btn-quitar-repuesto").addEventListener("click", () => {
    fila.remove();
    recalcularTotal();
  });
  return fila;
}

function resetearFormularioDiagnostico() {
  diagnosticoForm.reset();
  repuestosList.innerHTML = "";
  repuestosList.appendChild(crearFilaRepuesto());
  totalCostoInput.value = "0.00";
  clienteEncontradoId = null;
  buscarClienteInput.value = "";
  mostrarMensajeEn(buscarMensaje, "", "");
  mostrarMensajeEn(diagnosticoMensaje, "", "");
  atendidoPorInput.value = auth.currentUser ? auth.currentUser.email : "";
}

if (btnNuevoDiagnostico) {
  btnNuevoDiagnostico.addEventListener("click", () => {
    resetearFormularioDiagnostico();
    mostrarPantalla("diagnostico");
  });
}

if (volverDashboardBtn) {
  volverDashboardBtn.addEventListener("click", () => {
    mostrarPantalla("dashboard");
  });
}

if (agregarRepuestoBtn) {
  agregarRepuestoBtn.addEventListener("click", () => {
    repuestosList.appendChild(crearFilaRepuesto());
  });
}

// Busca un cliente existente en Firestore por teléfono o placa y autocompleta el formulario
async function buscarCliente() {
  const valor = buscarClienteInput.value.trim();
  if (!valor) return;

  mostrarMensajeEn(buscarMensaje, "Buscando...", "");

  try {
    let snapshot = await getDocs(query(collection(db, "clientes"), where("telefono", "==", valor)));
    if (snapshot.empty) {
      snapshot = await getDocs(query(collection(db, "clientes"), where("placa", "==", valor)));
    }

    if (snapshot.empty) {
      clienteEncontradoId = null;
      mostrarMensajeEn(buscarMensaje, "Cliente no encontrado. Puedes registrarlo como nuevo.", "error");
      return;
    }

    const docEncontrado = snapshot.docs[0];
    const datos = docEncontrado.data();
    clienteEncontradoId = docEncontrado.id;

    clienteNombreInput.value = datos.nombre || "";
    clienteTelefonoInput.value = datos.telefono || "";
    motoMarcaInput.value = datos.marca || "";
    motoModeloInput.value = datos.modelo || "";
    motoPlacaInput.value = datos.placa || "";

    mostrarMensajeEn(buscarMensaje, "✅ Cliente encontrado y datos autocompletados.", "success");
  } catch (error) {
    console.error("Error al buscar cliente:", error);
    mostrarMensajeEn(buscarMensaje, "Error al buscar. Intenta de nuevo.", "error");
  }
}

if (buscarClienteBtn) {
  buscarClienteBtn.addEventListener("click", buscarCliente);
}

if (buscarClienteInput) {
  buscarClienteInput.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      buscarCliente();
    }
  });
}

if (diagnosticoForm) {
  diagnosticoForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const clienteData = {
      nombre: clienteNombreInput.value.trim(),
      telefono: clienteTelefonoInput.value.trim(),
      marca: motoMarcaInput.value.trim(),
      modelo: motoModeloInput.value.trim(),
      placa: motoPlacaInput.value.trim(),
    };

    const repuestos = Array.from(repuestosList.querySelectorAll(".repuesto-row"))
      .map((fila) => ({
        nombre: fila.querySelector(".repuesto-nombre").value.trim(),
        costo: parseFloat(fila.querySelector(".repuesto-costo").value) || 0,
      }))
      .filter((repuesto) => repuesto.nombre !== "");

    const total = parseFloat(totalCostoInput.value) || 0;

    guardarDiagnosticoBtn.disabled = true;
    guardarDiagnosticoBtn.querySelector(".btn-text").textContent = "Guardando...";
    mostrarMensajeEn(diagnosticoMensaje, "", "");

    try {
      let clienteId = clienteEncontradoId;

      if (clienteId) {
        await updateDoc(doc(db, "clientes", clienteId), clienteData);
      } else {
        const nuevoCliente = await addDoc(collection(db, "clientes"), clienteData);
        clienteId = nuevoCliente.id;
      }

      await addDoc(collection(db, "diagnosticos"), {
        clienteId,
        ...clienteData,
        repuestos,
        total,
        atendidoPor: auth.currentUser.email,
        fecha: serverTimestamp(),
      });

      clienteEncontradoId = clienteId;
      mostrarMensajeEn(diagnosticoMensaje, "✅ Diagnóstico guardado correctamente.", "success");
    } catch (error) {
      console.error("Error al guardar diagnóstico:", error);
      mostrarMensajeEn(diagnosticoMensaje, "No se pudo guardar el diagnóstico. Intenta de nuevo.", "error");
    } finally {
      guardarDiagnosticoBtn.disabled = false;
      guardarDiagnosticoBtn.querySelector(".btn-text").textContent = "Guardar diagnóstico";
    }
  });
}