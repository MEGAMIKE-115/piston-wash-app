// ╔══════════════════════════════════════════════════════════════╗
// ║  CONFIGURACIÓN
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Todo lo que cambia con el negocio: llaves de Firebase, WhatsApp, puntos, rangos, catálogo y premios iniciales.
// QUÉ CAMBIAR:  Casi todo lo que quieras ajustar (precios, puntos, rangos, premios) se cambia SOLO aquí.
// CABLES A:     No importa nada: lo usan los demás archivos.

// Configuración central de MG Washers. Lo que cambia con el negocio vive aquí.

// Proyecto Firebase (el mismo que ya tienes: piston-wash-app)
export const firebaseConfig = {
  apiKey: "AIzaSyCw8BOb3r0l1_AZ1GlgfFb0eNQ7eAwSh6A",
  authDomain: "piston-wash-app.firebaseapp.com",
  projectId: "piston-wash-app",
  storageBucket: "piston-wash-app.firebasestorage.app",
  messagingSenderId: "421425730281",
  appId: "1:421425730281:web:df0a9760fe01af85181678",
};

export const NEGOCIO = {
  nombre: "MG Washers",
  // WhatsApp del negocio: indicativo + número, solo dígitos. Ejemplo: "573001234567"
  // Mientras tenga las X, los botones abren WhatsApp para elegir contacto.
  whatsapp: "57XXXXXXXXXX",
  ciudad: "Fusagasugá, Cundinamarca",
};

// 1 punto por cada $1.000 pagados (60.000 COP = 60 puntos)
export const PUNTOS_POR_PESOS = 1000;

// El rango se calcula con los puntos acumulados de toda la vida (canjear no baja el rango).
// Cada rango tiene divisiones: la primera cifra es donde empieza III, luego II y luego I.
// Leyenda no tiene final: sube Leyenda 1, 2, 3… cada PASO_LEYENDA puntos.
export const RANGOS = [
  { id: "bronce", nombre: "Bronce", desde: [0, 70, 140] },
  { id: "plata", nombre: "Plata", desde: [200, 300, 400] },
  { id: "oro", nombre: "Oro", desde: [500, 670, 840] },
  { id: "platino", nombre: "Platino", desde: [1000, 1330, 1660] },
  { id: "diamante", nombre: "Diamante", desde: [2000, 2500, 3000] },
  { id: "maestro", nombre: "Maestro", desde: [3500, 4170, 4830] },
];
export const LEYENDA = { id: "leyenda", nombre: "Leyenda", desde: 5500 };
export const PASO_LEYENDA = 2500;

// Premios iniciales (el Jefe los puede cambiar en la pestaña Premios).
// Se canjean el día que el cliente paga una lavada básica.
export const PREMIOS_INICIALES = [
  { nombre: "Moto · Desmontar guardabarro y limpiar", puntos: 150, tipo: "moto" },
  { nombre: "Moto · Desmontar silla y limpiar debajo", puntos: 150, tipo: "moto" },
  { nombre: "Moto · Limpieza de batería", puntos: 150, tipo: "moto" },
  { nombre: "Moto · Polichada hidrofóbica Meguiar's", puntos: 300, tipo: "moto" },
  { nombre: "Carro · Limpieza de plásticos completos", puntos: 150, tipo: "carro" },
  { nombre: "Carro · Volante (manubrio) a profundidad", puntos: 150, tipo: "carro" },
  { nombre: "Carro · Limpieza de motor", puntos: 250, tipo: "carro" },
  { nombre: "Carro · Polichada hidrofóbica Meguiar's", puntos: 400, tipo: "carro" },
];

export const TIPOS_VEHICULO = [
  { id: "carro", nombre: "Carro" },
  { id: "camioneta", nombre: "Camioneta" },
  { id: "moto", nombre: "Moto" },
  { id: "mueble", nombre: "Mueble / tapicería" },
];

export const METODOS_PAGO = ["Efectivo", "Nequi", "Transferencia"];

// Catálogo inicial (el Jefe puede editar precios después). Referencias de Fusagasugá.
export const CATALOGO_INICIAL = [
  { nombre: "Camioneta · Lavada básica completa", precio: 60000 },
  { nombre: "Carro · Lavada básica completa", precio: 55000 },
  { nombre: "Moto · Lavada básica completa", precio: 30000 },
  { nombre: "Limpieza de motor", precio: 15000 },
  { nombre: "Tapicería: techo", precio: 50000 },
  { nombre: "Tapicería: piso", precio: 40000 },
  { nombre: "Tapicería: sillas", precio: 80000 },
  { nombre: "Combo tapicería completa", precio: 150000 },
  { nombre: "Moto · Kit de arrastre", precio: 7000 },
  { nombre: "Moto · Batería", precio: 12000 },
  { nombre: "Moto · Tapas y silla", precio: 13000 },
  { nombre: "Moto · Exosto", precio: 15000 },
  { nombre: "Moto · Detallado total", precio: 60000 },
];
