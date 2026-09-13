import { initializeApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Check if VITE_FIREBASE_API_KEY exists before calling initializeApp
const hasApiKey = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY.trim() !== "")

if (!hasApiKey) {
  console.warn("Firebase environment variables are missing in .env")
}

export const isFirebaseConfigured = Boolean(
  hasApiKey &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
)

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined
let storage: FirebaseStorage | undefined

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
    console.log("[Firebase] Initialized successfully.")
  } else {
    console.info("[Firebase] Running in offline/mock mode because Firebase environment variables are not configured in .env.")
  }
} catch (error) {
  console.error("[Firebase] Initialization error:", error)
}

export { app, db, auth, storage }
