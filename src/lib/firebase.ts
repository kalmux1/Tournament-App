import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
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
    console.error(
      "[Firebase] Missing configuration. Set VITE_FIREBASE_* environment variables."
    )
  }
} catch (error) {
  console.error("[Firebase] Initialization error:", error)
}

export { app, db, auth, storage }