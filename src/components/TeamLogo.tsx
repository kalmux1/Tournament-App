const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
}

type TeamLogoTeam = {
  name?: string | null
  logo?: string | null
  color?: string | null
}

type TeamLogoProps = {
  team?: TeamLogoTeam | null
  size?: keyof typeof SIZES
}

function initials(name: string) {
  if (!name) return "??"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function TeamLogo({ team, size = "md" }: TeamLogoProps) {
  if (!team) {
    return (
      <span
        aria-hidden="true"
        className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white/10 bg-slate-700`}
      >
        ?
      </span>
    )
  }

  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={`${team.name || "Team"} logo`}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-white/10`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white/10`}
      style={{
        background: `linear-gradient(135deg, ${team.color || "#3b82f6"}, rgba(15,23,42,0.9))`,
      }}
    >
      {initials(team.name || "Team")}
    </span>
  )
}