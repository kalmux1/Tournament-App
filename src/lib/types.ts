export type Category = "Men's Open" | "Women's Open" | "Inter-Department"

export interface Player {
  name: string
  jersey: number
  height: string
  role: "Guard" | "Forward" | "Center" | "Wing"
  isSub: boolean
  points?: number
  fouls?: number
  subbedOut?: boolean
}

export interface Team {
  id: string
  code: string
  name: string
  logo?: string
  color: string
  category: Category
  pool: string
  captain: {
    name: string
    email: string
    phone: string
    studentId: string
  }
  roster: Player[]
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  approved: boolean
  createdAt?: any
}

export interface Match {
  id: string
  court: string
  category: Category
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  status: "upcoming" | "live" | "completed"
  time: string
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
