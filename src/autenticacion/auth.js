// ╔══════════════════════════════════════════════════════════════╗
// ║  AUTENTICACIÓN
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Pantalla de acceso: ingresar, crear cuenta, Google, olvidé contraseña, completar perfil y cerrar sesión.
// QUÉ CAMBIAR:  Textos de errores de acceso y campos del perfil nuevo.
// CABLES A:     conexion/firebase.js · utilidades/util.js

// Acceso: ingresar, crear cuenta (cliente), Google y completar perfil.
// El personal (jefe/empleado) sigue entrando con las cuentas que creas a mano en Firebase.
import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "../conexion/firebase.js";
import { $, $$, mensajeEn, ocupado, normalizarTelefono, toast } from "../utilidades/util.js";

export const salir = () => signOut(auth);

export function traducirError(codigo) {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Escríbenos por WhatsApp.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese correo ya tiene cuenta. Prueba en «Ingresar».";
    case "auth/weak-password":
      return "La contraseña debe tener mínimo 6 caracteres.";
    case "auth/missing-password":
      return "Escribe tu contraseña.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta de nuevo en unos minutos.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta de nuevo.";
    default:
      return "No se pudo completar la acción. Intenta de nuevo.";
  }
}

function elegirPestana(nombre) {
  $$("[data-acceso-tab]").forEach((p) => p.setAttribute("aria-selected", String(p.dataset.accesoTab === nombre)));
  $("#form-ingresar").hidden = nombre !== "ingresar";
  $("#form-registro").hidden = nombre !== "registro";
  mensajeEn($("#msg-acceso"), "");
}

// Al cerrar sesión: vuelve a «Ingresar» y borra lo escrito
export function reiniciarAcceso() {
  $("#form-ingresar").reset();
  $("#form-registro").reset();
  elegirPestana("ingresar");
}

export function iniciarAcceso() {
  const msg = $("#msg-acceso");
  const formIngresar = $("#form-ingresar");
  const formRegistro = $("#form-registro");

  $$("[data-acceso-tab]").forEach((pestana) => {
    pestana.onclick = () => elegirPestana(pestana.dataset.accesoTab);
  });

  formIngresar.onsubmit = async (e) => {
    e.preventDefault();
    mensajeEn(msg, "");
    await ocupado($("#btn-ingresar"), "Ingresando...", async () => {
      try {
        await signInWithEmailAndPassword(auth, $("#ingresar-email").value.trim(), $("#ingresar-password").value);
      } catch (error) {
        console.error("Login:", error.code);
        mensajeEn(msg, traducirError(error.code), "error");
      }
    });
  };

  formRegistro.onsubmit = async (e) => {
    e.preventDefault();
    mensajeEn(msg, "");
    await ocupado($("#btn-registro"), "Creando cuenta...", async () => {
      try {
        await createUserWithEmailAndPassword(auth, $("#registro-email").value.trim(), $("#registro-password").value);
      } catch (error) {
        console.error("Registro:", error.code);
        mensajeEn(msg, traducirError(error.code), "error");
      }
    });
  };

  $("#btn-olvide").onclick = async () => {
    const email = $("#ingresar-email").value.trim();
    if (!email) return mensajeEn(msg, "Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?».", "error");
    try {
      await sendPasswordResetEmail(auth, email);
      mensajeEn(msg, "Te enviamos un correo para cambiar la contraseña. Revisa también el spam.", "ok");
    } catch (error) {
      mensajeEn(msg, traducirError(error.code), "error");
    }
  };

  $("#btn-google").onclick = async () => {
    mensajeEn(msg, "");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") return;
      console.error("Google:", error.code);
      mensajeEn(msg, traducirError(error.code), "error");
    }
  };
}

// Primera vez de un cliente: pedimos nombre, celular y permiso para mostrar sus fotos
export function iniciarPerfil(user, alCompletar) {
  const msg = $("#msg-perfil");
  mensajeEn(msg, "");
  $("#perfil-nombre").value = user.displayName || "";
  $("#perfil-telefono").value = "";
  $("#perfil-fotos").checked = false;
  $("#btn-perfil-salir").onclick = salir;

  $("#form-perfil").onsubmit = async (e) => {
    e.preventDefault();
    const nombre = $("#perfil-nombre").value.trim();
    const telefono = normalizarTelefono($("#perfil-telefono").value);
    if (nombre.length < 3) return mensajeEn(msg, "Escribe tu nombre completo.", "error");
    if (!/^\d{10}$/.test(telefono)) return mensajeEn(msg, "Escribe tu celular de 10 dígitos, sin +57.", "error");

    await ocupado($("#btn-perfil-guardar"), "Guardando...", async () => {
      try {
        await setDoc(doc(db, "clientes", user.uid), {
          uid: user.uid,
          nombre,
          telefono,
          email: user.email || "",
          autorizaFotos: $("#perfil-fotos").checked,
          puntosDisponibles: 0,
          puntosAcumulados: 0,
          serviciosTotal: 0,
          totalGastado: 0,
          creado: serverTimestamp(),
        });
        alCompletar();
      } catch (error) {
        console.error("Perfil:", error);
        toast("No se pudo guardar tu perfil. Intenta de nuevo.", "error");
      }
    });
  };
}
