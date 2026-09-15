import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronRight, ChevronLeft, Copy, PartyPopper, Users } from "lucide-react"
import { useData } from "@/context/DataContext"
import type { Category, Player, Team } from "@/lib/types"

const CATEGORIES: Category[] = ["Men's Open", "Women's Open", "Inter-Department"]
const COLORS = ["#6B1728", "#0F172A", "#F59E0B", "#1E3A8A", "#065F46", "#7C2D12", "#9D174D", "#334155"]
const ROLES: Player["role"][] = ["Guard", "Forward", "Center", "Wing"]

const emptyPlayer = (): Player => ({ name: "", jersey: 0, height: "", role: "Guard" })

function genCode() {
  const s = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `IMRT-${s}${Math.floor(Math.random() * 10)}`
}

export default function Register() {
  const { addTeam } = useData()
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState<Team | null>(null)

  const [name, setName] = useState("")
  const [category, setCategory] = useState<Category>("Men's Open")
  const [color, setColor] = useState(COLORS[0])
  const [captain, setCaptain] = useState({ name: "", email: "", phone: "", studentId: "" })
  const [players, setPlayers] = useState<Player[]>([emptyPlayer(), emptyPlayer(), emptyPlayer()])
  const [sub, setSub] = useState<Player>({ ...emptyPlayer(), isSub: true })

  const steps = ["Team", "Captain", "Roster", "Review"]

  const step0Valid = name.trim().length > 1
  const step1Valid = captain.name && /\S+@\S+\.\S+/.test(captain.email) && captain.phone && captain.studentId
  const step2Valid = players.every((p) => p.name.trim() && p.jersey > 0)
  const canNext = [step0Valid, step1Valid, step2Valid, true][step]

  const updatePlayer = (i: number, patch: Partial<Player>) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const submit = async () => {
    const roster = [...players]
    if (sub.name.trim()) roster.push({ ...sub, isSub: true })
    const code = genCode()
    const teamData = {
      code,
      name: name.trim(),
      color,
      category,
      pool: "TBD",
      captain,
      roster,
    }
    await addTeam(teamData)
    setDone({ ...teamData, id: `t${Date.now()}`, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, approved: false } as Team)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-slate-950">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold text-white">You&apos;re in!</h1>
        <p className="mt-3 text-slate-400">
          <span className="font-semibold text-white">{done.name}</span> has been registered for the {done.category}{" "}
          bracket. Your entry is pending organizer approval.
        </p>
        <div className="glass mt-8 rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Team Code</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="font-display text-3xl font-bold tracking-widest text-gold-500">{done.code}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(done.code)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10"
              aria-label="Copy code"
            >
              {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Keep this code — you&apos;ll use it for check-in on match day.</p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/hub" className="btn-gold">
            Go to Tournament Hub
          </Link>
          <button
            onClick={() => {
              setDone(null)
              setStep(0)
              setName("")
              setCaptain({ name: "", email: "", phone: "", studentId: "" })
              setPlayers([emptyPlayer(), emptyPlayer(), emptyPlayer()])
              setSub({ ...emptyPlayer(), isSub: true })
            }}
            className="btn-ghost"
          >
            Register Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">Join the Championship</span>
        <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">Register Your Team</h1>
        <p className="mt-3 text-slate-400">3 starters, 1 optional reserve. Takes under two minutes.</p>
      </header>

      {/* Stepper */}
      <div className="mt-10 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold transition ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-gold-500 text-slate-950"
                      : "border border-white/15 text-slate-500"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[11px] uppercase tracking-wider ${i === step ? "text-gold-500" : "text-slate-500"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${i < step ? "bg-emerald-500" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="label">Team Name</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Skyline Ballers" />
            </div>
            <div>
              <label className="label">Category</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                      category === c
                        ? "border-gold-500 bg-gold-500/10 text-gold-500"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Team Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-9 w-9 rounded-full ring-2 transition ${color === c ? "ring-gold-500" : "ring-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="label">Captain Name</label>
              <input className="field" value={captain.name} onChange={(e) => setCaptain({ ...captain, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input className="field" type="email" value={captain.email} onChange={(e) => setCaptain({ ...captain, email: e.target.value })} placeholder="name@imrt.edu" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="field" value={captain.phone} onChange={(e) => setCaptain({ ...captain, phone: e.target.value })} placeholder="+91 ..." />
              </div>
            </div>
            <div>
              <label className="label">Student / Staff ID</label>
              <input className="field" value={captain.studentId} onChange={(e) => setCaptain({ ...captain, studentId: e.target.value })} placeholder="IMRT-XXXX" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {players.map((p, i) => (
              <PlayerFields key={i} label={`Starter ${i + 1}`} player={p} onChange={(patch) => updatePlayer(i, patch)} />
            ))}
            <div className="rounded-lg border border-dashed border-white/15 p-1">
              <PlayerFields label="Reserve (optional)" player={sub} onChange={(patch) => setSub({ ...sub, ...patch })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold text-white"
                style={{ background: color }}
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="font-display text-2xl font-bold text-white">{name}</div>
                <div className="text-sm text-slate-400">{category}</div>
              </div>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-display text-xs uppercase tracking-wider text-slate-400">
                <Users className="h-4 w-4" /> Roster
              </div>
              <ul className="space-y-1.5">
                {[...players, ...(sub.name.trim() ? [sub] : [])].map((p, i) => (
                  <li key={i} className="flex justify-between text-slate-200">
                    <span>
                      #{p.jersey} {p.name} {p.isSub && <span className="text-xs text-slate-500">(reserve)</span>}
                    </span>
                    <span className="text-slate-400">{p.role} · {p.height || "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-white/5 p-4 text-sm text-slate-300">
              Captain: <span className="text-white">{captain.name}</span> · {captain.email}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn-gold disabled:opacity-40">
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} className="btn-gold">
              <Check className="h-4 w-4" /> Submit Registration
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerFields({
  label,
  player,
  onChange,
}: {
  label: string
  player: Player
  onChange: (patch: Partial<Player>) => void
}) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-gold-500">{label}</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          className="field"
          placeholder="Player name"
          value={player.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className="field sm:w-20"
          type="number"
          min={0}
          placeholder="#"
          value={player.jersey || ""}
          onChange={(e) => onChange({ jersey: Number(e.target.value) })}
        />
        <input
          className="field sm:w-24"
          placeholder="Height"
          value={player.height}
          onChange={(e) => onChange({ height: e.target.value })}
        />
        <select
          className="field sm:w-32"
          value={player.role}
          onChange={(e) => onChange({ role: e.target.value as Player["role"] })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
