import { useData } from "@/context/DataContext"

export default function Ticker() {
  const { matches, getTeam } = useData()

  const safeMatches = matches && Array.isArray(matches) ? matches : []

  const items = safeMatches.map((m) => {
    const a = getTeam(m.teamAId)
    const b = getTeam(m.teamBId)
    const label =
      m.status === "finished"
        ? "FINAL"
        : m.status === "live"
          ? "LIVE"
          : `${m.time} · ${m.court}`
    return {
      id: m.id,
      status: m.status,
      text: `${a?.name ?? "TBD"} ${m.scoreA}–${m.scoreB} ${b?.name ?? "TBD"}`,
      label,
    }
  })

  if (items.length === 0) {
    items.push({
      id: "default-1",
      status: "upcoming",
      text: "IMRT 3x3 Championship 2026 • 3 October – 8 October",
      label: "INFO",
    })
  }

  const doubled = [...items, ...items, ...items]

  return (
    <div className="relative z-40 flex items-center overflow-hidden border-b border-white/10 bg-slate-950">
      <span className="z-20 flex h-full items-center gap-1 bg-gold-500 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-widest text-slate-950 shadow-md">
        Scores
      </span>
      <div className="flex w-full overflow-hidden py-1.5">
        <div className="flex animate-marquee whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="flex items-center gap-2 px-6 text-sm">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.status === "live"
                    ? "animate-pulse-glow bg-red-600 text-white"
                    : item.status === "finished"
                      ? "bg-white/10 text-slate-400"
                      : "bg-gold-500/20 text-gold-400"
                }`}
              >
                {item.label}
              </span>
              <span className="font-medium text-slate-200">{item.text}</span>
              <span className="text-slate-600 ml-2">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
