import { useState } from "react"
import { CalendarDays, ListOrdered, GitFork, Crown, Users } from "lucide-react"
import Standings from "@/components/hub/Standings"
import Bracket from "@/components/hub/Bracket"
import Schedule from "@/components/hub/Schedule"
import Leaderboard from "@/components/hub/Leaderboard"
import TeamLogo from "@/components/TeamLogo"
import TeamModal from "@/components/TeamModal"
import { useData } from "@/context/DataContext"
import type { Team } from "@/lib/types"

const TABS = [
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "standings", label: "Standings", icon: ListOrdered },
  { key: "bracket", label: "Bracket", icon: GitFork },
  { key: "scorers", label: "Top Scorers", icon: Crown },
  { key: "teams", label: "Teams", icon: Users },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function Hub() {
  const [tab, setTab] = useState<TabKey>("schedule")
  const [selected, setSelected] = useState<Team | null>(null)
  const { approvedTeams } = useData()

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          Live Tournament
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
          Tournament Hub
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Schedule, pool standings, the knockout bracket, MVP race and every registered squad — all in one place.
        </p>
      </header>

      <div className="sticky top-[57px] z-30 -mx-4 mt-8 overflow-x-auto border-b border-white/10 bg-slate-950/85 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-display text-sm font-semibold uppercase tracking-wide transition ${
                tab === t.key
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === "schedule" && <Schedule />}
        {tab === "standings" && <Standings onSelect={setSelected} />}
        {tab === "bracket" && <Bracket />}
        {tab === "scorers" && (
          <div className="max-w-2xl">
            <Leaderboard />
          </div>
        )}
        {tab === "teams" &&
          (approvedTeams.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <h3 className="font-display text-xl font-bold text-white">No teams yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Registered teams will appear here once they sign up and are approved.
              </p>
              <a href="/register" className="btn-gold mt-6 inline-flex">
                Register Your Team
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvedTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="glass flex items-center gap-4 rounded-xl p-4 text-left transition hover:border-gold-500/40"
                >
                  <TeamLogo team={t} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-bold text-white">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.category} · Pool {t.pool}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gold-500">
                      {t.wins}W · {t.losses}L
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
      </div>

      {selected && <TeamModal team={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}