import { useMemo, useState } from "react"
import {
  GitFork,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Trophy,
  ArrowUpRight,
  Pencil,
  CalendarDays,
} from "lucide-react"
import { useData } from "@/context/DataContext"
import type { Category, Match, Team } from "@/lib/types"
import {
  advanceTopFour,
  generateKnockout,
  generateLeague,
  rankTeamsForDisplay,
  roundRobinMatchCount,
  type GenerationOptions,
  type TournamentFormat,
} from "@/utils/bracket"
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal"

const CATEGORIES: Category[] = [
  "Men's Open",
  "Women's Open",
  "Under-19 Boys",
  "Under-19 Girls",
  "Inter-Department",
]

// Prefill dates for a standard 4-day league + 1 knockout day.
const DEFAULT_LEAGUE_DATES = "2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01"
const DEFAULT_KNOCKOUT_DATE = "2026-10-03"

/** Parse comma-or-newline separated YYYY-MM-DD strings. */
function parseDates(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
}

export default function BracketPanel() {
  const { teams, matches, replaceGeneratedMatches, updateMatch } = useData()

  // Config
  const [category, setCategory] = useState<Category>("Men's Open")
  const [format, setFormat] = useState<TournamentFormat>("league")
  const [knockoutSize, setKnockoutSize] = useState<4 | 8>(4)

  // League-specific config
  const [leagueDatesInput, setLeagueDatesInput] = useState(DEFAULT_LEAGUE_DATES)
  const [matchesPerDay, setMatchesPerDay] = useState(7)

  // Common schedule config
  const [knockoutDate, setKnockoutDate] = useState(DEFAULT_KNOCKOUT_DATE)
  const [startTime, setStartTime] = useState("09:00 AM")
  const [matchDurationMin, setMatchDurationMin] = useState(15)
  const [matchGapMin, setMatchGapMin] = useState(5)
  const [courtsInput, setCourtsInput] = useState("Main Court, Court 2")

  // UI state
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)
  const [confirm, setConfirm] = useState<
    null | "generate" | "advance" | "clear-league" | "clear-ko"
  >(null)

  const courts = useMemo(
    () =>
      courtsInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [courtsInput]
  )

  const leagueDates = useMemo(
    () => parseDates(leagueDatesInput),
    [leagueDatesInput]
  )

  const approvedInCategory = useMemo(
    () => teams.filter((t) => t.category === category && t.approved),
    [teams, category]
  )

  const eligible = approvedInCategory.length >= 3

  const currentLeague = useMemo(
    () => matches.filter((m) => m.category === category && m.source === "auto-league"),
    [matches, category]
  )
  const currentKnockout = useMemo(
    () =>
      matches
        .filter((m) => m.category === category && m.source === "auto-knockout")
        .sort((a, b) => {
          const order: Record<string, number> = {
            quarterfinal: 0,
            semifinal: 1,
            third: 2,
            final: 3,
          }
          return (order[a.stage || ""] ?? 0) - (order[b.stage || ""] ?? 0)
        }),
    [matches, category]
  )

  const options: GenerationOptions = {
    format,
    venue: "IMRT Basketball Court Near Divine Bliss",
    startDate: knockoutDate,
    startTime,
    matchDurationMin,
    matchGapMin,
    courts,
    knockoutSize,
    leagueDates,
    matchesPerDay,
  }

  const flash = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 5000)
  }

  const handleGenerate = async () => {
    setBusy(true)
    setConfirm(null)
    try {
      if (format === "league") {
        if (leagueDates.length === 0) {
          flash("err", "Add at least one league date (YYYY-MM-DD).")
          return
        }
        const result = generateLeague(teams, category, options)
        if (result.error) {
          flash("err", result.error)
          return
        }
        const counts = await replaceGeneratedMatches(
          category,
          "auto-league",
          result.matches
        )
        flash(
          "ok",
          `League: ${counts.created} matches created, ${counts.deleted} replaced.`
        )
      } else {
        const result = generateKnockout(teams, category, options)
        if (result.error) {
          flash("err", result.error)
          return
        }
        const counts = await replaceGeneratedMatches(
          category,
          "auto-knockout",
          result.matches
        )
        flash(
          "ok",
          `Knockout: ${counts.created} matches created, ${counts.deleted} replaced.`
        )
      }
    } catch (err: any) {
      console.error("[BracketPanel] generation failed:", err)
      flash("err", err?.message || "Generation failed.")
    } finally {
      setBusy(false)
    }
  }

  const handleAdvance = async () => {
    setBusy(true)
    setConfirm(null)
    try {
      const result = advanceTopFour(teams, category, {
        venue: options.venue,
        startDate: knockoutDate,
        startTime,
        court: courts[0] ?? "Main Court",
        matchDurationMin,
        matchGapMin,
      })
      if (result.error) {
        flash("err", result.error)
        return
      }
      const counts = await replaceGeneratedMatches(
        category,
        "auto-knockout",
        result.matches
      )
      flash(
        "ok",
        `Knockout created from standings: ${counts.created} matches. ${result.summary[result.summary.length - 1]}`
      )
    } catch (err: any) {
      flash("err", err?.message || "Advance failed.")
    } finally {
      setBusy(false)
    }
  }

  const handleClear = async (source: "auto-league" | "auto-knockout") => {
    setBusy(true)
    setConfirm(null)
    try {
      const counts = await replaceGeneratedMatches(category, source, [])
      flash(
        "ok",
        `Cleared ${counts.deleted} ${
          source === "auto-league" ? "league" : "knockout"
        } matches for ${category}.`
      )
    } catch (err: any) {
      flash("err", err?.message || "Clear failed.")
    } finally {
      setBusy(false)
    }
  }

  const teamName = (id: string) => {
    if (id === "TBD") return "TBD"
    return teams.find((t) => t.id === id)?.name ?? "TBD"
  }

  const leagueCount = eligible ? roundRobinMatchCount(approvedInCategory.length) : 0
  const teamCount = approvedInCategory.length

  // Preview: what does the distribution look like?
  const distribution = useMemo(() => {
    if (format !== "league" || leagueDates.length === 0 || leagueCount === 0) return []
    const cap = matchesPerDay > 0 ? matchesPerDay : Infinity
    const result: { date: string; count: number }[] = []
    let remaining = leagueCount
    for (let i = 0; i < leagueDates.length; i++) {
      if (i === leagueDates.length - 1) {
        result.push({ date: leagueDates[i], count: remaining })
      } else {
        const even = Math.ceil(remaining / (leagueDates.length - i))
        const today = Math.min(even, cap)
        result.push({ date: leagueDates[i], count: today })
        remaining -= today
      }
    }
    return result
  }, [format, leagueDates, leagueCount, matchesPerDay])

  const standingsPreview = useMemo(() => {
    if (approvedInCategory.length === 0) return []
    return rankTeamsForDisplay(approvedInCategory).slice(0, 8)
  }, [approvedInCategory])

  const overfullDay = distribution.find(
    (d) => matchesPerDay > 0 && d.count > matchesPerDay
  )

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <GitFork className="h-6 w-6 text-gold-500" /> Tournament Format & Bracket
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Configure a league stage, a knockout bracket, or both. Auto-generated
          matches are safe to regenerate.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <span className="whitespace-pre-line">{toast.msg}</span>
        </div>
      )}

      {/* Format selector */}
      <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500 mb-3">
            Tournament Nature
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormatCard
              selected={format === "league"}
              onClick={() => setFormat("league")}
              icon={Users}
              title="League (Round Robin)"
              description="Every team plays every other team once across multiple days. Advance to semifinals afterwards."
            />
            <FormatCard
              selected={format === "knockout"}
              onClick={() => setFormat("knockout")}
              icon={Trophy}
              title="Knockout (Single Elimination)"
              description="Direct bracket from the start. One loss and you're out."
            />
          </div>
        </div>

        {/* Category picker */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => {
                const n = teams.filter((t) => t.category === c && t.approved).length
                const ok = n >= 3
                return (
                  <option key={c} value={c} disabled={!ok}>
                    {c} · {n} approved{!ok ? " (need 3+)" : ""}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              First tip-off (per day)
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="09:00 AM"
              className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Courts (comma separated)
            </label>
            <input
              type="text"
              value={courtsInput}
              onChange={(e) => setCourtsInput(e.target.value)}
              placeholder="Main Court, Court 2"
              className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Match length (min)
            </label>
            <input
              type="number"
              min={5}
              value={matchDurationMin}
              onChange={(e) => setMatchDurationMin(Number(e.target.value) || 10)}
              className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Gap between matches (min)
            </label>
            <input
              type="number"
              min={0}
              value={matchGapMin}
              onChange={(e) => setMatchGapMin(Number(e.target.value) || 0)}
              className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
            />
          </div>

          {format === "knockout" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Bracket size
              </label>
              <select
                value={knockoutSize}
                onChange={(e) => setKnockoutSize(Number(e.target.value) as 4 | 8)}
                className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
              >
                <option value={4}>4 teams · SF → Final</option>
                <option value={8}>8 teams · QF → SF → Final</option>
              </select>
            </div>
          )}
        </div>

        {/* League-specific */}
        {format === "league" && (
          <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold-400">
              <CalendarDays className="h-4 w-4" /> League schedule
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                League match dates (comma or newline separated)
              </label>
              <textarea
                value={leagueDatesInput}
                onChange={(e) => setLeagueDatesInput(e.target.value)}
                rows={2}
                className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white font-mono focus:border-gold-500 focus:outline-none resize-none"
                placeholder="2026-09-28, 2026-09-29, 2026-09-30, 2026-10-01"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Format: YYYY-MM-DD. Detected {leagueDates.length} date
                {leagueDates.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Max matches per day (soft cap)
              </label>
              <input
                type="number"
                min={1}
                value={matchesPerDay}
                onChange={(e) => setMatchesPerDay(Number(e.target.value) || 0)}
                className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                The generator fills each day up to this cap and rolls over to
                the next date. Last day may exceed the cap if dates run out.
              </p>
            </div>

            {/* Distribution preview */}
            {distribution.length > 0 && eligible && (
              <div className="rounded-xl bg-slate-950/60 border border-white/10 p-4">
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Distribution preview ({leagueCount} matches over{" "}
                  {leagueDates.length} day
                  {leagueDates.length === 1 ? "" : "s"})
                </div>
                <div className="space-y-1.5">
                  {distribution.map((d) => (
                    <div
                      key={d.date}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-slate-300">{d.date}</span>
                      <span
                        className={
                          matchesPerDay > 0 && d.count > matchesPerDay
                            ? "text-amber-400 font-bold"
                            : "text-gold-400 font-bold"
                        }
                      >
                        {d.count} match{d.count === 1 ? "" : "es"}
                      </span>
                    </div>
                  ))}
                </div>
                {overfullDay && (
                  <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-300">
                    ⚠ {overfullDay.date} has {overfullDay.count} matches, over
                    the cap of {matchesPerDay}. Add another date or raise the
                    cap.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Knockout date (for knockout format OR for the Advance step) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="text-sm font-semibold text-slate-200">
            {format === "knockout" ? "Knockout date" : "Knockout date (used when you advance)"}
          </div>
          <input
            type="date"
            value={knockoutDate}
            onChange={(e) => setKnockoutDate(e.target.value)}
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-500">
            Semifinals and final will be scheduled sequentially from{" "}
            <span className="text-gold-400 font-semibold">{startTime}</span> on
            this date.
          </p>
        </div>

        {/* Summary strip */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span>
            Approved in{" "}
            <span className="text-gold-400 font-semibold">{category}</span>:{" "}
            <span className="text-white font-bold">{teamCount}</span>
          </span>
          {format === "league" && eligible && (
            <>
              <span>
                Total league matches:{" "}
                <span className="text-white font-bold">{leagueCount}</span>
              </span>
              <span>
                Matches per team:{" "}
                <span className="text-white font-bold">{teamCount - 1}</span>
              </span>
            </>
          )}
          {!eligible && (
            <span className="text-amber-400">
              Need at least 3 approved teams in this category.
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setConfirm("generate")}
            disabled={busy || !eligible}
            className="btn-gold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
            {busy
              ? "Working…"
              : format === "league"
                ? "Generate League"
                : "Generate Knockout"}
          </button>

          {format === "league" && (
            <button
              onClick={() => setConfirm("advance")}
              disabled={busy || !eligible}
              className="flex items-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-5 py-3 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 transition disabled:opacity-40"
            >
              <ArrowUpRight className="h-4 w-4" /> Advance Top 4 → Semifinals
            </button>
          )}

          {currentLeague.length > 0 && (
            <button
              onClick={() => setConfirm("clear-league")}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Clear League
            </button>
          )}

          {currentKnockout.length > 0 && (
            <button
              onClick={() => setConfirm("clear-ko")}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Clear Knockout
            </button>
          )}
        </div>
      </div>

      {/* Standings preview */}
      {format === "league" && standingsPreview.length > 0 && (
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
          <h3 className="font-display text-lg font-bold text-white mb-4">
            Current Standings — {category}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Team</th>
                  <th className="px-3 py-2 text-center font-semibold">W</th>
                  <th className="px-3 py-2 text-center font-semibold">L</th>
                  <th className="px-3 py-2 text-center font-semibold">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standingsPreview.map((t, i) => {
                  const diff = t.pointsFor - t.pointsAgainst
                  return (
                    <tr key={t.id} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2">
                        <span className={i < 4 ? "text-gold-500 font-bold" : "text-slate-500"}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-center text-white">{t.wins}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{t.losses}</td>
                      <td
                        className={`px-3 py-2 text-center font-semibold ${
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
          <p className="mt-3 text-[11px] text-slate-500">
            Top 4 (gold) advance when you click{" "}
            <span className="text-gold-400">Advance Top 4 → Semifinals</span>.
          </p>
        </div>
      )}

      {/* Current knockout bracket */}
      {currentKnockout.length > 0 && (
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
          <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Pencil className="h-5 w-5 text-gold-500" /> Knockout Bracket — {category}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Fill in TBD slots by picking a team. Changes save immediately.
          </p>
          <div className="space-y-2">
            {currentKnockout.map((m) => (
              <KnockoutRow
                key={m.id}
                match={m}
                teams={approvedInCategory}
                teamName={teamName}
                onAssign={(patch) => updateMatch(m.id, patch)}
              />
            ))}
          </div>
        </div>
      )}

      {/* League preview (first 12) */}
      {currentLeague.length > 0 && (
        <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
          <h3 className="font-display text-lg font-bold text-white mb-4">
            League Schedule — {category} ({currentLeague.length} matches)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentLeague.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                  {m.round?.replace("League · ", "") ?? "R1"}
                </span>
                <span className="text-white font-medium truncate">
                  {teamName(m.teamAId)} vs {teamName(m.teamBId)}
                </span>
                <span className="text-xs text-slate-400 ml-auto shrink-0">
                  {m.date.slice(5)} · {m.time}
                </span>
              </div>
            ))}
            {currentLeague.length > 12 && (
              <div className="text-xs text-slate-500 sm:col-span-2 text-center py-2">
                …and {currentLeague.length - 12} more on the Matches tab.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmations */}
      {confirm === "generate" && (
        <DeleteConfirmModal
          isOpen={true}
          title={
            format === "league"
              ? `Generate league schedule for ${category}?`
              : `Generate ${knockoutSize}-team knockout for ${category}?`
          }
          message={
            format === "league"
              ? `Creates ${leagueCount} round-robin matches spread across ${leagueDates.length} day${leagueDates.length === 1 ? "" : "s"}. Existing auto-league matches for ${category} are replaced. Manual and knockout matches are preserved.`
              : `Creates ${knockoutSize === 4 ? 4 : 8} knockout matches on ${knockoutDate}. Existing auto-knockout matches for ${category} are replaced.`
          }
          onConfirm={handleGenerate}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm === "advance" && (
        <DeleteConfirmModal
          isOpen={true}
          title="Advance Top 4 → Semifinals?"
          message={`Reads current standings for ${category} and creates SF1, SF2, 3rd Place, and Final on ${knockoutDate}. Existing auto-knockout matches are replaced.`}
          onConfirm={handleAdvance}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm === "clear-league" && (
        <DeleteConfirmModal
          isOpen={true}
          title={`Clear league matches for ${category}?`}
          message={`Removes all ${currentLeague.length} auto-generated league matches. Manual matches are preserved.`}
          onConfirm={() => handleClear("auto-league")}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm === "clear-ko" && (
        <DeleteConfirmModal
          isOpen={true}
          title={`Clear knockout matches for ${category}?`}
          message={`Removes all ${currentKnockout.length} auto-generated knockout matches. Manual and league matches are preserved.`}
          onConfirm={() => handleClear("auto-knockout")}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function FormatCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: any
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-gold-500 bg-gold-500/10 ring-1 ring-gold-500/30"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            selected
              ? "bg-gold-500 text-slate-950"
              : "bg-white/5 text-gold-400 border border-white/10"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="font-display text-base font-bold text-white">
            {title}
          </div>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
      </div>
    </button>
  )
}

function KnockoutRow({
  match,
  teams,
  teamName,
  onAssign,
}: {
  match: Match
  teams: Team[]
  teamName: (id: string) => string
  onAssign: (patch: Partial<Match>) => void
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="rounded-lg bg-gold-500/15 border border-gold-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400">
          {match.round ?? match.stage}
        </span>
        <span className="text-xs text-slate-400 ml-auto">
          {match.date} · {match.time} · {match.court}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TeamSlot
          label="Team A"
          currentId={match.teamAId}
          currentName={teamName(match.teamAId)}
          teams={teams}
          onSelect={(id) => onAssign({ teamAId: id })}
        />
        <TeamSlot
          label="Team B"
          currentId={match.teamBId}
          currentName={teamName(match.teamBId)}
          teams={teams}
          onSelect={(id) => onAssign({ teamBId: id })}
        />
      </div>
    </div>
  )
}

function TeamSlot({
  label,
  currentId,
  currentName,
  teams,
  onSelect,
}: {
  label: string
  currentId: string
  currentName: string
  teams: Team[]
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      <select
        value={currentId === "TBD" ? "" : currentId}
        onChange={(e) => onSelect(e.target.value || "TBD")}
        className="w-full rounded-xl bg-slate-950 border border-white/15 px-3 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none"
      >
        <option value="">— TBD ({currentName}) —</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} (Pool {t.pool})
          </option>
        ))}
      </select>
    </div>
  )
}