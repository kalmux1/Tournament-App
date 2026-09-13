import { useData } from "@/context/DataContext"

export default function Ticker() {
  const { matches, getTeam } = useData()

  const items = matches.map((m) => {
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

  const doubled = [...items, ...items]

  return (
    <div className="relative flex items-center overflow-hidden border-b border-white/10 bg-black/60">
      <span className="z-10 flex h-full items-center gap-1 bg-gold-500 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-slate-950">
        Scores
      </span>
      <div className="flex overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="flex items-center gap-2 px-5 py-1.5 text-sm">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.status === "live"
                    ? "animate-pulse-glow bg-red-600 text-white"
                    : item.status === "finished"
                      ? "bg-white/10 text-slate-400"
                      : "bg-gold-500/20 text-gold-500"
                }`}
              >
                {item.label}
              </span>
              <span className="font-medium text-slate-200">{item.text}</span>
              <span className="text-slate-600">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
