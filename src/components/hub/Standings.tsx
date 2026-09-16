import TeamLogo from "@/components/TeamLogo"
import { useData } from "@/context/DataContext"
import type { Team } from "@/lib/types"

function sortTeams(a: Team, b: Team) {
  if (b.wins !== a.wins) return b.wins - a.wins
  return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
}

export default function Standings({ onSelect }: { onSelect: (t: Team) => void }) {
  const { teams } = useData()

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <h3 className="font-display text-xl font-bold text-white">No teams registered yet</h3>
        <p className="mt-2 text-sm text-slate-400">
          Standings will appear here once teams register and are approved.
        </p>
      </div>
    )
  }

  const pools = Array.from(new Set(teams.map((t) => t.pool))).sort()

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {pools.map((pool) => {
        const poolTeams = teams.filter((t) => t.pool === pool).sort(sortTeams)
        return (
          <div key={pool} className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 bg-maroon-800/40 px-5 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gold-500 font-display text-sm font-bold text-slate-950">
                {pool}
              </span>
              <h3 className="font-display text-lg font-bold text-white">Pool {pool}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2 text-left font-semibold">Team</th>
                    <th className="px-2 py-2 text-center font-semibold">GP</th>
                    <th className="px-2 py-2 text-center font-semibold">W</th>
                    <th className="px-2 py-2 text-center font-semibold">L</th>
                    <th className="px-2 py-2 text-center font-semibold">PTS+</th>
                    <th className="px-2 py-2 text-center font-semibold">PTS-</th>
                    <th className="px-3 py-2 text-center font-semibold">DIFF</th>
                  </tr>
                </thead>
                <tbody>
                  {poolTeams.map((t, i) => {
                    const diff = t.pointsFor - t.pointsAgainst
                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelect(t)}
                        className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/5"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-4 font-display text-xs ${
                                i < 2 ? "text-gold-500" : "text-slate-500"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <TeamLogo team={t} size="sm" />
                            <span className="font-medium text-white">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-300">
                          {t.wins + t.losses}
                        </td>
                        <td className="px-2 py-2.5 text-center font-semibold text-white">
                          {t.wins}
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-400">{t.losses}</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">{t.pointsFor}</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">
                          {t.pointsAgainst}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-center font-semibold ${
                            diff >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
              Top 2 teams (gold) advance to the knockout bracket.
            </p>
          </div>
        )
      })}
    </div>
  )
}