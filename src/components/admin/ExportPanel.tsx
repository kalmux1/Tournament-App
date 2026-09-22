import { useState } from "react"
import {
  Download,
  Users,
  ClipboardList,
  ListOrdered,
  Calendar,
  Crown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useData } from "@/context/DataContext"
import { toCSV, downloadCSV, fileStamp } from "@/utils/csv"

export default function ExportPanel() {
  const { teams, matches, playerStats } = useData()
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const flash = (msg: string) => {
    setLastExport(msg)
    setError(null)
    setTimeout(() => setLastExport(null), 3000)
  }

  const fail = (msg: string) => {
    setError(msg)
    setLastExport(null)
    setTimeout(() => setError(null), 4000)
  }

  const teamName = (id: string) => {
    if (id === "TBD") return "TBD"
    return teams.find((t) => t.id === id)?.name ?? "TBD"
  }

  // ---- Exporters ----

  const exportTeams = () => {
    if (teams.length === 0) return fail("No teams to export.")
    const headers = [
      "id", "code", "name", "category", "pool", "approved",
      "wins", "losses", "pointsFor", "pointsAgainst",
      "captainName", "captainEmail", "captainPhone", "captainStudentId",
      "rosterSize",
    ]
    const rows = teams.map((t) => [
      t.id, t.code, t.name, t.category, t.pool, t.approved,
      t.wins, t.losses, t.pointsFor, t.pointsAgainst,
      t.captain.name, t.captain.email, t.captain.phone, t.captain.studentId,
      t.roster.length,
    ])
    downloadCSV(`teams_${fileStamp()}.csv`, toCSV(headers, rows))
    flash(`Exported ${teams.length} teams.`)
  }

  const exportRosters = () => {
    const rows: unknown[][] = []
    for (const t of teams) {
      for (const p of t.roster) {
        rows.push([
          t.code, t.name, p.jersey, p.name, p.role, p.height, p.isSub ?? false,
        ])
      }
    }
    if (rows.length === 0) return fail("No players to export.")
    const headers = [
      "teamCode", "teamName", "jersey", "playerName",
      "role", "height", "isReserve",
    ]
    downloadCSV(`rosters_${fileStamp()}.csv`, toCSV(headers, rows))
    flash(`Exported ${rows.length} players across ${teams.length} teams.`)
  }

  const exportStandings = () => {
    const approved = teams.filter((t) => t.approved)
    if (approved.length === 0) return fail("No approved teams to export.")
    const pools = Array.from(new Set(approved.map((t) => t.pool))).sort()
    const rows: unknown[][] = []
    for (const pool of pools) {
      const poolTeams = approved
        .filter((t) => t.pool === pool)
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          return (
            b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
          )
        })
      poolTeams.forEach((t, i) => {
        const diff = t.pointsFor - t.pointsAgainst
        rows.push([
          pool, i + 1, t.code, t.name,
          t.wins + t.losses, t.wins, t.losses,
          t.pointsFor, t.pointsAgainst, diff > 0 ? `+${diff}` : diff,
        ])
      })
    }
    const headers = [
      "pool", "rank", "teamCode", "teamName",
      "GP", "W", "L", "PTS+", "PTS-", "DIFF",
    ]
    downloadCSV(`standings_${fileStamp()}.csv`, toCSV(headers, rows))
    flash(`Exported standings for ${pools.length} pools.`)
  }

  const exportMatches = () => {
    if (matches.length === 0) return fail("No matches to export.")
    const headers = [
      "id", "date", "time", "court", "category", "stage", "pool",
      "teamA", "scoreA", "scoreB", "teamB",
      "status", "winner", "round", "venue",
    ]
    const sorted = [...matches].sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      if (d !== 0) return d
      return a.time.localeCompare(b.time)
    })
    const rows = sorted.map((m) => [
      m.id, m.date, m.time, m.court, m.category, m.stage ?? "", m.pool ?? "",
      teamName(m.teamAId), m.scoreA, m.scoreB, teamName(m.teamBId),
      m.status, m.winnerId ? teamName(m.winnerId) : "", m.round ?? "",
      m.venue ?? "",
    ])
    downloadCSV(`matches_${fileStamp()}.csv`, toCSV(headers, rows))
    flash(`Exported ${matches.length} matches.`)
  }

  const exportPlayerStats = () => {
    if (playerStats.length === 0) return fail("No player stats to export.")
    const ranked = [...playerStats].sort((a, b) => b.points - a.points)
    const headers = [
      "rank", "playerName", "teamCode", "teamName",
      "points", "games", "ppg",
    ]
    const rows = ranked.map((s, i) => {
      const team = teams.find((t) => t.id === s.teamId)
      const ppg = s.games > 0 ? (s.points / s.games).toFixed(2) : "0.00"
      return [
        i + 1, s.playerName, team?.code ?? "—", team?.name ?? "—",
        s.points, s.games, ppg,
      ]
    })
    downloadCSV(`player_stats_${fileStamp()}.csv`, toCSV(headers, rows))
    flash(`Exported ${playerStats.length} player stats.`)
  }

  const exportAll = async () => {
    const steps: Array<() => void> = [
      exportTeams,
      exportRosters,
      exportStandings,
      exportMatches,
      exportPlayerStats,
    ]
    for (const step of steps) {
      step()
      await new Promise((r) => setTimeout(r, 350))
    }
    flash("Exported all datasets.")
  }

  const cards = [
    { label: "Teams", count: teams.length, onClick: exportTeams, icon: Users },
    {
      label: "Rosters (flat)",
      count: teams.reduce((n, t) => n + t.roster.length, 0),
      onClick: exportRosters,
      icon: ClipboardList,
    },
    {
      label: "Standings",
      count: teams.filter((t) => t.approved).length,
      onClick: exportStandings,
      icon: ListOrdered,
    },
    { label: "Matches", count: matches.length, onClick: exportMatches, icon: Calendar },
    {
      label: "Player Stats",
      count: playerStats.length,
      onClick: exportPlayerStats,
      icon: Crown,
    },
  ]

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <Download className="h-6 w-6 text-gold-500" /> Data Export
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Download tournament data as CSV files. Opens cleanly in Excel, Google
          Sheets, or Numbers. UTF-8 encoded.
        </p>
      </div>

      {lastExport && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {lastExport}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon
          const disabled = c.count === 0
          return (
            <button
              key={c.label}
              onClick={c.onClick}
              disabled={disabled}
              className="glass rounded-3xl p-6 border border-white/10 text-left transition hover:border-gold-500/40 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400 border border-gold-500/20 transition group-hover:bg-gold-500 group-hover:text-slate-950">
                  <Icon className="h-5 w-5" />
                </span>
                <Download className="h-4 w-4 text-slate-500 group-hover:text-gold-400 transition" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                {c.label}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {c.count} {c.count === 1 ? "row" : "rows"} ·{" "}
                {c.label.toLowerCase()}.csv
              </p>
            </button>
          )
        })}
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
        <h3 className="font-display text-lg font-bold text-white">
          Export Everything
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Downloads all five CSVs in sequence. If your browser blocks multiple
          downloads, allow them for this site.
        </p>
        <button
          onClick={exportAll}
          disabled={teams.length === 0 && matches.length === 0}
          className="btn-gold mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" /> Download All
        </button>
      </div>
    </div>
  )
}