import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"

// ============================================================
// ⚙️  EDIT THESE BEFORE DEPLOYING
// ============================================================
// Replace with the REAL emails of your admins and scorers.
// These addresses must be able to receive verification emails —
// fake/nonexistent addresses will never pass the emailVerified
// gate below and the affected users will be locked out.
//
// Keep this list in sync with the whitelists in `firestore.rules`
// (isMasterAdminEmail / isMasterScorerEmail). If they drift, the
// client will think you're admin but Firestore will reject the
// role-doc write — a confusing half-broken state.
//
// Store them lowercase. Firebase Auth lowercases email tokens, and
// we compare lowercase-to-lowercase here.
// ============================================================

const MASTER_ADMIN_EMAILS = [
  "admin@imrt.in",        // ← replace with your real email
  "admin@imrt.edu",       // ← replace with your real email
  "admin@imrt3x3.com",    // ← replace with your real email
  "contact@imrt.in",      // ← replace with your real email
]

const MASTER_SCORER_EMAILS = [
  "scorer@imrt.in",       // ← replace with your real email
  "scorer1@imrt.in",      // ← replace with your real email
  "table@imrt.in",        // ← replace with your real email
]

// ============================================================

type Role = "admin" | "scorer" | "fan" | null

interface AuthContextValue {
  user: User | null
  role: Role
  loading: boolean
  isAdmin: boolean
  isScorer: boolean
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; role?: Role; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Dev-only bypass. Disabled by default. Enable with VITE_DEV_AUTH_BYPASS=true
// in .env.local. NEVER set this in production or preview deployments.
const DEV_AUTH_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === "true"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Resolve a signed-in user to a role.
   * Order of precedence:
   *   1. Verified + whitelisted email → admin/scorer (and self-heal the
   *      role doc in `users/{uid}` so Firestore rules stay happy).
   *   2. Existing `users/{uid}.role` doc → admin/scorer/fan.
   *   3. Fallback: fan.
   */
  const resolveRole = async (currentUser: User): Promise<Role> => {
    const emailLower = (currentUser.email || "").toLowerCase().trim()
    const verified = currentUser.emailVerified === true

    // 1. Master admin — requires verified email.
    if (verified && MASTER_ADMIN_EMAILS.includes(emailLower)) {
      if (db && isFirebaseConfigured) {
        try {
          const ref = doc(db, "users", currentUser.uid)
          const snap = await getDoc(ref)
          if (!snap.exists() || snap.data()?.role !== "admin") {
            await setDoc(
              ref,
              {
                email: currentUser.email,
                role: "admin",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          }
        } catch (e) {
          console.error("[Auth] master-admin sync failed:", e)
        }
      }
      return "admin"
    }

    // 2. Master scorer — requires verified email.
    if (verified && MASTER_SCORER_EMAILS.includes(emailLower)) {
      if (db && isFirebaseConfigured) {
        try {
          const ref = doc(db, "users", currentUser.uid)
          const snap = await getDoc(ref)
          if (!snap.exists() || snap.data()?.role !== "scorer") {
            await setDoc(
              ref,
              {
                email: currentUser.email,
                role: "scorer",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          }
        } catch (e) {
          console.error("[Auth] master-scorer sync failed:", e)
        }
      }
      return "scorer"
    }

    // 3. Fall back to the role stored on the user doc, if any.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    // ---- Dev bypass ----------------------------------------------------
    // Only active when VITE_DEV_AUTH_BYPASS=true. Skips Firebase entirely
    // and grants a synthetic session. Anyone typing an email containing
    // "scorer" becomes a scorer; everyone else becomes an admin.
    // NEVER enable this in a deployed environment.
    if (DEV_AUTH_BYPASS) {
      const clean = email.toLowerCase().trim()
      const assigned: Role = clean.includes("scorer") ? "scorer" : "admin"
      setUser({
        email: clean,
        uid: `dev_${Date.now()}`,
        emailVerified: true,
      } as unknown as User)
      setRole(assigned)
      return { success: true, role: assigned }
    }
    // --------------------------------------------------------------------

    if (!auth || !isFirebaseConfigured) {
      return {
        success: false,
        error: "Authentication is unavailable. Configure Firebase.",
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)

      // Hard requirement: only verified emails can hold elevated roles.
      // This mirrors the Firestore rules' isVerified() gate.
      if (!cred.user.emailVerified) {
        const fallback = await resolveRole(cred.user)
        if (fallback === "admin" || fallback === "scorer") {
          await fbSignOut(auth)
          return {
            success: false,
            error:
              "Please verify your email address before signing in to a staff portal. " +
              "Check your inbox for the verification link and try again.",
          }
        }
      }

      const resolved = await resolveRole(cred.user)
      setUser(cred.user)
      setRole(resolved)
      return { success: true, role: resolved }
    } catch (err: any) {
      // Normalise Firebase error codes into human-readable strings.
      let message = err?.message || "Login failed."

      if (
        message.includes("auth/invalid-credential") ||
        message.includes("auth/user-not-found") ||
        message.includes("auth/wrong-password")
      ) {
        message = "Invalid email or password."
      } else if (message.includes("auth/too-many-requests")) {
        message =
          "Too many failed attempts. Please try again in a few minutes."
      } else if (message.includes("auth/network-request-failed")) {
        message =
          "Network error. Check your connection and try again."
      } else if (message.includes("auth/user-disabled")) {
        message = "This account has been disabled. Contact an organiser."
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
    <AuthContext.Provider
      value={{ user, role, loading, isAdmin, isScorer, login, logout }}
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