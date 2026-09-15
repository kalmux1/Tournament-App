import type { Team, Match, Scorer } from "./types"

export const TOURNAMENT = {
  name: "IMRT 3x3 Basketball Championship",
  year: 2026,
  dates: "September 27 - October 3, 2026",
  venue: "IMRT Basketball Court Near Divine Bliss",
  city: "New Delhi, India",
  tipOff: "2026-09-27T09:00:00"
}

export const mockTeams: Team[] = [
  {
    id: "team_1",
    code: "IMRT-01",
    name: "Skyline Ballers",
    color: "#6B1728",
    category: "Men's Open",
    pool: "A",
    captain: {
      name: "Rahul Verma",
      email: "rahul@imrt.edu",
      phone: "+91 98765 43210",
      studentId: "IMRT-2024-001"
    },
    roster: [
      { name: "Rahul Verma", jersey: 7, height: "6'2\"", role: "Guard", isSub: false },
      { name: "Aditya Singh", jersey: 11, height: "6'5\"", role: "Forward", isSub: false },
      { name: "Karan Mehta", jersey: 23, height: "6'7\"", role: "Center", isSub: false },
      { name: "Sameer Roy", jersey: 4, height: "6'0\"", role: "Wing", isSub: true }
    ],
    wins: 2,
    losses: 0,
    pointsFor: 42,
    pointsAgainst: 31,
    approved: true
  },
  {
    id: "team_2",
    code: "IMRT-02",
    name: "Court Kings",
    color: "#D97706",
    category: "Men's Open",
    pool: "A",
    captain: {
      name: "Vikram Nair",
      email: "vikram@imrt.edu",
      phone: "+91 98765 43211",
      studentId: "IMRT-2024-002"
    },
    roster: [
      { name: "Vikram Nair", jersey: 5, height: "6'1\"", role: "Guard", isSub: false },
      { name: "Dev Patel", jersey: 14, height: "6'4\"", role: "Forward", isSub: false },
      { name: "Arjun Das", jersey: 32, height: "6'6\"", role: "Center", isSub: false },
      { name: "Neel Kapoor", jersey: 9, height: "5'11\"", role: "Wing", isSub: true }
    ],
    wins: 1,
    losses: 1,
    pointsFor: 35,
    pointsAgainst: 33,
    approved: true
  },
  {
    id: "team_3",
    code: "IMRT-03",
    name: "Titanium Hoops",
    color: "#2563EB",
    category: "Men's Open",
    pool: "B",
    captain: {
      name: "Aarav Sharma",
      email: "aarav@imrt.edu",
      phone: "+91 98765 43212",
      studentId: "IMRT-2024-003"
    },
    roster: [
      { name: "Aarav Sharma", jersey: 10, height: "6'3\"", role: "Guard", isSub: false },
      { name: "Rohan Gupta", jersey: 21, height: "6'6\"", role: "Forward", isSub: false },
      { name: "Kabir Sen", jersey: 33, height: "6'8\"", role: "Center", isSub: false }
    ],
    wins: 2,
    losses: 0,
    pointsFor: 44,
    pointsAgainst: 28,
    approved: true
  },
  {
    id: "team_4",
    code: "IMRT-04",
    name: "Net Rippers",
    color: "#059669",
    category: "Men's Open",
    pool: "B",
    captain: {
      name: "Tanmay Joshi",
      email: "tanmay@imrt.edu",
      phone: "+91 98765 43213",
      studentId: "IMRT-2024-004"
    },
    roster: [
      { name: "Tanmay Joshi", jersey: 3, height: "6'0\"", role: "Guard", isSub: false },
      { name: "Siddharth Rao", jersey: 8, height: "6'3\"", role: "Forward", isSub: false },
      { name: "Manish Kumar", jersey: 15, height: "6'5\"", role: "Center", isSub: false }
    ],
    wins: 0,
    losses: 2,
    pointsFor: 25,
    pointsAgainst: 40,
    approved: true
  },
  {
    id: "team_5",
    code: "IMRT-05",
    name: "Viper Ladies",
    color: "#7C3AED",
    category: "Women's Open",
    pool: "A",
    captain: {
      name: "Ananya Iyer",
      email: "ananya@imrt.edu",
      phone: "+91 98765 43214",
      studentId: "IMRT-2024-005"
    },
    roster: [
      { name: "Ananya Iyer", jersey: 2, height: "5'8\"", role: "Guard", isSub: false },
      { name: "Priya Sen", jersey: 12, height: "5'10\"", role: "Forward", isSub: false },
      { name: "Diya Patel", jersey: 24, height: "6'1\"", role: "Center", isSub: false }
    ],
    wins: 2,
    losses: 0,
    pointsFor: 38,
    pointsAgainst: 22,
    approved: true
  },
  {
    id: "team_6",
    code: "IMRT-06",
    name: "Celtics Femme",
    color: "#DB2777",
    category: "Women's Open",
    pool: "A",
    captain: {
      name: "Sneha Reddy",
      email: "sneha@imrt.edu",
      phone: "+91 98765 43215",
      studentId: "IMRT-2024-006"
    },
    roster: [
      { name: "Sneha Reddy", jersey: 6, height: "5'7\"", role: "Guard", isSub: false },
      { name: "Meera Nair", jersey: 13, height: "5'9\"", role: "Forward", isSub: false },
      { name: "Ritu Sharma", jersey: 22, height: "6'0\"", role: "Center", isSub: false }
    ],
    wins: 0,
    losses: 2,
    pointsFor: 20,
    pointsAgainst: 36,
    approved: true
  }
]

export const mockMatches: Match[] = [
  {
    id: "m_1",
    court: "Court 1 (Main Arena)",
    category: "Men's Open",
    teamAId: "team_1",
    teamBId: "team_2",
    scoreA: 21,
    scoreB: 18,
    status: "completed",
    time: "09:30 AM",
    date: "2026-09-27",
    round: "Pool Stage",
    venue: "IMRT Basketball Court Near Divine Bliss"
  },
  {
    id: "m_2",
    court: "Court 2",
    category: "Men's Open",
    teamAId: "team_3",
    teamBId: "team_4",
    scoreA: 21,
    scoreB: 14,
    status: "completed",
    time: "10:15 AM",
    date: "2026-09-27",
    round: "Pool Stage",
    venue: "IMRT Basketball Court Near Divine Bliss"
  },
  {
    id: "m_3",
    court: "Court 1 (Main Arena)",
    category: "Women's Open",
    teamAId: "team_5",
    teamBId: "team_6",
    scoreA: 19,
    scoreB: 11,
    status: "completed",
    time: "11:00 AM",
    date: "2026-09-27",
    round: "Pool Stage",
    venue: "IMRT Basketball Court Near Divine Bliss"
  },
  {
    id: "m_4",
    court: "Court 1 (Main Arena)",
    category: "Men's Open",
    teamAId: "team_1",
    teamBId: "team_3",
    scoreA: 14,
    scoreB: 14,
    status: "live",
    time: "11:45 AM",
    date: "2026-09-27",
    round: "Quarterfinals",
    venue: "IMRT Basketball Court Near Divine Bliss"
  },
  {
    id: "m_5",
    court: "Court 2",
    category: "Women's Open",
    teamAId: "team_5",
    teamBId: "team_6",
    scoreA: 0,
    scoreB: 0,
    status: "upcoming",
    time: "12:30 PM",
    date: "2026-09-28",
    round: "Semifinals",
    venue: "IMRT Basketball Court Near Divine Bliss"
  }
]

export const mockScorers: Scorer[] = [
  {
    id: "scr_1",
    name: "Master Scorer Official",
    email: "scorer@imrt.in",
    phone: "+91 99999 88888",
    assignedCourt: "Court 1 (Main Arena)",
    active: true
  },
  {
    id: "scr_2",
    name: "Table Assistant",
    email: "assistant@imrt.in",
    phone: "+91 99999 77777",
    assignedCourt: "Court 2",
    active: true
  }
]
