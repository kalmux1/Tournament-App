import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Award, Lock, User, ArrowLeft, AlertCircle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function ScorerLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login, logout } = useAuth()

  const from = (location.state as any)?.from?.pathname

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || "Login failed.")
      setLoading(false)
      return
    }

    if (result.role !== "scorer" && result.role !== "admin") {
      await logout()
      setError("You do not have scorer access.")
      setLoading(false)
      return
    }

    navigate(from || "/scorer", { replace: true })
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <span className="rounded-full bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-500">
            Official Table
          </span>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500/20 to-maroon-600/20 border border-gold-500/30 text-gold-500 shadow-inner">
            <Award className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-white">Scorer Portal</h2>
          <p className="mt-1 text-sm text-slate-400">Sign in to control live 3x3 games & scoreboards</p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Email
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter scorer email"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 py-3.5 font-display font-semibold text-slate-950 shadow-lg shadow-gold-500/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Scoreboard"}
          </button>
        </form>
      </div>
    </div>
  )
}
