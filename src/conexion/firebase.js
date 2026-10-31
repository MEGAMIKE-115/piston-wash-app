// ╔══════════════════════════════════════════════════════════════╗
// ║  CONEXIÓN · FIREBASE
// ╚══════════════════════════════════════════════════════════════╝
// QUÉ HACE:     Único lugar donde se conecta con Firebase (Auth + Firestore). El resto de archivos importa de aquí, nunca directo de internet.
// QUÉ CAMBIAR:  Para actualizar la versión de Firebase se cambia la URL de este archivo (y en sw.js si cambia el número).
// CABLES A:     configuracion/config.js (llaves del proyecto)

// Un solo punto de conexión con Firebase. Todo el resto de la app importa desde aquí.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { firebaseConfig } from "../configuracion/config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  runTransaction,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
};
