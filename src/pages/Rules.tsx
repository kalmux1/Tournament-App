import { useState } from "react"
import {
  Clock,
  Timer,
  Target,
  Zap,
  Repeat,
  Trophy,
  MapPin,
  Mail,
  Send,
} from "lucide-react"
import { TOURNAMENT } from "@/lib/mockData"

const RULES = [
  { icon: Clock, title: "10-Minute Game", text: "One period of 10 minutes running clock. First to 21 points wins before time expires." },
  { icon: Timer, title: "12-Second Shot Clock", text: "Teams must attempt a shot within 12 seconds of gaining possession." },
  { icon: Target, title: "1 & 2 Point Scoring", text: "Baskets inside the arc score 1 point. Shots from behind the arc score 2 points." },
  { icon: Trophy, title: "Target 21", text: "The first team to reach 21 points or more wins instantly in regulation." },
  { icon: Zap, title: "Sudden-Death OT", text: "If tied at the end, overtime is played — first team to score 2 points wins." },
  { icon: Repeat, title: "Check-Ball & Possession", text: "Ball is checked behind the arc after each dead ball. Change of possession on defensive rebounds must be cleared." },
]

export default function Rules() {
  const [sent, setSent] = useState(false)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">The Rulebook</span>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">Official FIBA 3x3 Rules</h1>
        <p className="mt-3 text-slate-400">
          Fast, physical and played to 21. Here is everything your squad needs to know before stepping on the court.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {RULES.map((r) => (
          <div key={r.title} className="glass group rounded-2xl p-6 transition hover:border-gold-500/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/15 text-gold-500 transition group-hover:bg-gold-500 group-hover:text-slate-950">
              <r.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-white">{r.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.text}</p>
          </div>
        ))}
      </div>

      {/* Venue + contact */}
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
            <MapPin className="h-5 w-5 text-gold-500" />
            <h3 className="font-display text-lg font-bold text-white">Venue & Directions</h3>
          </div>
          <iframe
            title="Venue map"
            className="h-64 w-full grayscale"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=80.8,26.7,81.1,26.95&layer=mapnik"
          />
          <div className="px-6 py-4">
            <p className="font-display text-base font-semibold text-white">{TOURNAMENT.venue}</p>
            <p className="text-sm text-slate-400">{TOURNAMENT.city}</p>
            <p className="mt-2 text-sm text-slate-400">{TOURNAMENT.dates} · Gates open 08:00</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-white">Contact the Organizers</h3>
            {sent ? (
              <p className="mt-4 rounded-lg bg-gold-500/15 px-4 py-6 text-center text-sm text-gold-400">
                Thanks! Your message has reached the tournament desk. We&apos;ll reply within 24 hours.
              </p>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
              >
                <input required placeholder="Your name" className="field" />
                <input required type="email" placeholder="Email address" className="field" />
                <textarea required placeholder="Your message" rows={3} className="field resize-none" />
                <button type="submit" className="btn-gold w-full">
                  <Send className="h-4 w-4" /> Send Message
                </button>
              </form>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-gold-500" /> kal.mux.cyber@gmail.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}