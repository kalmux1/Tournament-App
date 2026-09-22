import { useState, useMemo } from "react"
import { X, Check, Trash2, AlertTriangle } from "lucide-react"
import { useData } from "@/context/DataContext"
import type { Category, Match, MatchStatus } from "@/lib/types"

const CATEGORIES: Category[] = [
  "Men's Open",
  "Women's Open",
  "Under-19 Boys",
  "Under-19 Girls",
  "Inter-Department",
]

const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "finished", label: "Finished" },
]

const STAGES: { value: NonNullable<Match["stage"]> | ""; label: string }[] = [
  { value: "", label: "— None —" },
  { value: "pool", label: "Pool / League" },
  { value: "quarterfinal", label: "Quarterfinal" },
  { value: "semifinal", label: "Semifinal" },
  { value: "third", label: "3rd Place Playoff" },
  { value: "final", label: "Final" },
]

interface MatchFormModalProps {
  match: Match
  onClose: () => void
  onSaved?: () => void
}

export default function MatchFormModal({
  match,
  onClose,
  onSaved,
}: MatchFormModalProps) {
  const { teams, updateMatch, deleteMatch } = useData()

  const [court, setCourt] = useState(match.court)
  const [category, setCategory] = useState<Category>(match.category)
  const [teamAId, setTeamAId] = useState(match.teamAId)
  const [teamBId, setTeamBId] = useState(match.teamBId)
  const [date, setDate] = useState(match.date)
  const [time, setTime] = useState(match.time)
  const [round, setRound] = useState(match.round ?? "")
  const [stage, setStage] = useState<Match["stage"]>(match.stage)
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [scoreA, setScoreA] = useState(match.scoreA)
  const [scoreB, setScoreB] = useState(match.scoreB)
  const [venue, setVenue] = useState(match.venue ?? "")

  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Eligible teams for this category. Always include whichever teams are
  // already on this match (in case the match was created before a category
  // change, or the team's category was edited later).
  const eligibleTeams = useMemo(() => {
    const inCategory = teams.filter((t) => t.category === category)
    const alreadyOn = teams.filter(
      (t) => t.id === match.teamAId || t.id === match.teamBId
    )
    const ids = new Set(inCategory.map((t) => t.id))
    const merged = [...inCategory]
    for (const t of alreadyOn) {
      if (!ids.has(t.id)) merged.push(t)
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name))
  }, [teams, category, match.teamAId, match.teamBId])

  // Auto-derive winner when status is finished and scores differ.
  const derivedWinnerId = useMemo(() => {
    if (status !== "finished") return undefined
    if (scoreA > scoreB) return teamAId
    if (scoreB > scoreA) return teamBId
    return undefined
  }, [status, scoreA, scoreB, teamAId, teamBId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!teamAId || !teamBId) return
    if (teamAId === teamBId) return

    setSaving(true)
    try {
      const patch: Partial<Match> = {
        court: court.trim() || match.court,
        category,
        teamAId,
        teamBId,
        date,
        time,
        round: round.trim() || undefined,
        stage,
        status,
        scoreA: Math.max(0, scoreA),
        scoreB: Math.max(0, scoreB),
        venue: venue.trim() || undefined,
        // Only set winnerId when the match is finished; clear it otherwise.
        winnerId: status === "finished" ? derivedWinnerId : undefined,
      }
      await updateMatch(match.id, patch)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error("[MatchFormModal] save failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteMatch(match.id)
      onClose()
    } catch (err) {
      console.error("[MatchFormModal] delete failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const teamById = (id: string) => teams.find((t) => t.id === id)
  const teamAName = teamById(teamAId)?.name ?? "TBD"
  const teamBName = teamById(teamBId)?.name ?? "TBD"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="glass max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-xl">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Edit Match
            </h2>
            <p className="text-xs text-slate-400">
              {teamAName} vs {teamBName} · {match.date} · {match.court}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 p-6">
          {/* Match Info */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Match Info
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Court
                </label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="Main Court"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Match Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tip-off Time
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="10:00 AM"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Stage
                </label>
                <select
                  value={stage ?? ""}
                  onChange={(e) =>
                    setStage(
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as Match["stage"])
                    )
                  }
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Round label
                </label>
                <input
                  type="text"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="League · Round 3"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Venue (optional)
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="IMRT Basketball Court Near Divine Bliss"
                />
              </div>
            </div>
          </section>

          {/* Teams */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Teams
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Team A
                </label>
                <select
                  value={teamAId === "TBD" ? "" : teamAId}
                  onChange={(e) => setTeamAId(e.target.value || "TBD")}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                >
                  <option value="">— TBD —</option>
                  {eligibleTeams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={t.id === teamBId}
                    >
                      {t.name} (Pool {t.pool})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Team B
                </label>
                <select
                  value={teamBId === "TBD" ? "" : teamBId}
                  onChange={(e) => setTeamBId(e.target.value || "TBD")}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                >
                  <option value="">— TBD —</option>
                  {eligibleTeams.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={t.id === teamAId}
                    >
                      {t.name} (Pool {t.pool})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Status & Score */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Status & Score
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MatchStatus)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Score — {teamAName}
                </label>
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Score — {teamBName}
                </label>
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>

            {status === "finished" && (
              <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 px-4 py-3 text-xs text-gold-300">
                {derivedWinnerId
                  ? `Winner will be set to: ${teamById(derivedWinnerId)?.name}`
                  : "Draw — no winner will be recorded."}
                <p className="mt-1 text-[11px] text-slate-400">
                  Note: editing scores here does NOT retroactively adjust team
                  standings. Use the Teams tab to correct W/L manually if needed.
                </p>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-xl flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Delete Match
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || teamAId === teamBId}
                className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-gold-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Delete this match?
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  {teamAName} vs {teamBName} · {date} · {time}. This cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 transition disabled:opacity-40"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}