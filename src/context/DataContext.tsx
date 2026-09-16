import React, { createContext, useContext, useState, useEffect } from "react"
import {
  collection,
  doc,
  onSnapshot,
  deleteDoc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { TOURNAMENT } from "@/lib/mockData"
import type { Team, Match, Scorer, PlayerStat, TournamentSettings } from "@/lib/types"

const STORAGE_VERSION = "v2"
const KEY = (k: string) => `imrt_${STORAGE_VERSION}_${k}`

interface DataContextType {
  teams: Team[]
  matches: Match[]
  scorers: Scorer[]
  playerStats: PlayerStat[]
  tournament: TournamentSettings
  addTeam: (
    team: Omit<Team, "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved">
  ) => Promise<void>
  createTeam: (team: Omit<Team, "id">) => Promise<void>
  updateTeam: (teamId: string, patch: Partial<Team>) => Promise<void>
  deleteTeam: (teamId: string) => Promise<void>
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
  venue: TOURNAMENT.venue,
  city: TOURNAMENT.city,
  tipOff: TOURNAMENT.tipOff,
  contactEmail: TOURNAMENT.contactEmail,
}

function migrateStorage() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith("imrt_") && !k.startsWith(`imrt_${STORAGE_VERSION}_`)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY(key))
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(() => readLocal("teams", []))
  const [matches, setMatches] = useState<Match[]>(() => readLocal("matches", []))
  const [scorers, setScorers] = useState<Scorer[]>(() => readLocal("scorers", []))
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>(() =>
    readLocal("player_stats", [])
  )
  const [tournament, setTournament] = useState<TournamentSettings>(() =>
    readLocal("tournament", DEFAULT_TOURNAMENT)
  )

  const [useLocalOnly, setUseLocalOnly] = useState<boolean>(
    () => localStorage.getItem(KEY("use_local")) === "true" || !isFirebaseConfigured
  )

  useEffect(() => {
    migrateStorage()
  }, [])

  const fallbackToLocal = (err: any) => {
    if (err?.code === "permission-denied") {
      console.warn("[DataContext] Permission denied — switching to local-only mode")
      setUseLocalOnly(true)
      localStorage.setItem(KEY("use_local"), "true")
    } else {
      console.error("[DataContext] Firestore error:", err)
    }
  }

  useEffect(() => {
    if (!db || !isFirebaseConfigured || useLocalOnly) return
    const firestore = db
    ;(async () => {
      try {
        const snap = await getDocs(collection(firestore, "tournament"))
        if (snap.empty) {
          await setDoc(doc(firestore, "tournament", "config"), { ...DEFAULT_TOURNAMENT })
        }
      } catch (err) {
        fallbackToLocal(err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocalOnly])

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
        setTeams(list)
        localStorage.setItem(KEY("teams"), JSON.stringify(list))
      },
      fallbackToLocal
    )

    const unsubMatches = onSnapshot(
      collection(firestore, "matches"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }) as Match
        )
        setMatches(list)
        localStorage.setItem(KEY("matches"), JSON.stringify(list))
      },
      fallbackToLocal
    )

    const unsubScorers = onSnapshot(
      collection(firestore, "scorers"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Scorer, "id">) }) as Scorer
        )
        setScorers(list)
        localStorage.setItem(KEY("scorers"), JSON.stringify(list))
      },
      fallbackToLocal
    )

    const unsubPlayerStats = onSnapshot(
      collection(firestore, "playerStats"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<PlayerStat, "id">) }) as PlayerStat
        )
        setPlayerStats(list)
        localStorage.setItem(KEY("player_stats"), JSON.stringify(list))
      },
      fallbackToLocal
    )

    const unsubTournament = onSnapshot(
      doc(firestore, "tournament", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as TournamentSettings
          setTournament(data)
          localStorage.setItem(KEY("tournament"), JSON.stringify(data))
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
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
  }

  const createTeam = async (teamData: Omit<Team, "id">) => {
    const newTeam: Team = { ...teamData, id: `team_${Date.now()}` }
    setTeams((prev) => {
      const updated = [newTeam, ...prev]
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", newTeam.id), {
          ...newTeam,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  const updateTeam = async (teamId: string, patch: Partial<Team>) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, ...patch } : t))
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", teamId), patch, { merge: true })
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  /**
   * Delete a team AND cascade-delete all related playerStats documents.
   * Without this, deleted teams leave orphaned MVP-race entries.
   */
  const deleteTeam = async (teamId: string) => {
    // 1. Local state — remove team + related stats
    setTeams((prev) => {
      const updated = prev.filter((t) => t.id !== teamId)
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    setPlayerStats((prev) => {
      const updated = prev.filter((ps) => ps.teamId !== teamId)
      localStorage.setItem(KEY("player_stats"), JSON.stringify(updated))
      return updated
    })

    // 2. Firestore — delete team doc + all playerStats with matching teamId
    if (db && isFirebaseConfigured && !useLocalOnly) {
      const firestore = db
      try {
        // Delete the team
        await deleteDoc(doc(firestore, "teams", teamId))

        // Cascade delete playerStats
        const statsQuery = query(
          collection(firestore, "playerStats"),
          where("teamId", "==", teamId)
        )
        const statsSnap = await getDocs(statsQuery)
        await Promise.all(statsSnap.docs.map((d) => deleteDoc(d.ref)))

        console.log(
          `[DataContext] Deleted team ${teamId} + ${statsSnap.docs.length} playerStats doc(s)`
        )
      } catch (err) {
        fallbackToLocal(err)
      }
    }
  }

  const updateTeamStatus = async (teamId: string, approved: boolean) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, approved } : t))
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("scorers"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("scorers"), JSON.stringify(updated))
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
      localStorage.setItem(KEY("tournament"), JSON.stringify(updated))
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
        createTeam,
        updateTeam,
        deleteTeam,
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