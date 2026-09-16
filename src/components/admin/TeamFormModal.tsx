import { useState } from "react"
import { X, Plus, Trash2, Check, ShieldCheck } from "lucide-react"
import type { Team, Category, Player, Captain } from "@/lib/types"

const CATEGORIES: Category[] = [
  "Men's Open",
  "Women's Open",
  "Under-19 Boys",
  "Under-19 Girls",
  "Inter-Department",
]

const COLORS = [
  "#6B1728", "#0F172A", "#F59E0B", "#1E3A8A", "#065F46",
  "#7C2D12", "#9D174D", "#334155", "#7C3AED", "#0891B2",
]

const ROLES = ["Guard", "Forward", "Center", "Wing"]
const POOLS = ["A", "B", "C", "D", "TBD"]

const emptyPlayer = (isSub = false): Player => ({
  name: "",
  jersey: 0,
  height: "",
  role: "Guard",
  isSub,
})

function genCode() {
  const s = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `IMRT-${s}${Math.floor(Math.random() * 10)}`
}

interface TeamFormModalProps {
  team?: Team | null
  onSave: (data: Omit<Team, "id">) => Promise<void>
  onClose: () => void
}

export default function TeamFormModal({ team, onSave, onClose }: TeamFormModalProps) {
  const isNew = !team
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(team?.name || "")
  const [code, setCode] = useState(team?.code || genCode())
  const [category, setCategory] = useState<Category>(team?.category || "Men's Open")
  const [pool, setPool] = useState(team?.pool || "TBD")
  const [color, setColor] = useState(team?.color || COLORS[0])
  const [approved, setApproved] = useState(team?.approved ?? false)

  const [captain, setCaptain] = useState<Captain>(
    team?.captain || { name: "", email: "", phone: "", studentId: "" }
  )

  const [roster, setRoster] = useState<Player[]>(
    team?.roster && team.roster.length > 0
      ? team.roster
      : [emptyPlayer(), emptyPlayer(), emptyPlayer()]
  )

  const [wins, setWins] = useState(team?.wins ?? 0)
  const [losses, setLosses] = useState(team?.losses ?? 0)
  const [pointsFor, setPointsFor] = useState(team?.pointsFor ?? 0)
  const [pointsAgainst, setPointsAgainst] = useState(team?.pointsAgainst ?? 0)

  const updatePlayer = (i: number, patch: Partial<Player>) =>
    setRoster((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const addPlayer = () => {
    if (roster.length >= 6) return
    setRoster((prev) => [...prev, emptyPlayer(prev.length >= 3)])
  }

  const removePlayer = (i: number) =>
    setRoster((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (name.trim().length < 2) return
    setSaving(true)
    try {
      await onSave({
        code: code.trim() || genCode(),
        name: name.trim(),
        color,
        category,
        pool: pool.trim() || "TBD",
        captain,
        roster: roster.filter((p) => p.name.trim()),
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        approved,
      })
      onClose()
    } catch (err) {
      console.error("Team save error:", err)
    } finally {
      setSaving(false)
    }
  }

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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-xl">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {isNew ? "Add New Team" : "Edit Team"}
            </h2>
            <p className="text-xs text-slate-400">
              {isNew
                ? "Create a team manually — useful for walk-ins or admin-entered squads."
                : `Editing ${team?.name}`}
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

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Basic Info
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. Skyline Ballers"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Team Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white font-mono focus:border-gold-500 focus:outline-none"
                  placeholder="IMRT-XXX"
                />
              </div>

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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Pool</label>
                <select
                  value={pool}
                  onChange={(e) => setPool(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {POOLS.map((p) => (
                    <option key={p} value={p}>
                      {p === "TBD" ? "TBD (unassigned)" : `Pool ${p}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Team Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-9 w-9 rounded-full ring-2 transition ${
                        color === c ? "ring-gold-500" : "ring-transparent hover:ring-white/20"
                      }`}
                      style={{ background: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-gold-500" />
                  Approved for tournament
                </div>
                <p className="text-xs text-slate-400">
                  Approved teams appear on the public Hub and can be scheduled in matches.
                </p>
              </div>
            </label>
          </section>

          {/* Captain */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Captain
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={captain.name}
                  onChange={(e) => setCaptain({ ...captain, name: e.target.value })}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="Captain full name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={captain.email}
                  onChange={(e) => setCaptain({ ...captain, email: e.target.value })}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone</label>
                <input
                  type="text"
                  value={captain.phone}
                  onChange={(e) => setCaptain({ ...captain, phone: e.target.value })}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="+91 ..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Student / Staff ID
                </label>
                <input
                  type="text"
                  value={captain.studentId}
                  onChange={(e) => setCaptain({ ...captain, studentId: e.target.value })}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="IMRT-XXXX"
                />
              </div>
            </div>
          </section>

          {/* Roster */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
                Roster ({roster.length})
              </h3>
              <button
                type="button"
                onClick={addPlayer}
                disabled={roster.length >= 6}
                className="flex items-center gap-1 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 transition disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add Player
              </button>
            </div>

            <div className="space-y-3">
              {roster.map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Player {i + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!p.isSub}
                          onChange={(e) => updatePlayer(i, { isSub: e.target.checked })}
                          className="h-3.5 w-3.5 accent-gold-500"
                        />
                        Reserve
                      </label>
                      <button
                        type="button"
                        onClick={() => removePlayer(i)}
                        disabled={roster.length <= 1}
                        className="text-red-400 hover:text-red-300 disabled:opacity-30"
                        aria-label={`Remove player ${i + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                    <input
                      className="rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
                      placeholder="Player name"
                      value={p.name}
                      onChange={(e) => updatePlayer(i, { name: e.target.value })}
                    />
                    <input
                      className="rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white w-20 focus:border-gold-500 focus:outline-none"
                      type="number"
                      min={0}
                      placeholder="#"
                      value={p.jersey || ""}
                      onChange={(e) => updatePlayer(i, { jersey: Number(e.target.value) })}
                    />
                    <input
                      className="rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm text-white w-24 focus:border-gold-500 focus:outline-none"
                      placeholder="Height"
                      value={p.height}
                      onChange={(e) => updatePlayer(i, { height: e.target.value })}
                    />
                    <select
                      className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white w-32 focus:border-gold-500 focus:outline-none"
                      value={p.role}
                      onChange={(e) => updatePlayer(i, { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="space-y-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-500">
              Standings (manual override)
            </h3>
            <p className="text-xs text-slate-500 -mt-2">
              Normally updated automatically when the scorer ends a match. Override here for
              corrections.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              {(
                [
                  { label: "Wins", value: wins, set: setWins },
                  { label: "Losses", value: losses, set: setLosses },
                  { label: "Points For", value: pointsFor, set: setPointsFor },
                  { label: "Points Against", value: pointsAgainst, set: setPointsAgainst },
                ] as const
              ).map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={f.value}
                    onChange={(e) => f.set(Number(e.target.value) || 0)}
                    className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-xl flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || name.trim().length < 2}
              className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-gold-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : isNew ? "Create Team" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}