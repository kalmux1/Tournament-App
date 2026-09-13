import { useState } from "react"
import { NavLink, Link } from "react-router-dom"
import { Menu, X, ShieldCheck, Award } from "lucide-react"

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/hub", label: "Tournament Hub" },
  { to: "/register", label: "Register" },
  { to: "/rules", label: "Rules & Info" },
  { to: "/admin/login", label: "Admin" },
  { to: "/scorer/login", label: "Scorer" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-maroon-600 to-gold-500 font-display text-lg font-bold text-white shadow-lg">
            3x3
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-bold tracking-wide text-white">IMRT CHAMPIONSHIP</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-500">FIBA 3x3 · 2026</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 font-display text-sm font-medium uppercase tracking-wide transition ${
                  isActive ? "bg-white/10 text-gold-500" : "text-slate-300 hover:text-white"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <button
          className="rounded-lg p-2 text-slate-200 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 font-display text-sm font-medium uppercase tracking-wide ${
                    isActive ? "bg-white/10 text-gold-500" : "text-slate-300"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
