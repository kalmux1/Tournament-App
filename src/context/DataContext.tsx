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
  serverTimestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import {
  mockTeams,
  mockMatches,
  mockScorers,
  mockPlayerStats,
  TOURNAMENT,
} from "@/lib/mockData"
import type { Team, Match, Scorer, PlayerStat, TournamentSettings } from "@/lib/types"

interface DataContextType {
  teams: Team[]
  matches: Match[]
  scorers: Scorer[]
  playerStats: PlayerStat[]
  tournament: TournamentSettings
  addTeam: (
    team: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">
  ) => Promise<void>
  updateTeamStatus: (teamId: string, approved: boolean) => Promise<void>
  updateMatchScore: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    status: Match["status"]
  ) => Promise<void>
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

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(() => readLocal("imrt_teams", mockTeams))
  const [matches, setMatches] = useState<Match[]>(() => readLocal("imrt_matches", mockMatches))
  const [scorers, setScorers] = useState<Scorer[]>(() => readLocal("imrt_scorers", mockScorers))
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>(() =>
    readLocal("imrt_player_stats", mockPlayerStats)
  )
  const [tournament, setTournament] = useState<TournamentSettings>(() =>
    readLocal("imrt_tournament", DEFAULT_TOURNAMENT)
  )

  const [useLocalOnly, setUseLocalOnly] = useState<boolean>(
    () => localStorage.getItem("imrt_use_local") === "true" || !isFirebaseConfigured
  )

  const fallbackToLocal = (err: any) => {
    if (err?.code === "permission-denied" || err?.message?.includes("insufficient permissions")) {
      console.warn("[DataContext] Switching to local-only mode:", err.code || err.message)
      setUseLocalOnly(true)
      localStorage.setItem("imrt_use_local", "true")
    } else {
      console.error("[DataContext] Firestore error:", err)
    }
  }

  // --- Effect 1: one-time seeding ---
  useEffect(() => {
    if (!db || !isFirebaseConfigured || useLocalOnly) return

    // Capture the non-null Firestore instance so the async closure keeps the type.
    const firestore = db
    let cancelled = false

    const seed = async () => {
      try {
        const teamsSnap = await getDocs(collection(firestore, "teams"))
        if (cancelled) return
        if (teamsSnap.empty) {
          for (const t of mockTeams) {
            await setDoc(doc(firestore, "teams", t.id), { ...t })
          }
        }

        const matchesSnap = await getDocs(collection(firestore, "matches"))
        if (cancelled) return
        if (matchesSnap.empty) {
          for (const m of mockMatches) {
            const { id, ...rest } = m
            await setDoc(doc(firestore, "matches", id), { ...rest })
          }
        }

        const scorersSnap = await getDocs(collection(firestore, "scorers"))
        if (cancelled) return
        if (scorersSnap.empty) {
          for (const s of mockScorers) {
            await setDoc(doc(firestore, "scorers", s.id), { ...s })
          }
        }

        const statsSnap = await getDocs(collection(firestore, "playerStats"))
        if (cancelled) return
        if (statsSnap.empty) {
          for (const ps of mockPlayerStats) {
            await setDoc(doc(firestore, "playerStats", ps.id), { ...ps })
          }
        }

        const tourSnap = await getDocs(collection(firestore, "tournament"))
        if (cancelled) return
        if (tourSnap.empty) {
          await setDoc(doc(firestore, "tournament", "config"), { ...DEFAULT_TOURNAMENT })
        }
      } catch (err) {
        fallbackToLocal(err)
      }
    }

    seed()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocalOnly])

  // --- Effect 2: realtime listeners ---
  useEffect(() => {
    if (!db || !isFirebaseConfigured || useLocalOnly) return

    const firestore = db

    const unsubTeams = onSnapshot(
      collection(firestore, "teams"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }) as Team
        )
        list.sort((a, b) => (a.approved === b.approved ? 0 : a.approved ? 1 : -1))
        if (list.length > 0) {
          setTeams(list)
          localStorage.setItem("imrt_teams", JSON.stringify(list))
        }
      },
      fallbackToLocal
    )

    const unsubMatches = onSnapshot(
      collection(firestore, "matches"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }) as Match
        )
        if (list.length > 0) {
          setMatches(list)
          localStorage.setItem("imrt_matches", JSON.stringify(list))
        }
      },
      fallbackToLocal
    )

    const unsubScorers = onSnapshot(
      collection(firestore, "scorers"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Scorer, "id">) }) as Scorer
        )
        if (list.length > 0) {
          setScorers(list)
          localStorage.setItem("imrt_scorers", JSON.stringify(list))
        }
      },
      fallbackToLocal
    )

    const unsubPlayerStats = onSnapshot(
      collection(firestore, "playerStats"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<PlayerStat, "id">) }) as PlayerStat
        )
        if (list.length > 0) {
          setPlayerStats(list)
          localStorage.setItem("imrt_player_stats", JSON.stringify(list))
        }
      },
      fallbackToLocal
    )

    const unsubTournament = onSnapshot(
      doc(firestore, "tournament", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as TournamentSettings
          setTournament(data)
          localStorage.setItem("imrt_tournament", JSON.stringify(data))
        }
      },
      fallbackToLocal
    )

    return () => {
      unsubTeams()
      unsubMatches()
      unsubScorers()
      unsubPlayerStats()
      unsubTournament()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocalOnly])

  const addTeam: DataContextType["addTeam"] = async (newTeamData) => {
    const newTeam: Team = {
      ...newTeamData,
      id: `team_${Date.now()}`,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: false,
    }

    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", newTeam.id), {
          ...newTeam,
          createdAt: serverTimestamp(),
        })
        return
      } catch (err) {
        fallbackToLocal(err)
      }
    }

    setTeams((prev) => {
      const updated = [newTeam, ...prev]
      localStorage.setItem("imrt_teams", JSON.stringify(updated))
      return updated
    })
  }

  const updateTeamStatus = async (teamId: string, approved: boolean) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, approved } : t))
      localStorage.setItem("imrt_teams", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", teamId), { approved }, { merge: true })
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  const updateMatchScore: DataContextType["updateMatchScore"] = async (
    matchId,
    scoreA,
    scoreB,
    status
  ) => {
    setMatches((prev) => {
      const updated = prev.map((m) =>
        m.id === matchId ? { ...m, scoreA, scoreB, status } : m
      )
      localStorage.setItem("imrt_matches", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(
          doc(firestore, "matches", matchId),
          { scoreA, scoreB, status },
          { merge: true }
        )
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  const addMatch = async (newMatchData: Omit<Match, "id">) => {
    const localMatch: Match = { ...newMatchData, id: `match_${Date.now()}` }
    setMatches((prev) => {
      const updated = [localMatch, ...prev]
      localStorage.setItem("imrt_matches", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "matches", localMatch.id), {
          ...newMatchData,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        fallbackToLocal(err)
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
      const firestore = db
      try {
        await deleteDoc(doc(firestore, "matches", matchId))
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  const addScorer = async (newScorerData: Omit<Scorer, "id">) => {
    const localScorer: Scorer = { ...newScorerData, id: `scorer_${Date.now()}` }
    setScorers((prev) => {
      const updated = [...prev, localScorer]
      localStorage.setItem("imrt_scorers", JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "scorers", localScorer.id), {
          ...newScorerData,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        fallbackToLocal(err)
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
      const firestore = db
      try {
        await deleteDoc(doc(firestore, "scorers", scorerId))
      } catch (err) {
        fallbackToLocal(err)
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
      const firestore = db
      try {
        await setDoc(
          doc(firestore, "tournament", "config"),
          { ...newSettings },
          { merge: true }
        )
      } catch (err) {
        fallbackToLocal(err)
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
        playerStats,
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
  if (!context) throw new Error("useData must be used within a DataProvider")
  return context
}