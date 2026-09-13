import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"

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

// Permitted hardcoded admin emails as fallback/master admins
const MASTER_ADMIN_EMAILS = [
  "admin@imrt.in",
  "admin@imrt.edu",
  "admin@imrt3x3.com",
  "contact@imrt.in"
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserRole = async (currentUser: User): Promise<string> => {
    const emailLower = (currentUser.email || "").toLowerCase().trim()
    
    // Check master admin override
    if (MASTER_ADMIN_EMAILS.includes(emailLower)) {
      console.warn("User authenticated as Master Admin via override list:", emailLower)
      // Ensure user doc exists in Firestore as admin if db is available
      if (db && isFirebaseConfigured) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          const userSnap = await getDoc(userDocRef)
          if (!userSnap.exists() || userSnap.data()?.role !== "admin") {
            await setDoc(userDocRef, {
              email: currentUser.email,
              role: "admin",
              updatedAt: serverTimestamp()
            }, { merge: true })
          }
        } catch (e) {
          console.error("Failed to sync master admin doc:", e)
        }
      }
      return "admin"
    }

    if (!db || !isFirebaseConfigured) {
      return "fan"
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      const userSnap = await getDoc(userDocRef)
      
      console.warn("User role check details:", {
        email: currentUser.email,
        uid: currentUser.uid,
        exists: userSnap.exists(),
        data: userSnap.exists() ? userSnap.data() : null
      })

      if (userSnap.exists()) {
        const data = userSnap.data()
        return data.role || "fan"
      }

      // Check if email collection check is needed
      return "fan"
    } catch (err) {
      console.error("Error fetching user role:", err)
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
    if (!auth || !isFirebaseConfigured) {
      return {
        success: false,
        error: "Authentication service unavailable. Please check your Firebase environment configuration.",
      }
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userRole = await fetchUserRole(cred.user)
      setUser(cred.user)
      setRole(userRole)
      return { success: true, role: userRole }
    } catch (err: any) {
      const code = err?.code || ""
      let message = "Login failed. Please check your credentials."
      
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        message = "Invalid email or password."
      } else if (code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later."
      } else if (code === "auth/operation-not-allowed") {
        message = "Email/password sign-in is not enabled in Firebase Console."
      } else if (code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection."
      } else if (err?.message) {
        message = err.message
      }

      return { success: false, error: message }
    }
  }

  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await fbSignOut(auth)
      } catch (err) {
        console.error("Logout error:", err)
      }
    }
    setUser(null)
    setRole(null)
  }

  const isAdmin = role === "admin"
  const isScorer = role === "scorer" || role === "admin"

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
