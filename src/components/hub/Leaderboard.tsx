import { Crown } from "lucide-react"
import TeamLogo from "@/components/TeamLogo"
import { useData } from "@/context/DataContext"

export default function Leaderboard() {
  const { scorers, getTeam } = useData()
  const ranked = [...scorers].sort((a, b) => b.points - a.points)
  const max = ranked[0]?.points ?? 1

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
        <Crown className="h-5 w-5 text-gold-500" />
        <h3 className="font-display text-lg font-bold text-white">Top Scorers — MVP Race</h3>
      </div>
      <ul className="divide-y divide-white/5">
        {ranked.map((s, i) => {
          const team = getTeam(s.teamId)
          return (
            <li key={s.playerName} className="flex items-center gap-4 px-6 py-3">
              <span
                className={`w-6 text-center font-display text-lg font-bold ${
                  i === 0 ? "text-gold-500" : i < 3 ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              {team && <TeamLogo team={team} size="sm" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-display text-sm font-semibold text-white">{s.playerName}</span>
                  <span className="font-display text-lg font-bold text-gold-500">{s.points}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-maroon-600 to-gold-500"
                      style={{ width: `${(s.points / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{(s.points / s.games).toFixed(1)} ppg</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
