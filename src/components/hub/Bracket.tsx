import TeamLogo from "@/components/TeamLogo"
import { useData } from "@/context/DataContext"
import type { Match } from "@/lib/types"

function BracketMatch({ match }: { match: Match }) {
  const { getTeam } = useData()
  const a = getTeam(match.teamAId)
  const b = getTeam(match.teamBId)

  const Row = ({ team, score, winner }: { team?: ReturnType<typeof getTeam>; score: number; winner: boolean }) => (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 ${
        winner ? "bg-gold-500/15" : ""
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {team ? <TeamLogo team={team} size="sm" /> : <span className="h-8 w-8 rounded-full bg-white/10" />}
        <span className={`truncate font-display text-sm ${winner ? "font-bold text-gold-500" : "text-slate-200"}`}>
          {team?.name ?? "TBD"}
        </span>
      </div>
      <span className={`font-display text-sm font-bold tabular-nums ${winner ? "text-gold-500" : "text-slate-400"}`}>
        {match.status === "upcoming" ? "—" : score}
      </span>
    </div>
  )

  return (
    <div className="glass w-56 overflow-hidden rounded-xl">
      <div className="divide-y divide-white/10">
        <Row team={a} score={match.scoreA} winner={match.winnerId === match.teamAId} />
        <Row team={b} score={match.scoreB} winner={match.winnerId === match.teamBId} />
      </div>
      <div className="bg-black/30 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">
        {match.date.slice(5)} · {match.time} · {match.court}
      </div>
    </div>
  )
}

export default function Bracket() {
  const { matches } = useData()
  const qf = matches.filter((m) => m.stage === "quarterfinal")
  const sf = matches.filter((m) => m.stage === "semifinal")
  const third = matches.find((m) => m.stage === "third")
  const final = matches.find((m) => m.stage === "final")

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-8">
        <Round title="Quarterfinals">
          {qf.map((m) => (
            <BracketMatch key={m.id} match={m} />
          ))}
        </Round>
        <Round title="Semifinals">
          {sf.map((m) => (
            <BracketMatch key={m.id} match={m} />
          ))}
        </Round>
        <Round title="Final">{final && <BracketMatch match={final} />}</Round>
        {third && (
          <Round title="3rd Place">
            <BracketMatch match={third} />
          </Round>
        )}
      </div>
    </div>
  )
}

function Round({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center gap-5">
      <h4 className="text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">{title}</h4>
      <div className="flex flex-1 flex-col justify-around gap-5">{children}</div>
    </div>
  )
}
