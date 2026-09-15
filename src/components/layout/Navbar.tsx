import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Trophy, Menu, X, LogOut, Shield, Award, User as UserIcon } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Championship Hub", href: "/hub" },
    { name: "Register Team", href: "/register" },
    { name: "Rules & Format", href: "/rules" },
  ]

  // If user is authenticated as admin or scorer, go straight to dashboard, otherwise go to login portal
  const adminDest = role === "admin" ? "/admin" : "/admin/login"
  const scorerDest = (role === "admin" || role === "scorer") ? "/scorer" : "/scorer/login"

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-amber-600 text-slate-950 shadow-lg shadow-gold-500/20">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-wider text-white">IMRT 3x3</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-gold-500">Championship</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium transition hover:text-gold-400 ${
                  isActive ? "text-gold-500 font-semibold" : "text-slate-300"
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Right side actions - Always showing Admin & Scorer buttons alongside user profile if logged in */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-2 backdrop-blur-sm">
              {role === "admin" ? (
                <Shield className="h-3.5 w-3.5 text-gold-400" />
              ) : role === "scorer" ? (
                <Award className="h-3.5 w-3.5 text-gold-400" />
              ) : (
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate">
                {user.email || "admin@imrt.in"}
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 rounded-full p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <Link
              to={adminDest}
              className="flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3.5 py-2 text-xs font-semibold text-gold-400 transition hover:bg-gold-500/20 shadow-sm"
            >
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
            <Link
              to={scorerDest}
              className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:brightness-110 shadow-md shadow-gold-500/20"
            >
              <Award className="h-3.5 w-3.5" /> Scorer
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-b border-white/10 bg-slate-950 px-4 pt-2 pb-6 md:hidden">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-gold-400"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              {user && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300">
                  <span className="truncate">{user.email || "admin@imrt.in"}</span>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Logout
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={adminDest}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 py-2.5 text-xs font-semibold text-gold-400"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin Portal
                </Link>
                <Link
                  to={scorerDest}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gold-500 py-2.5 text-xs font-semibold text-slate-950"
                >
                  <Award className="h-3.5 w-3.5" /> Scorer Console
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
