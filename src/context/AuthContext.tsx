import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth, isFirebaseConfigured } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null | { email: string }
  loading: boolean
  usingMock: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Demo credentials used when Firebase is not configured.
const DEMO_EMAIL = "admin@imrt.edu"
const DEMO_PASSWORD = "imrt3x3"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const saved = sessionStorage.getItem("imrt-admin")
      if (saved) setUser({ email: saved })
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        sessionStorage.setItem("imrt-admin", email)
        setUser({ email })
        return
      }
      throw new Error("Invalid demo credentials")
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      sessionStorage.removeItem("imrt-admin")
      setUser(null)
      return
    }
    await fbSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, usingMock: !isFirebaseConfigured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
