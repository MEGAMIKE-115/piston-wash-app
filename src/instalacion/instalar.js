// ╔══════════════════════════════════════════════════════════════╗
// ║  INSTALACIÓN · DESCARGA DE LA APP
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Muestra el aviso «Instalar app» cuando el navegador lo permite y las instrucciones para iPhone.
// QUÉ CAMBIAR:  Texto y comportamiento del aviso de instalación.
// CABLES A:     Ninguna (solo el navegador).

// Botón "Instalar app": aparece solo si el navegador deja instalar y la app aún no está instalada.
let evento = null;
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function recordado() {
  try { return localStorage.getItem("mg-instalar-oculto") === "1"; } catch { return false; }
}
function recordar() {
  try { localStorage.setItem("mg-instalar-oculto", "1"); } catch {}
}

function mostrar(texto, accion) {
  if (instalada() || recordado() || document.getElementById("banner-instalar")) return;
  const b = document.createElement("div");
  b.id = "banner-instalar";
  b.className = "banner-instalar";
  b.innerHTML = `<span></span>${accion ? '<button type="button" class="btn btn-primario btn-chico" id="bi-ok">Instalar</button>' : ""}<button type="button" class="link" id="bi-no" aria-label="Cerrar">✕</button>`;
  b.querySelector("span").textContent = texto;
  document.body.appendChild(b);
  b.querySelector("#bi-no").onclick = () => { recordar(); b.remove(); };
  const ok = b.querySelector("#bi-ok");
  if (ok) ok.onclick = async () => {
    b.remove();
    evento.prompt();
    await evento.userChoice.catch(() => null);
    evento = null;
  };
}

export function iniciarInstalacion() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e;
    mostrar("Instala MG Washers en tu celular", true);
  });
  window.addEventListener("appinstalled", () => document.getElementById("banner-instalar")?.remove());
  if (esIOS() && !instalada()) setTimeout(() => mostrar("En iPhone: toca Compartir y luego «Agregar a pantalla de inicio»", false), 1500);
}
