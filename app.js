// Importamos las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

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