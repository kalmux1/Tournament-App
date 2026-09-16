import React, { createContext, useContext, useState, useEffect } from "react"
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
import { onAuthStateChanged } from "firebase/auth"
import { db, auth, isFirebaseConfigured } from "@/lib/firebase"
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

  const [useLocalOnly, setUseLocalOnly] = useState<boolean>(() => {
    return localStorage.getItem("imrt_use_local") === "true" || !isFirebaseConfigured
  })

  useEffect(() => {
    if (!db || !auth || !isFirebaseConfigured || useLocalOnly) return

    let unsubTeams: (() => void) | undefined
    let unsubMatches: (() => void) | undefined
    let unsubScorers: (() => void) | undefined
    let unsubTournament: (() => void) | undefined

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        console.log("[DataContext] Auth state resolved. User:", user?.email || "Anonymous/Unauthenticated")

        // 1. Seed or Check Collections
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
        } catch (seedErr: any) {
          if (seedErr?.code === "permission-denied" || seedErr?.message?.includes("Missing or insufficient permissions")) {
            console.warn("[DataContext] Firestore permissions denied during seed. Using robust local mode.")
            setUseLocalOnly(true)
            localStorage.setItem("imrt_use_local", "true")
            return
          }
          console.error("[DataContext] Seeding notice:", seedErr)
        }

        // 2. Setup Real-time Listeners
        unsubTeams = onSnapshot(
          query(collection(db, "teams")),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }) as Team)
            list.sort((a, b) => {
              if (a.approved !== b.approved) return a.approved ? 1 : -1
              return 0
            })
            if (list.length > 0) {
              setTeams(list)
              localStorage.setItem("imrt_teams", JSON.stringify(list))
            }
          },
          (err) => {
            if (err?.code === "permission-denied") {
              console.warn("[DataContext] Teams listener permission denied. Switching to local state.")
              setUseLocalOnly(true)
              localStorage.setItem("imrt_use_local", "true")
            }
          }
        )

        unsubMatches = onSnapshot(
          query(collection(db, "matches")),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }) as Match)
            if (list.length > 0) {
              setMatches(list)
              localStorage.setItem("imrt_matches", JSON.stringify(list))
            }
          },
          (err) => {
            if (err?.code === "permission-denied") {
              setUseLocalOnly(true)
              localStorage.setItem("imrt_use_local", "true")
            }
          }
        )

        unsubScorers = onSnapshot(
          query(collection(db, "scorers")),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Scorer, "id">) }) as Scorer)
            if (list.length > 0) {
              setScorers(list)
              localStorage.setItem("imrt_scorers", JSON.stringify(list))
            }
          },
          (err) => {
            if (err?.code === "permission-denied") {
              setUseLocalOnly(true)
              localStorage.setItem("imrt_use_local", "true")
            }
          }
        )

        unsubTournament = onSnapshot(
          doc(db, "tournament", "config"),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as TournamentSettings
              setTournament(data)
              localStorage.setItem("imrt_tournament", JSON.stringify(data))
            }
          },
          (err) => {
            if (err?.code === "permission-denied") {
              setUseLocalOnly(true)
              localStorage.setItem("imrt_use_local", "true")
            }
          }
        )
      } catch (err: any) {
        console.error("Firestore initialization error:", err)
        if (err?.code === "permission-denied") {
          setUseLocalOnly(true)
          localStorage.setItem("imrt_use_local", "true")
        }
      }
    })

    return () => {
      unsubscribeAuth()
      if (unsubTeams) unsubTeams()
      if (unsubMatches) unsubMatches()
      if (unsubScorers) unsubScorers()
      if (unsubTournament) unsubTournament()
    }
  }, [useLocalOnly])

  const addTeam = async (newTeamData: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">) => {
    const newTeam: Team = {
      ...newTeamData,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: false,
    } as Team

    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        const ref = await addDoc(collection(db, "teams"), { ...newTeam, createdAt: serverTimestamp() })
        console.log("[DataContext] Team saved to Firestore:", ref.id)
      } catch (err) {
        console.error("[DataContext] addTeam error, saving locally:", err)
        const localTeam = { ...newTeam, id: `team_${Date.now()}` }
        setTeams((prev) => {
          const updated = [localTeam, ...prev]
          localStorage.setItem("imrt_teams", JSON.stringify(updated))
          return updated
        })
      }
    } else {
      const localTeam = { ...newTeam, id: `team_${Date.now()}` }
      setTeams((prev) => {
        const updated = [localTeam, ...prev]
        localStorage.setItem("imrt_teams", JSON.stringify(updated))
        return updated
      })
    }
  }

  const updateTeamStatus = async (teamId: string, approved: boolean) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, approved } : t))
      localStorage.setItem("imrt_teams", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await updateDoc(doc(db, "teams", teamId), { approved })
      } catch (err) {
        console.error("[DataContext] updateTeamStatus error:", err)
      }
    }
  }

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number, status: Match["status"]) => {
    setMatches((prev) => {
      const updated = prev.map((m) => (m.id === matchId ? { ...m, scoreA, scoreB, status } : m))
      localStorage.setItem("imrt_matches", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await updateDoc(doc(db, "matches", matchId), { scoreA, scoreB, status })
      } catch (err) {
        console.error("[DataContext] updateMatchScore error:", err)
      }
    }
  }

  const addMatch = async (newMatchData: Omit<Match, "id">) => {
    const localMatch = { ...newMatchData, id: `match_${Date.now()}` }
    setMatches((prev) => {
      const updated = [localMatch, ...prev]
      localStorage.setItem("imrt_matches", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await addDoc(collection(db, "matches"), { ...newMatchData, createdAt: serverTimestamp() })
      } catch (err) {
        console.error("[DataContext] addMatch error:", err)
      }
    }
  }

  const deleteMatch = async (matchId: string) => {
    setMatches((prev) => {
      const updated = prev.filter((m) => m.id !== matchId)
      localStorage.setItem("imrt_matches", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await deleteDoc(doc(db, "matches", matchId))
      } catch (err) {
        console.error("[DataContext] deleteMatch error:", err)
      }
    }
  }

  const addScorer = async (newScorerData: Omit<Scorer, "id">) => {
    const localScorer = { ...newScorerData, id: `scorer_${Date.now()}` }
    setScorers((prev) => {
      const updated = [...prev, localScorer]
      localStorage.setItem("imrt_scorers", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await addDoc(collection(db, "scorers"), { ...newScorerData, createdAt: serverTimestamp() })
      } catch (err) {
        console.error("[DataContext] addScorer error:", err)
      }
    }
  }

  const deleteScorer = async (scorerId: string) => {
    setScorers((prev) => {
      const updated = prev.filter((s) => s.id !== scorerId)
      localStorage.setItem("imrt_scorers", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await deleteDoc(doc(db, "scorers", scorerId))
      } catch (err) {
        console.error("[DataContext] deleteScorer error:", err)
      }
    }
  }

  const updateTournamentSettings = async (newSettings: Partial<TournamentSettings>) => {
    setTournament((prev) => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem("imrt_tournament", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      try {
        await setDoc(doc(db, "tournament", "config"), { ...tournament, ...newSettings }, { merge: true })
      } catch (err) {
        console.error("[DataContext] updateTournamentSettings error:", err)
      }
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
