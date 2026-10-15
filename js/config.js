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

// 1 punto por cada $1.500 pagados (60.000 COP = 40 puntos)
export const PUNTOS_POR_PESOS = 1500;

// El nivel se calcula con los puntos acumulados de toda la vida (canjear no baja el nivel)
export const NIVELES = [
  { nombre: "Bronce", desde: 0 },
  { nombre: "Plata", desde: 200 },
  { nombre: "Oro", desde: 500 },
];

export const TIPOS_VEHICULO = [
  { id: "carro", nombre: "Carro" },
  { id: "moto", nombre: "Moto" },
  { id: "mueble", nombre: "Mueble / tapicería" },
];

export const METODOS_PAGO = ["Efectivo", "Nequi", "Transferencia"];

// Catálogo inicial (el Jefe puede editar precios después). Referencias de Fusagasugá.
export const CATALOGO_INICIAL = [
  { nombre: "Lavado básico", precio: 50000 },
  { nombre: "Tapicería: asientos", precio: 45000 },
  { nombre: "Tapicería: techo", precio: 45000 },
  { nombre: "Tapicería: alfombra", precio: 45000 },
  { nombre: "Combo tapicería completa", precio: 180000 },
  { nombre: "Combo detallado completo", precio: 235000 },
  { nombre: "Detallado de moto completo", precio: 100000 },
];
