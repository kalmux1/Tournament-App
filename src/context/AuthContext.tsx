import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  role: string | null
  loading: boolean
  isAdmin: boolean
  isScorer: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserRole = async (currentUser: User) => {
    if (!db) {
      // Fallback role assignment if firestore is not configured
      return "fan"
    }
    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      const userSnap = await getDoc(userDocRef)
      if (userSnap.exists()) {
        const data = userSnap.data()
        return data.role || "fan"
      }
      return "fan"
    } catch {
      return "fan"
    }
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const userRole = await fetchUserRole(currentUser)
        setRole(userRole)
      } else {
        setRole(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) {
      return { success: false, error: "Authentication service unavailable." }
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userRole = await fetchUserRole(cred.user)
      setUser(cred.user)
      setRole(userRole)
      return { success: true, role: userRole }
    } catch (err: any) {
      const code = err?.code || ""
      let message = "Login failed. Please try again."
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        message = "Invalid email or password."
      } else if (code === "auth/too-many-requests") {
        message = "Too many attempts. Try again later."
      } else if (code === "auth/network-request-failed") {
        message = "Network error. Check your connection."
      }
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    if (auth) {
      await fbSignOut(auth)
    }
    setUser(null)
    setRole(null)
  }

  const isAdmin = role === "admin"
  const isScorer = role === "scorer"

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAdmin,
        isScorer,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
