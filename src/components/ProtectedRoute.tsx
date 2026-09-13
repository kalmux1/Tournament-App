import { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

interface ProtectedRouteProps {
  children: ReactNode
  requireRole: "admin" | "scorer" | ("admin" | "scorer")[]
  redirectTo: string
}

export default function ProtectedRoute({
  children,
  requireRole,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-gold-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent"></div>
          <span className="font-display text-lg tracking-wider">Loading…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole]
  if (!role || !allowedRoles.includes(role as any)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
