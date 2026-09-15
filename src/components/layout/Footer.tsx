import { Link } from "react-router-dom"
import { useData } from "@/context/DataContext"

export default function Footer() {
  const { tournament } = useData()

  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-maroon-600 to-gold-500 font-display text-lg font-bold text-white">
              3x3
            </span>
            <span className="font-display text-xl font-bold text-white">{tournament.name}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            The official hub for the {tournament.name}. Played under FIBA 3x3 rules across electric days of half-court hoops at {tournament.venue}.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-gold-500">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li><Link to="/hub" className="hover:text-white">Tournament Hub</Link></li>
            <li><Link to="/register" className="hover:text-white">Register a Team</Link></li>
            <li><Link to="/rules" className="hover:text-white">3x3 Rules</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-gold-500">Event</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>{tournament.dates}</li>
            <li>{tournament.venue}</li>
            <li>{tournament.city}</li>
            <li>{tournament.contactEmail}</li>
          </ul>
        </div>
      </div>
      
      <div className="border-t border-white/10 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl justify-center">
          <div className="text-center text-xs text-slate-500">
            © 2026 {tournament.name} | Created by <a href="https://linktr.ee/kalmux" target="_blank" rel="noopener noreferrer" className="font-medium text-gold-500 hover:underline">KALMUX</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
