import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDX7k-hOb4v2B7Pu7RPYXk4bJ-0dH0ClSE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "basketball-tournament-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "basketball-tournament-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "basketball-tournament-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "363160318918",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:363160318918:web:5e24df63211fc91c3278c7",
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
)

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined
let storage: FirebaseStorage | undefined

try {
  if (isFirebaseConfigured) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
    console.log("[Firebase] Initialized successfully.")
  } else {
    console.info("[Firebase] Running in offline/mock mode because Firebase configuration is incomplete.")
  }
} catch (error) {
  console.error("[Firebase] Initialization error:", error)
}

export { app, db, auth, storage }
