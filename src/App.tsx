import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import Navbar from "./components/layout/Navbar"
import Footer from "./components/layout/Footer"
import Ticker from "./components/layout/Ticker"
import Home from "./pages/Home"
import Register from "./pages/Register"
import Hub from "./pages/Hub"
import Rules from "./pages/Rules"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminDashboard from "./pages/admin/AdminDashboard"
import ScorerLogin from "./pages/scorer/ScorerLogin"
import ScorerDashboard from "./pages/scorer/ScorerDashboard"
import { useAuth } from "./context/AuthContext"

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}

function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const isAuthed = localStorage.getItem("imrt_admin_auth") === "true"
  if (!isAuthed) return <Navigate to="/admin/login" replace />
  return children
}

function ProtectedScorerRoute({ children }: { children: JSX.Element }) {
  const isAuthed = localStorage.getItem("imrt_scorer_auth") === "true"
  if (!isAuthed) return <Navigate to="/scorer/login" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const isAdminOrScorer = location.pathname.startsWith("/admin") || location.pathname.startsWith("/scorer")

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdminOrScorer && <Ticker />}
      {!isAdminOrScorer && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/rules" element={<Rules />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          <Route path="/scorer/login" element={<ScorerLogin />} />
          <Route
            path="/scorer"
            element={
              <ProtectedScorerRoute>
                <ScorerDashboard />
              </ProtectedScorerRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminOrScorer && <Footer />}
    </div>
  )
}
