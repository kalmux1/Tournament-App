import { MapPin, Clock } from "lucide-react"
import TeamLogo from "./TeamLogo"
import { useData } from "@/context/DataContext"
import type { Match } from "@/lib/types"

const STATUS_STYLE: Record<Match["status"], string> = {
  live: "animate-pulse-glow bg-red-600 text-white",
  finished: "bg-white/10 text-slate-400",
  upcoming: "bg-gold-500/20 text-gold-500",
}

export default function MatchCard({ match }: { match: Match }) {
  const { getTeam } = useData()
  const a = getTeam(match.teamAId)
  const b = getTeam(match.teamBId)
  if (!a || !b) return null

  const aWon = match.status === "finished" && match.winnerId === a.id
  const bWon = match.status === "finished" && match.winnerId === b.id

  return (
    <div className="glass overflow-hidden rounded-xl transition hover:border-gold-500/40">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="h-3.5 w-3.5" /> {match.court}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[match.status]}`}
        >
          {match.status === "live" ? "● Live" : match.status === "finished" ? "Final" : "Upcoming"}
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5" /> {match.time}
        </span>
      </div>

      <div className="space-y-3 px-4 py-4">
        <TeamRow name={a.name} logo={a} score={match.scoreA} won={aWon} dim={match.status !== "upcoming"} />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {match.stage === "pool" ? `Pool ${match.pool}` : match.stage}
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <TeamRow name={b.name} logo={b} score={match.scoreB} won={bWon} dim={match.status !== "upcoming"} />
      </div>
    </div>
  )
}

function TeamRow({
  name,
  logo,
  score,
  won,
  dim,
}: {
  name: string
  logo: { name: string; logo?: string; color: string }
  score: number
  won: boolean
  dim: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <TeamLogo team={logo} size="md" />
        <span className={`font-display text-sm font-semibold ${won ? "text-gold-500" : "text-white"}`}>{name}</span>
      </div>
      {dim ? (
        <span className={`font-display text-2xl font-bold tabular-nums ${won ? "text-gold-500" : "text-slate-300"}`}>
          {score}
        </span>
      ) : (
        <span className="font-display text-sm text-slate-500">—</span>
      )}
    </div>
  )
}
