import { useState } from "react"
import MatchCard from "@/components/MatchCard"
import { useData } from "@/context/DataContext"
import type { MatchStatus } from "@/lib/types"

const FILTERS: { key: MatchStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

export default function Schedule() {
  const { matches } = useData()
  const [filter, setFilter] = useState<MatchStatus | "all">("all")

  const filtered = matches.filter((m) => filter === "all" || m.status === filter)
  const dates = Array.from(new Set(filtered.map((m) => m.date))).sort()

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition ${
              filter === f.key ? "bg-gold-500 text-slate-950" : "border border-white/15 text-slate-300 hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {dates.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
          No matches in this view yet.
        </p>
      )}

      <div className="space-y-8">
        {dates.map((date) => (
          <div key={date}>
            <h4 className="mb-4 flex items-center gap-3 font-display text-sm font-bold uppercase tracking-wider text-slate-300">
              <span className="h-2 w-2 rounded-full bg-gold-500" />
              {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h4>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered
                .filter((m) => m.date === date)
                .map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
