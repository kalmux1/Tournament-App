import { useMemo } from "react"
import { CalendarDays, GitFork, Trophy, ChevronRight } from "lucide-react"
import TeamLogo from "@/components/TeamLogo"
import { useData } from "@/context/DataContext"
import type { Match } from "@/lib/types"

// ============================================================
// Small sub-components
// ============================================================

function TeamPill({
  teamId,
  score,
  showScore,
  winner,
}: {
  teamId: string
  score: number
  showScore: boolean
  winner: boolean
}) {
  const { getTeam } = useData()

  if (teamId === "TBD") {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
        <span className="truncate font-display text-sm text-slate-500 italic">
          TBD
        </span>
      </div>
    )
  }

  const team = getTeam(teamId)
  if (!team) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
        <span className="truncate font-display text-sm text-slate-500">
          Unknown
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <TeamLogo team={team} size="sm" />
      <span
        className={`truncate font-display text-sm ${
          winner ? "font-bold text-gold-500" : "text-white"
        }`}
      >
        {team.name}
      </span>
      {showScore && (
        <span
          className={`ml-auto shrink-0 font-mono text-base font-bold ${
            winner ? "text-gold-500" : "text-slate-300"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  )
}

// ============================================================
// League match row — compact fixture display
// ============================================================

function LeagueMatchRow({ match }: { match: Match }) {
  const isFinished = match.status === "finished"
  const isLive = match.status === "live"

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 px-3 py-2 transition">
      <div className="flex-1 min-w-0">
        <TeamPill
          teamId={match.teamAId}
          score={match.scoreA}
          showScore={isFinished || isLive}
          winner={match.winnerId === match.teamAId}
        />
      </div>
      <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
        vs
      </span>
      <div className="flex-1 min-w-0">
        <TeamPill
          teamId={match.teamBId}
          score={match.scoreB}
          showScore={isFinished || isLive}
          winner={match.winnerId === match.teamBId}
        />
      </div>
      <span className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
        {match.date.slice(5)} · {match.time}
      </span>
      {isLive && (
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 animate-pulse shrink-0">
          Live
        </span>
      )}
      {isFinished && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
          Final
        </span>
      )}
    </div>
  )
}

// ============================================================
// Knockout bracket card
// ============================================================

function BracketMatch({ match }: { match: Match }) {
  const Row = ({
    teamId,
    score,
    winner,
  }: {
    teamId: string
    score: number
    winner: boolean
  }) => (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 ${
        winner ? "bg-gold-500/15" : ""
      }`}
    >
      <TeamPill teamId={teamId} score={score} showScore={false} winner={winner} />
      <span
        className={`shrink-0 font-display text-sm font-bold tabular-nums ${
          winner ? "text-gold-500" : "text-slate-400"
        }`}
      >
        {match.status === "upcoming" ? "—" : score}
      </span>
    </div>
  )

  return (
    <div className="glass w-60 overflow-hidden rounded-xl shrink-0">
      <div className="divide-y divide-white/10">
        <Row
          teamId={match.teamAId}
          score={match.scoreA}
          winner={match.winnerId === match.teamAId}
        />
        <Row
          teamId={match.teamBId}
          score={match.scoreB}
          winner={match.winnerId === match.teamBId}
        />
      </div>
      <div className="bg-black/30 px-3 py-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
        <span>{match.round ?? match.stage}</span>
        <span>
          {match.date.slice(5)} · {match.time}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// Main component
// ============================================================

export default function Bracket() {
  const { matches, approvedTeams } = useData()

  // --- Categorise matches -------------------------------------------
  const leagueMatches = matches.filter((m) => m.stage === "pool")
  const qf = matches.filter((m) => m.stage === "quarterfinal")
  const sf = matches.filter((m) => m.stage === "semifinal")
  const third = matches.filter((m) => m.stage === "third")
  const final = matches.filter((m) => m.stage === "final")

  // Group league matches by round label
  const leagueByRound = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of leagueMatches) {
      const key = m.round || "League Round"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    // Sort matches within each round by date then time
    for (const list of map.values()) {
      list.sort((a, b) => {
        const d = a.date.localeCompare(b.date)
        return d !== 0 ? d : a.time.localeCompare(b.time)
      })
    }
    // Sort rounds numerically (Round 1, Round 2, ...)
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    )
  }, [leagueMatches])

  const hasLeague = leagueMatches.length > 0
  const hasKnockout = qf.length + sf.length + third.length + final.length > 0

  const leagueTotal = leagueMatches.length
  const leagueFinished = leagueMatches.filter((m) => m.status === "finished").length

  // --- Empty state ---------------------------------------------------
  if (!hasLeague && !hasKnockout) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <GitFork className="mx-auto mb-3 h-10 w-10 text-gold-500" />
        <h3 className="font-display text-xl font-bold text-white">
          Tournament hasn't started yet
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          The full bracket — league matches, semifinals, and finals — will appear
          here once the organizer schedules fixtures.
        </p>
      </div>
    )
  }

  // --- Render --------------------------------------------------------
  return (
    <div className="space-y-10">
      {/* Tournament Progress strip */}
      <div className="glass rounded-2xl border border-white/10 p-5">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-display font-bold uppercase tracking-wider text-slate-400">
            Tournament Progress
          </span>

          {hasLeague && (
            <ProgressStep
              label={`League · ${leagueFinished}/${leagueTotal}`}
              done={leagueFinished === leagueTotal}
              active={leagueFinished < leagueTotal}
            />
          )}

          {hasKnockout && (
            <ProgressStep
              label="Knockout"
              done={
                final.length > 0 && final[0].status === "finished"
              }
              active={final.length === 0 || final[0].status !== "finished"}
            />
          )}

          {!hasKnockout && (
            <span className="flex items-center gap-2 text-slate-500">
              <ChevronRight className="h-3.5 w-3.5" />
              Awaiting knockout seeding
            </span>
          )}
        </div>
      </div>

      {/* ============================================================
          LEAGUE STAGE
      ============================================================ */}
      {hasLeague && (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-gold-500" /> League Stage
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Every team plays every other team once. Top teams advance to
                semifinals.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              <span className="text-white font-bold">{leagueTotal}</span>{" "}
              matches ·{" "}
              <span className="text-emerald-400 font-bold">
                {leagueFinished}
              </span>{" "}
              completed
            </div>
          </div>

          <div className="space-y-5">
            {leagueByRound.map(([round, roundMatches]) => (
              <div key={round} className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between bg-white/[0.03] border-b border-white/10 px-4 py-2.5">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-gold-400">
                    {round.replace("League · ", "")}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {roundMatches.filter((m) => m.status === "finished").length}
                    /{roundMatches.length} played
                  </span>
                </div>
                <div className="p-2 space-y-1.5">
                  {roundMatches.map((m) => (
                    <LeagueMatchRow key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          KNOCKOUT STAGE
      ============================================================ */}
      <section>
        <div className="mb-5">
          <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-gold-500" /> Knockout Stage
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Single elimination. Win or go home.
          </p>
        </div>

        {hasKnockout ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex min-w-max items-stretch gap-8">
              {qf.length > 0 && (
                <Round title="Quarterfinals">
                  {qf.map((m) => (
                    <BracketMatch key={m.id} match={m} />
                  ))}
                </Round>
              )}

              {sf.length > 0 && (
                <Round title="Semifinals">
                  {sf.map((m) => (
                    <BracketMatch key={m.id} match={m} />
                  ))}
                </Round>
              )}

              {(final.length > 0 || third.length > 0) && (
                <Round title="Finals">
                  {final.map((m) => (
                    <BracketMatch key={m.id} match={m} />
                  ))}
                  {third.map((m) => (
                    <div key={m.id} className="pt-2 border-t border-dashed border-white/10">
                      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        3rd Place
                      </div>
                      <BracketMatch match={m} />
                    </div>
                  ))}
                </Round>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 px-6 py-10 text-center">
            <GitFork className="mx-auto mb-3 h-8 w-8 text-gold-500/70" />
            <h4 className="font-display text-lg font-bold text-white">
              Knockout stage not yet seeded
            </h4>
            <p className="mt-2 max-w-lg mx-auto text-sm text-slate-400">
              {hasLeague
                ? `Once the ${leagueTotal}-match league stage concludes, the organizer will seed the semifinals from the final standings. Semifinals, 3rd place playoff, and the final will appear here automatically.`
                : "The bracket appears once the organizer schedules semifinal, final, or other knockout fixtures."}
            </p>
            {hasLeague && leagueFinished < leagueTotal && (
              <p className="mt-3 text-xs text-gold-400/80 font-mono">
                {leagueTotal - leagueFinished} league{" "}
                {leagueTotal - leagueFinished === 1 ? "match" : "matches"}{" "}
                remaining
              </p>
            )}
            {hasLeague && leagueFinished === leagueTotal && (
              <p className="mt-3 text-xs text-emerald-400/80 font-mono">
                ✓ League complete — awaiting knockout seeding by the organizer
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ============================================================
// Layout helpers
// ============================================================

function Round({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col justify-center gap-5">
      <h4 className="text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
        {title}
      </h4>
      <div className="flex flex-1 flex-col justify-around gap-5">
        {children}
      </div>
    </div>
  )
}

function ProgressStep({
  label,
  done,
  active,
}: {
  label: string
  done: boolean
  active: boolean
}) {
  return (
    <span
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : active
            ? "border-gold-500/40 bg-gold-500/10 text-gold-400"
            : "border-white/10 bg-white/5 text-slate-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          done ? "bg-emerald-400" : active ? "bg-gold-400 animate-pulse" : "bg-slate-500"
        }`}
      />
      {label}
    </span>
  )
}