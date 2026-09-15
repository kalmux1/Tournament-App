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
import ProtectedRoute from "./components/ProtectedRoute"
import { DataProvider } from "./context/DataContext"

export default function App() {
  const location = useLocation()
  const isAdminOrScorer = location.pathname.startsWith("/admin") || location.pathname.startsWith("/scorer")

  return (
    <DataProvider>
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
                <ProtectedRoute requireRole="admin" redirectTo="/admin/login">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="/scorer/login" element={<ScorerLogin />} />
            <Route
              path="/scorer"
              element={
                <ProtectedRoute requireRole={['admin', 'scorer']} redirectTo="/scorer/login">
                  <ScorerDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {!isAdminOrScorer && <Footer />}
      </div>
    </DataProvider>
  )
}
