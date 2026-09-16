export type Category =
  | "Men's Open"
  | "Women's Open"
  | "Under-19 Boys"
  | "Under-19 Girls"
  | "Inter-Department"

export type MatchStatus = "upcoming" | "live" | "finished"

export interface Player {
  name: string
  jersey: number
  height: string
  role: string
  isSub?: boolean
}

export interface Captain {
  name: string
  email: string
  phone: string
  studentId: string
}

export interface Team {
  id: string
  code: string
  name: string
  color: string
  category: Category
  pool: string
  captain: Captain
  roster: Player[]
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  approved: boolean
}

export interface Match {
  id: string
  court: string
  category: Category
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  status: MatchStatus
  time: string
  date: string
  stage?: "pool" | "quarterfinal" | "semifinal" | "third" | "final"
  pool?: string
  round?: string
  winnerId?: string
  venue?: string
}

export interface Scorer {
  id: string
  name: string
  email: string
  phone: string
  assignedCourt: string
  active: boolean
}

/** Separate entity for the MVP race — do NOT reuse Scorer. */
export interface PlayerStat {
  id: string
  playerName: string
  teamId: string
  points: number
  games: number
}

export interface TournamentSettings {
  name: string
  dates: string
  venue: string
  city: string
  tipOff: string
  contactEmail: string
}