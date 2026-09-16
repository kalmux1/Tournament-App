import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"

type Role = "admin" | "scorer" | "fan" | null

interface AuthContextValue {
  user: User | null
  role: Role
  loading: boolean
  isAdmin: boolean
  isScorer: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; role?: Role; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MASTER_ADMIN_EMAILS = [
  "admin@imrt.in",
  "admin@imrt.edu",
  "admin@imrt3x3.com",
  "contact@imrt.in",
]

// Dev-only bypass. Disabled by default. Enable with VITE_DEV_AUTH_BYPASS=true.
const DEV_AUTH_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === "true"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  const resolveRole = async (currentUser: User): Promise<Role> => {
    const emailLower = (currentUser.email || "").toLowerCase().trim()

    if (MASTER_ADMIN_EMAILS.includes(emailLower)) {
      if (db && isFirebaseConfigured) {
        try {
          const ref = doc(db, "users", currentUser.uid)
          const snap = await getDoc(ref)
          if (!snap.exists() || snap.data()?.role !== "admin") {
            await setDoc(
              ref,
              { email: currentUser.email, role: "admin", updatedAt: serverTimestamp() },
              { merge: true }
            )
          }
        } catch (e) {
          console.error("[Auth] master-admin sync failed:", e)
        }
      }
      return "admin"
    }

    if (!db || !isFirebaseConfigured) return "fan"

    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid))
      if (!snap.exists()) return "fan"
      const r = snap.data()?.role
      return r === "admin" || r === "scorer" ? r : "fan"
    } catch (err) {
      console.error("[Auth] role lookup failed:", err)
      return "fan"
    }
  }

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setRole(currentUser ? await resolveRole(currentUser) : null)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    // Dev bypass — only when explicitly enabled.
    if (DEV_AUTH_BYPASS) {
      const clean = email.toLowerCase().trim()
      const assigned: Role = clean.includes("scorer") ? "scorer" : "admin"
      setUser({ email: clean, uid: `dev_${Date.now()}` } as unknown as User)
      setRole(assigned)
      return { success: true, role: assigned }
    }

    if (!auth || !isFirebaseConfigured) {
      return { success: false, error: "Authentication is unavailable. Configure Firebase." }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const resolved = await resolveRole(cred.user)
      setUser(cred.user)
      setRole(resolved)
      return { success: true, role: resolved }
    } catch (err: any) {
      let message = err?.message || "Login failed."
      if (
        message.includes("auth/invalid-credential") ||
        message.includes("auth/user-not-found") ||
        message.includes("auth/wrong-password")
      ) {
        message = "Invalid email or password."
      } else if (message.includes("auth/too-many-requests")) {
        message = "Too many failed attempts. Please try again later."
      }
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await fbSignOut(auth)
      } catch (err) {
        console.error("[Auth] sign-out failed:", err)
      }
    }
    setUser(null)
    setRole(null)
  }

  const isAdmin = role === "admin"
  const isScorer = role === "scorer" || role === "admin"

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin, isScorer, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}