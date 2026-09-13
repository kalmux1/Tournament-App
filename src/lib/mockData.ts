export interface Team {
  id: string
  name: string
  category: "mens" | "womens" | "under19"
  pool: "A" | "B" | "C" | "D"
  seed: number
  players: string[]
  captain: string
  phone: string
  email: string
  college: string
  status: "pending" | "approved"
  wins?: number
  losses?: number
  pointsFor?: number
  pointsAgainst?: number
}

export interface Match {
  id: string
  court: string
  time: string
  teamAId: string
  teamBId: string
  scoreA: number
  scoreB: number
  status: "upcoming" | "live" | "finished"
  category: "mens" | "womens" | "under19"
  round: "pool" | "quarter" | "semi" | "final"
}

export interface Scorer {
  id: string
  playerName: string
  teamId: string
  points: number
  games: number
  category: string
}

export const TOURNAMENT = {
  name: "IMRT 3x3 Basketball Championship 2026",
  dates: "3 October – 8 October 2026",
  venue: "IMRT Basketball Court Near Devine Bliss",
  city: "Lucknow, UP",
  tipOff: "2026-10-03T09:00:00",
}

export const INITIAL_TEAMS: Team[] = [
  {
    id: "t1",
    name: "Ballerz Elite",
    category: "mens",
    pool: "A",
    seed: 1,
    players: ["Aarav Sharma", "Rohan Verma", "Kabir Singh", "Devansh Mishra"],
    captain: "Aarav Sharma",
    phone: "+91 98765 43210",
    email: "aarav@ballerz.com",
    college: "IMRT University",
    status: "approved",
    wins: 3,
    losses: 0,
    pointsFor: 63,
    pointsAgainst: 42,
  },
  {
    id: "t2",
    name: "Court Dynamos",
    category: "mens",
    pool: "A",
    seed: 2,
    players: ["Aditya Rao", "Karan Gupta", "Yashwant Patel", "Nikhil Kumar"],
    captain: "Aditya Rao",
    phone: "+91 98765 43211",
    email: "aditya@dynamos.com",
    college: "BBDIT",
    status: "approved",
    wins: 2,
    losses: 1,
    pointsFor: 58,
    pointsAgainst: 49,
  },
  {
    id: "t3",
    name: "Net Rippers",
    category: "mens",
    pool: "B",
    seed: 1,
    players: ["Sameer Khan", "Arjun Nair", "Tanmay Joshi", "Varun Das"],
    captain: "Sameer Khan",
    phone: "+91 98765 43212",
    email: "sameer@rippers.com",
    college: "Integral Univ",
    status: "approved",
    wins: 3,
    losses: 0,
    pointsFor: 64,
    pointsAgainst: 38,
  },
  {
    id: "t4",
    name: "Hoopsters 3x3",
    category: "mens",
    pool: "B",
    seed: 2,
    players: ["Manish Tiwari", "Siddharth Roy", "Ankit Verma", "Deepak Yadav"],
    captain: "Manish Tiwari",
    phone: "+91 98765 43213",
    email: "manish@hoopsters.com",
    college: "SRM",
    status: "approved",
    wins: 1,
    losses: 2,
    pointsFor: 45,
    pointsAgainst: 55,
  },
  {
    id: "t5",
    name: "Crossover Queens",
    category: "womens",
    pool: "C",
    seed: 1,
    players: ["Ananya Singh", "Priya Sharma", "Neha Patel", "Rhea Sen"],
    captain: "Ananya Singh",
    phone: "+91 98765 43214",
    email: "ananya@queens.com",
    college: "IMRT University",
    status: "approved",
    wins: 2,
    losses: 0,
    pointsFor: 42,
    pointsAgainst: 25,
  },
  {
    id: "t6",
    name: "Ballerinas",
    category: "womens",
    pool: "C",
    seed: 2,
    players: ["Simran Kaur", "Divya Menon", "Shruti Iyer", "Meera Pillai"],
    captain: "Simran Kaur",
    phone: "+91 98765 43215",
    email: "simran@ballerinas.com",
    college: "Amity Univ",
    status: "approved",
    wins: 1,
    losses: 1,
    pointsFor: 35,
    pointsAgainst: 38,
  },
  {
    id: "t7",
    name: "Junior Titans",
    category: "under19",
    pool: "D",
    seed: 1,
    players: ["Ayushmaan Das", "Harsh Vardhan", "Pranav Kulkarni", "Tushar Jha"],
    captain: "Ayushmaan Das",
    phone: "+91 98765 43216",
    email: "ayush@titans.com",
    college: "City Montessori",
    status: "approved",
    wins: 3,
    losses: 0,
    pointsFor: 60,
    pointsAgainst: 30,
  },
  {
    id: "t8",
    name: "Rookies United",
    category: "under19",
    pool: "D",
    seed: 2,
    players: ["Kunal Ghosh", "Sahil Merchant", "Mayank Joshi", "Abhinav Bose"],
    captain: "Kunal Ghosh",
    phone: "+91 98765 43217",
    email: "kunal@rookies.com",
    college: "La Martiniere",
    status: "approved",
    wins: 1,
    losses: 2,
    pointsFor: 40,
    pointsAgainst: 52,
  },
]

export const INITIAL_MATCHES: Match[] = [
  {
    id: "m1",
    court: "Court 1",
    time: "10:00 AM",
    teamAId: "t1",
    teamBId: "t2",
    scoreA: 18,
    scoreB: 14,
    status: "live",
    category: "mens",
    round: "pool",
  },
  {
    id: "m2",
    court: "Court 2",
    time: "10:30 AM",
    teamAId: "t3",
    teamBId: "t4",
    scoreA: 21,
    scoreB: 12,
    status: "finished",
    category: "mens",
    round: "pool",
  },
  {
    id: "m3",
    court: "Court 1",
    time: "11:00 AM",
    teamAId: "t5",
    teamBId: "t6",
    scoreA: 15,
    scoreB: 11,
    status: "live",
    category: "womens",
    round: "pool",
  },
  {
    id: "m4",
    court: "Court 2",
    time: "11:30 AM",
    teamAId: "t7",
    teamBId: "t8",
    scoreA: 0,
    scoreB: 0,
    status: "upcoming",
    category: "under19",
    round: "pool",
  },
  {
    id: "m5",
    court: "Court 1",
    time: "12:00 PM",
    teamAId: "t1",
    teamBId: "t3",
    scoreA: 0,
    scoreB: 0,
    status: "upcoming",
    category: "mens",
    round: "pool",
  },
]

export const mockMatches = INITIAL_MATCHES
export const mockTeams = INITIAL_TEAMS

export const INITIAL_SCORERS: Scorer[] = [
  { id: "s1", playerName: "Aarav Sharma", teamId: "t1", points: 34, games: 3, category: "mens" },
  { id: "s2", playerName: "Sameer Khan", teamId: "t3", points: 31, games: 3, category: "mens" },
  { id: "s3", playerName: "Aditya Rao", teamId: "t2", points: 28, games: 3, category: "mens" },
  { id: "s4", playerName: "Ananya Singh", teamId: "t5", points: 24, games: 2, category: "womens" },
  { id: "s5", playerName: "Ayushmaan Das", teamId: "t7", points: 29, games: 3, category: "under19" },
]

export const mockScorers = INITIAL_SCORERS
