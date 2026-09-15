export type Category = "Men's Open" | "Women's Open" | "Under-19 Boys"

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
  status: "upcoming" | "live" | "finished"
  time: string
  date: string
  stage?: string
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

export interface TournamentSettings {
  name: string
  dates: string
  venue: string
  city: string
  tipOff: string
  contactEmail: string
}
