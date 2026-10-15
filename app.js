// MG Washers — punto de entrada. Decide qué pantalla ver según quién inició sesión:
//   • jefe / empleado  → panel admin (tienen documento en la colección «usuarios»)
//   • cliente          → su app (tiene documento en «clientes» con su mismo uid)
//   • cuenta nueva     → completar perfil
import { auth, db, doc, getDoc, onAuthStateChanged } from "./js/firebase.js";
import { $, toast } from "./js/util.js";
import { iniciarAcceso, iniciarPerfil, reiniciarAcceso } from "./js/auth.js";
import { iniciarCliente } from "./js/cliente.js";
import { iniciarAdmin } from "./js/admin.js";
import { cargarGaleria } from "./js/galeria.js";

const pantallas = {
  carga: $("#pantalla-carga"),
  acceso: $("#pantalla-acceso"),
  perfil: $("#pantalla-perfil"),
  cliente: $("#vista-cliente"),
  admin: $("#vista-admin"),
};

function mostrar(nombre) {
  Object.entries(pantallas).forEach(([clave, el]) => (el.hidden = clave !== nombre));
  window.scrollTo(0, 0);
}

async function enrutar(user) {
  mostrar("carga");
  try {
    const usuario = await getDoc(doc(db, "usuarios", user.uid));
    if (usuario.exists() && ["jefe", "empleado"].includes(usuario.data().rol)) {
      iniciarAdmin(user, usuario.data());
      return mostrar("admin");
    }
    const cliente = await getDoc(doc(db, "clientes", user.uid));
    if (cliente.exists()) {
      iniciarCliente(user, { id: cliente.id, ...cliente.data() });
      return mostrar("cliente");
    }
    iniciarPerfil(user, () => enrutar(user));
    mostrar("perfil");
  } catch (error) {
    console.error("No se pudo cargar la cuenta:", error);
    toast("No se pudo cargar tu cuenta. Revisa tu conexión e intenta de nuevo.", "error");
    mostrar("acceso");
  }
}

iniciarAcceso();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    reiniciarAcceso();
    mostrar("acceso");
    cargarGaleria();
    return;
  }
  enrutar(user);
});

// PWA: el service worker solo se registra en el sitio publicado (no en Live Server)
if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service worker:", e));
}
