import { X, ShieldCheck, Hash } from "lucide-react"
import TeamLogo from "./TeamLogo"
import type { Team } from "@/lib/types"

export default function TeamModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const gp = team.wins + team.losses
  const diff = team.pointsFor - team.pointsAgainst

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${team.name} details`}
      >
        <div className="relative p-6" style={{ background: `linear-gradient(135deg, ${team.color}, rgba(15,23,42,0.95))` }}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <TeamLogo team={team} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-3xl font-bold text-white">{team.name}</h2>
                {team.approved && <ShieldCheck className="h-5 w-5 text-gold-400" aria-label="Verified" />}
              </div>
              <p className="text-sm text-white/80">{team.category} · Pool {team.pool}</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-mono text-white/70">
                <Hash className="h-3 w-3" /> {team.code}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
          {[
            { label: "GP", value: gp },
            { label: "W-L", value: `${team.wins}-${team.losses}` },
            { label: "PTS+", value: team.pointsFor },
            { label: "DIFF", value: diff > 0 ? `+${diff}` : diff },
          ].map((s) => (
            <div key={s.label} className="py-4 text-center">
              <div className="font-display text-2xl font-bold text-gold-500">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">Roster</h3>
          <ul className="mt-3 space-y-2">
            {team.roster.map((p) => (
              <li key={p.jersey} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 font-display text-sm font-bold text-gold-500">
                    {p.jersey}
                  </span>
                  <div>
                    <span className="font-medium text-white">{p.name}</span>
                    {p.isSub && (
                      <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                        Reserve
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {p.role} · {p.height}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-white/5 px-4 py-3 text-sm">
            <span className="text-slate-400">Captain: </span>
            <span className="font-medium text-white">{team.captain.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
