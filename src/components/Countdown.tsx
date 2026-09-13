import { useEffect, useState } from "react"

function diff(target: number) {
  const total = Math.max(0, target - Date.now())
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

export default function Countdown({ target }: { target: string }) {
  const ts = new Date(target).getTime()
  const [time, setTime] = useState(() => diff(ts))

  useEffect(() => {
    const id = setInterval(() => setTime(diff(ts)), 1000)
    return () => clearInterval(id)
  }, [ts])

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Mins", value: time.minutes },
    { label: "Secs", value: time.seconds },
  ]

  return (
    <div className="flex gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="glass flex min-w-[64px] flex-col items-center rounded-xl px-3 py-3 sm:min-w-[80px] sm:px-4"
        >
          <span className="font-display text-3xl font-bold tabular-nums text-gold-500 sm:text-4xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{u.label}</span>
        </div>
      ))}
    </div>
  )
}
