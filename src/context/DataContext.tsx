import React, { createContext, useContext, useState, useEffect, useRef } from "react"
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDocs,
  query,
  serverTimestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { mockTeams, mockMatches, mockScorers, TOURNAMENT } from "@/lib/mockData"
import type { Team, Match, Scorer, TournamentSettings } from "@/lib/types"

interface DataContextType {
  teams: Team[]
  matches: Match[]
  scorers: Scorer[]
  tournament: TournamentSettings
  addTeam: (team: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">) => Promise<void>
  updateTeamStatus: (teamId: string, approved: boolean) => Promise<void>
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number, status: Match["status"]) => Promise<void>
  addMatch: (match: Omit<Match, "id">) => Promise<void>
  deleteMatch: (matchId: string) => Promise<void>
  addScorer: (scorer: Omit<Scorer, "id">) => Promise<void>
  deleteScorer: (scorerId: string) => Promise<void>
  updateTournamentSettings: (settings: Partial<TournamentSettings>) => Promise<void>
  getTeam: (id: string) => Team | undefined
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const DEFAULT_TOURNAMENT: TournamentSettings = {
  name: TOURNAMENT.name,
  dates: TOURNAMENT.dates,
  venue: "IMRT Basketball Court Near Divine Bliss",
  city: "Lucknow, India",
  tipOff: TOURNAMENT.tipOff,
  contactEmail: TOURNAMENT.contactEmail,
}

async function seedIfEmpty() {
  if (!db || !isFirebaseConfigured) return
  try {
    const teamsSnap = await getDocs(collection(db, "teams"))
    if (teamsSnap.empty) {
      for (const team of mockTeams) {
        await setDoc(doc(db, "teams", team.id), { ...team })
      }
    }
    const matchesSnap = await getDocs(collection(db, "matches"))
    if (matchesSnap.empty) {
      for (const match of mockMatches) {
        const { id, ...matchData } = match
        await setDoc(doc(db, "matches", id), { ...matchData })
      }
    }
    const scorersSnap = await getDocs(collection(db, "scorers"))
    if (scorersSnap.empty) {
      for (const scorer of mockScorers) {
        await setDoc(doc(db, "scorers", scorer.id), { ...scorer })
      }
    }
    const tourSnap = await getDocs(collection(db, "tournament"))
    if (tourSnap.empty) {
      await setDoc(doc(db, "tournament", "config"), { ...DEFAULT_TOURNAMENT })
    }
  } catch (err) {
    console.error("[DataContext] Seeding error:", err)
  }
}

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
    return saved ? JSON.parse(saved) : DEFAULT_TOURNAMENT
  })
  const [firestoreReady, setFirestoreReady] = useState(false)
  const seededRef = useRef(false)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) return

    seedIfEmpty().then(() => {
      seededRef.current = true
      setFirestoreReady(true)
    })

    const unsubTeams = onSnapshot(
      query(collection(db, "teams")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }) as Team)
        list.sort((a, b) => {
          if (a.approved !== b.approved) return a.approved ? 1 : -1
          return 0
        })
        setTeams(list)
        localStorage.setItem("imrt_teams", JSON.stringify(list))
      },
      (err) => console.error("[DataContext] teams listener error:", err)
    )

    const unsubMatches = onSnapshot(
      query(collection(db, "matches")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }) as Match)
        setMatches(list)
        localStorage.setItem("imrt_matches", JSON.stringify(list))
      },
      (err) => console.error("[DataContext] matches listener error:", err)
    )

    const unsubScorers = onSnapshot(
      query(collection(db, "scorers")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Scorer, "id">) }) as Scorer)
        setScorers(list)
        localStorage.setItem("imrt_scorers", JSON.stringify(list))
      },
      (err) => console.error("[DataContext] scorers listener error:", err)
    )

    const unsubTournament = onSnapshot(
      doc(db, "tournament", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as TournamentSettings
          setTournament(data)
          localStorage.setItem("imrt_tournament", JSON.stringify(data))
        }
      },
      (err) => console.error("[DataContext] tournament listener error:", err)
    )

    return () => {
      unsubTeams()
      unsubMatches()
      unsubScorers()
      unsubTournament()
    }
  }, [])

  const addTeam = async (newTeamData: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">) => {
    const newTeam: Team = {
      ...newTeamData,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: false,
    } as Team

    if (db && isFirebaseConfigured) {
      try {
        const ref = await addDoc(collection(db, "teams"), { ...newTeam, createdAt: serverTimestamp() })
        console.log("[DataContext] Team saved to Firestore:", ref.id)
      } catch (err) {
        console.error("[DataContext] addTeam error:", err)
        setTeams((prev) => [{ ...newTeam, id: `team_${Date.now()}` }, ...prev])
      }
    } else {
      const localTeam = { ...newTeam, id: `team_${Date.now()}` }
      setTeams((prev) => [localTeam, ...prev])
      localStorage.setItem("imrt_teams", JSON.stringify([localTeam, ...teams]))
    }
  }

  const updateTeamStatus = async (teamId: string, approved: boolean) => {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, approved } : t)))
    if (db && isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, "teams", teamId), { approved })
        console.log("[DataContext] Team status updated:", teamId, { approved })
      } catch (err) {
        console.error("[DataContext] updateTeamStatus error:", err)
      }
    }
  }

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number, status: Match["status"]) => {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, scoreA, scoreB, status } : m)))
    if (db && isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, "matches", matchId), { scoreA, scoreB, status })
        console.log("[DataContext] Match score updated:", matchId, { scoreA, scoreB, status })
      } catch (err) {
        console.error("[DataContext] updateMatchScore error:", err)
      }
    }
  }

  const addMatch = async (newMatchData: Omit<Match, "id">) => {
    if (db && isFirebaseConfigured) {
      try {
        const ref = await addDoc(collection(db, "matches"), { ...newMatchData, createdAt: serverTimestamp() })
        console.log("[DataContext] Match saved to Firestore:", ref.id)
      } catch (err) {
        console.error("[DataContext] addMatch error:", err)
        const localMatch = { ...newMatchData, id: `match_${Date.now()}` }
        setMatches((prev) => [localMatch, ...prev])
      }
    } else {
      const localMatch = { ...newMatchData, id: `match_${Date.now()}` }
      setMatches((prev) => [localMatch, ...prev])
      localStorage.setItem("imrt_matches", JSON.stringify([localMatch, ...matches]))
    }
  }

  const deleteMatch = async (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
    if (db && isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, "matches", matchId))
        console.log("[DataContext] Match deleted:", matchId)
      } catch (err) {
        console.error("[DataContext] deleteMatch error:", err)
      }
    }
  }

  const addScorer = async (newScorerData: Omit<Scorer, "id">) => {
    if (db && isFirebaseConfigured) {
      try {
        const ref = await addDoc(collection(db, "scorers"), { ...newScorerData, createdAt: serverTimestamp() })
        console.log("[DataContext] Scorer saved to Firestore:", ref.id)
      } catch (err) {
        console.error("[DataContext] addScorer error:", err)
        const localScorer = { ...newScorerData, id: `scorer_${Date.now()}` }
        setScorers((prev) => [...prev, localScorer])
      }
    } else {
      const localScorer = { ...newScorerData, id: `scorer_${Date.now()}` }
      setScorers((prev) => [...prev, localScorer])
      localStorage.setItem("imrt_scorers", JSON.stringify([...scorers, localScorer]))
    }
  }

  const deleteScorer = async (scorerId: string) => {
    setScorers((prev) => prev.filter((s) => s.id !== scorerId))
    if (db && isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, "scorers", scorerId))
        console.log("[DataContext] Scorer deleted:", scorerId)
      } catch (err) {
        console.error("[DataContext] deleteScorer error:", err)
      }
    }
  }

  const updateTournamentSettings = async (newSettings: Partial<TournamentSettings>) => {
    setTournament((prev) => ({ ...prev, ...newSettings }))
    if (db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, "tournament", "config"), { ...tournament, ...newSettings }, { merge: true })
        console.log("[DataContext] Tournament settings updated:", newSettings)
      } catch (err) {
        console.error("[DataContext] updateTournamentSettings error:", err)
      }
    } else {
      localStorage.setItem("imrt_tournament", JSON.stringify({ ...tournament, ...newSettings }))
    }
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
        getTeam,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
