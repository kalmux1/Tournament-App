import type { Team } from "@/lib/types"

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function TeamLogo({
  team,
  size = "md",
}: {
  team: Pick<Team, "name" | "logo" | "color">
  size?: keyof typeof SIZES
}) {
  if (team.logo) {
    return (
      <img
        src={team.logo || "/placeholder.svg"}
        alt={`${team.name} logo`}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-white/10`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white/10`}
      style={{ background: `linear-gradient(135deg, ${team.color}, rgba(15,23,42,0.9))` }}
    >
      {initials(team.name)}
    </span>
  )
}
