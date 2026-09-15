export interface TeamMember {
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
  category: "Men's Open" | "Women's Open" | "U-19 Boys" | "U-19 Girls"
  pool: string
  captain: Captain
  roster: TeamMember[]
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  approved: boolean
}

export type MatchStatus = "upcoming" | "live" | "completed" | "finished"

export interface Match {
  id: string
  court: string
  category: string
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  status: MatchStatus
  time: string
  date: string
  round: string
  venue: string
}

export interface Scorer {
  id: string
  name: string
  email: string
  phone: string
  assignedCourt: string
  active: boolean
}

export interface TournamentSettings {
  name: string
  dates: string
  venue: string
  city: string
  tipOff: string
}

export interface ScorerStat {
  teamId: string
  playerName: string
  points: number
  games: number
}
