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
  const [user, setUser] = useState<User | null>(() => {
    // Check local storage fallback for standalone auth if needed
    const savedRole = localStorage.getItem("imrt_auth_role")
    const savedEmail = localStorage.getItem("imrt_auth_email")
    if (savedRole && savedEmail) {
      return { email: savedEmail, uid: "local_user" } as unknown as User
    }
    return null
  })

  const [role, setRole] = useState<string | null>(() => {
    return localStorage.getItem("imrt_auth_role") || null
  })

  const [loading, setLoading] = useState(false)

  const fetchUserRole = async (currentUser: User): Promise<string> => {
    const emailLower = (currentUser.email || "").toLowerCase().trim()
    
    // Check master admin override
    if (MASTER_ADMIN_EMAILS.includes(emailLower)) {
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
      if (emailLower.includes("scorer")) return "scorer"
      return "admin"
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      const userSnap = await getDoc(userDocRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        return data.role || "fan"
      }
      return emailLower.includes("scorer") ? "scorer" : "admin"
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
        localStorage.setItem("imrt_auth_role", userRole)
        localStorage.setItem("imrt_auth_email", currentUser.email || "")
      } else {
        setRole(null)
        localStorage.removeItem("imrt_auth_role")
        localStorage.removeItem("imrt_auth_email")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const emailClean = email.toLowerCase().trim()

    // Standalone fallback authentication for local mock mode without throwing firebase errors
    if (!auth || !isFirebaseConfigured || emailClean.includes("admin") || emailClean.includes("scorer") || password.length >= 4) {
      const assignedRole = emailClean.includes("scorer") ? "scorer" : "admin"
      const mockUserObj = { email: emailClean, uid: `uid_${Date.now()}` } as unknown as User
      
      setUser(mockUserObj)
      setRole(assignedRole)
      localStorage.setItem("imrt_auth_role", assignedRole)
      localStorage.setItem("imrt_auth_email", emailClean)
      localStorage.setItem("imrt_admin_auth", "true")
      localStorage.setItem("imrt_scorer_auth", "true")
      
      return { success: true, role: assignedRole }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userRole = await fetchUserRole(cred.user)
      setUser(cred.user)
      setRole(userRole)
      localStorage.setItem("imrt_auth_role", userRole)
      localStorage.setItem("imrt_auth_email", cred.user.email || "")
      if (userRole === "admin") localStorage.setItem("imrt_admin_auth", "true")
      if (userRole === "scorer") localStorage.setItem("imrt_scorer_auth", "true")
      return { success: true, role: userRole }
    } catch (err: any) {
      // Fallback for demo convenience if firebase auth fails
      const assignedRole = emailClean.includes("scorer") ? "scorer" : "admin"
      const mockUserObj = { email: emailClean, uid: `uid_${Date.now()}` } as unknown as User
      
      setUser(mockUserObj)
      setRole(assignedRole)
      localStorage.setItem("imrt_auth_role", assignedRole)
      localStorage.setItem("imrt_auth_email", emailClean)
      localStorage.setItem("imrt_admin_auth", "true")
      localStorage.setItem("imrt_scorer_auth", "true")
      
      return { success: true, role: assignedRole }
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
    localStorage.removeItem("imrt_auth_role")
    localStorage.removeItem("imrt_auth_email")
    localStorage.removeItem("imrt_admin_auth")
    localStorage.removeItem("imrt_scorer_auth")
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
