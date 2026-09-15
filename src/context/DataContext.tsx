import React, { createContext, useContext, useState, useEffect } from "react"
import { mockTeams, mockMatches, mockScorers, TOURNAMENT } from "@/lib/mockData"
import type { Team, Match, Scorer, TournamentSettings } from "@/lib/types"

interface DataContextType {
  teams: Team[]
  matches: Match[]
  scorers: Scorer[]
  tournament: TournamentSettings
  addTeam: (team: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">) => void
  updateTeamStatus: (teamId: string, approved: boolean) => void
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number, status: Match["status"]) => void
  addMatch: (match: Omit<Match, "id">) => void
  deleteMatch: (matchId: string) => void
  addScorer: (scorer: Omit<Scorer, "id">) => void
  deleteScorer: (scorerId: string) => void
  updateTournamentSettings: (settings: Partial<TournamentSettings>) => void
  getTeam: (id: string) => Team | undefined
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem("imrt_teams")
    return saved ? JSON.parse(saved) : mockTeams
  })

  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem("imrt_matches")
    return saved ? JSON.parse(saved) : mockMatches
  })

  const [scorers, setScorers] = useState<Scorer[]>(() => {
    const saved = localStorage.getItem("imrt_scorers")
    return saved ? JSON.parse(saved) : mockScorers
  })

  const [tournament, setTournament] = useState<TournamentSettings>(() => {
    const saved = localStorage.getItem("imrt_tournament")
    return saved ? JSON.parse(saved) : {
      name: TOURNAMENT.name,
      dates: TOURNAMENT.dates,
      venue: TOURNAMENT.venue,
      city: TOURNAMENT.city,
      tipOff: TOURNAMENT.tipOff
    }
  })

  useEffect(() => {
    localStorage.setItem("imrt_teams", JSON.stringify(teams))
  }, [teams])

  useEffect(() => {
    localStorage.setItem("imrt_matches", JSON.stringify(matches))
  }, [matches])

  useEffect(() => {
    localStorage.setItem("imrt_scorers", JSON.stringify(scorers))
  }, [scorers])

  useEffect(() => {
    localStorage.setItem("imrt_tournament", JSON.stringify(tournament))
  }, [tournament])

  const addTeam = (newTeamData: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">) => {
    const newTeam: Team = {
      ...newTeamData,
      id: `team_${Date.now()}`,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: false
    }
    setTeams((prev) => [newTeam, ...prev])
  }

  const updateTeamStatus = (teamId: string, approved: boolean) => {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, approved } : t)))
  }

  const updateMatchScore = (matchId: string, scoreA: number, scoreB: number, status: Match["status"]) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, scoreA, scoreB, status } : m))
    )
  }

  const addMatch = (newMatchData: Omit<Match, "id">) => {
    const newMatch: Match = {
      ...newMatchData,
      id: `match_${Date.now()}`
    }
    setMatches((prev) => [newMatch, ...prev])
  }

  const deleteMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
  }

  const addScorer = (newScorerData: Omit<Scorer, "id">) => {
    const newScorer: Scorer = {
      ...newScorerData,
      id: `scorer_${Date.now()}`
    }
    setScorers((prev) => [...prev, newScorer])
  }

  const deleteScorer = (scorerId: string) => {
    setScorers((prev) => prev.filter((s) => s.id !== scorerId))
  }

  const updateTournamentSettings = (newSettings: Partial<TournamentSettings>) => {
    setTournament((prev) => ({ ...prev, ...newSettings }))
  }

  const getTeam = (id: string) => teams.find((t) => t.id === id)

  return (
    <DataContext.Provider
      value={{
        teams,
        matches,
        scorers,
        tournament,
        addTeam,
        updateTeamStatus,
        updateMatchScore,
        addMatch,
        deleteMatch,
        addScorer,
        deleteScorer,
        updateTournamentSettings,
        getTeam
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error("useData must be used within a DataProvider")
  return context
}
