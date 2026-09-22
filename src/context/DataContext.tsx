import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react"
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
  writeBatch,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { TOURNAMENT } from "@/lib/mockData"
import { useAuth } from "@/context/AuthContext"
import type {
  Team,
  Match,
  Scorer,
  PlayerStat,
  TournamentSettings,
  Category,
  MatchSource,
} from "@/lib/types"

const STORAGE_VERSION = "v2"
const KEY = (k: string) => `imrt_${STORAGE_VERSION}_${k}`

interface DataContextType {
  teams: Team[]
  approvedTeams: Team[]
  matches: Match[]
  scorers: Scorer[]
  playerStats: PlayerStat[]
  tournament: TournamentSettings
  addTeam: (
    team: Omit<
      Team,
      "id" | "wins" | "losses" | "pointsFor" | "pointsAgainst" | "approved"
    >
  ) => Promise<Team>
  createTeam: (team: Omit<Team, "id">) => Promise<Team>
  updateTeam: (teamId: string, patch: Partial<Team>) => Promise<void>
  deleteTeam: (teamId: string) => Promise<void>
  updateTeamStatus: (teamId: string, approved: boolean) => Promise<void>
  updateMatchScore: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    status: Match["status"]
  ) => Promise<void>
  updateMatch: (matchId: string, patch: Partial<Match>) => Promise<void>
  addMatch: (match: Omit<Match, "id">) => Promise<void>
  deleteMatch: (matchId: string) => Promise<void>
  /**
   * Delete every match in `category` whose `source` matches, then create
   * the provided list atomically. Manually-scheduled matches are preserved.
   */
  replaceGeneratedMatches: (
    category: Category,
    source: MatchSource,
    newMatches: Omit<Match, "id">[]
  ) => Promise<{ deleted: number; created: number }>
  addScorer: (scorer: Omit<Scorer, "id">) => Promise<void>
  deleteScorer: (scorerId: string) => Promise<void>
  updateTournamentSettings: (
    settings: Partial<TournamentSettings>
  ) => Promise<void>
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
      if (
        k &&
        k.startsWith("imrt_") &&
        !k.startsWith(`imrt_${STORAGE_VERSION}_`)
      ) {
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

/**
 * Strip `undefined` values from a write patch.
 *
 * Firestore's `ignoreUndefinedProperties` setting makes `undefined` a no-op,
 * but we still strip defensively so callers can reason about exactly what
 * gets sent over the wire. `deleteField()` sentinels are preserved because
 * they are not `undefined`.
 */
function cleanPatch<T extends object>(patch: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  const isAdmin = role === "admin"

  const [teams, setTeams] = useState<Team[]>(() => readLocal("teams", []))
  const [matches, setMatches] = useState<Match[]>(() => readLocal("matches", []))
  const [scorers, setScorers] = useState<Scorer[]>(() => readLocal("scorers", []))
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>(() =>
    readLocal("player_stats", [])
  )
  const [tournament, setTournament] = useState<TournamentSettings>(() =>
    readLocal("tournament", DEFAULT_TOURNAMENT)
  )

  // Only true when Firebase itself is not configured. Never flipped at
  // runtime by a permission error — a single 403 on one collection must
  // not disable the entire app's realtime layer.
  const useLocalOnly = !isFirebaseConfigured

  useEffect(() => {
    migrateStorage()
    // Remove the stale local-only flag left behind by the old implementation
    // so anyone who got stuck in local-only mode heals on next load.
    try {
      localStorage.removeItem(KEY("use_local"))
    } catch {
      /* noop */
    }
  }, [])

  /**
   * Non-fatal Firestore error handler. Logs the failure with collection
   * context but does NOT change app mode. A permission error on
   * `scorers` for a public user is expected; it must not lock the user
   * out of `teams`/`matches`.
   */
  const handleFirestoreError = (err: any, source: string) => {
    if (err?.code === "permission-denied") {
      console.warn(`[DataContext] Permission denied reading/writing "${source}".`)
    } else {
      console.error(`[DataContext] Firestore error on "${source}":`, err)
    }
  }

  useEffect(() => {
    if (!db || useLocalOnly) return
    const firestore = db
    ;(async () => {
      try {
        const snap = await getDocs(collection(firestore, "tournament"))
        if (snap.empty) {
          await setDoc(doc(firestore, "tournament", "config"), {
            ...DEFAULT_TOURNAMENT,
          })
        }
      } catch (err) {
        handleFirestoreError(err, "tournament bootstrap")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocalOnly])

  useEffect(() => {
    if (!db || useLocalOnly) return
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
      (err) => handleFirestoreError(err, "teams")
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
      (err) => handleFirestoreError(err, "matches")
    )

    // Scorers collection is admin-only. Public users must not subscribe,
    // or Firestore rejects the read. Previously that rejection flipped the
    // whole app into local-only mode.
    const unsubScorers = isAdmin
      ? onSnapshot(
          collection(firestore, "scorers"),
          (snap) => {
            const list = snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Omit<Scorer, "id">) }) as Scorer
            )
            setScorers(list)
            localStorage.setItem(KEY("scorers"), JSON.stringify(list))
          },
          (err) => handleFirestoreError(err, "scorers")
        )
      : null

    const unsubPlayerStats = onSnapshot(
      collection(firestore, "playerStats"),
      (snap) => {
        const list = snap.docs.map(
          (d) =>
            ({ id: d.id, ...(d.data() as Omit<PlayerStat, "id">) }) as PlayerStat
        )
        setPlayerStats(list)
        localStorage.setItem(KEY("player_stats"), JSON.stringify(list))
      },
      (err) => handleFirestoreError(err, "playerStats")
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
      (err) => handleFirestoreError(err, "tournament")
    )

    return () => {
      unsubTeams()
      unsubMatches()
      if (unsubScorers) unsubScorers()
      unsubPlayerStats()
      unsubTournament()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocalOnly, isAdmin])

  const addTeam: DataContextType["addTeam"] = async (newTeamData) => {
    const newTeam: Team = {
      ...newTeamData,
      id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: false,
    }

    setTeams((prev) => {
      const updated = [newTeam, ...prev]
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })

    if (db && !useLocalOnly) {
      const firestore = db
      try {
        const { id, ...payload } = newTeam
        await setDoc(doc(firestore, "teams", id), {
          ...payload,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        handleFirestoreError(err, "teams:addTeam")
        throw err
      }
    }
    return newTeam
  }

  const createTeam: DataContextType["createTeam"] = async (teamData) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }
    setTeams((prev) => {
      const updated = [newTeam, ...prev]
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        const { id, ...payload } = newTeam
        await setDoc(doc(firestore, "teams", id), {
          ...payload,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        handleFirestoreError(err, "teams:createTeam")
        throw err
      }
    }
    return newTeam
  }

  const updateTeam = async (teamId: string, patch: Partial<Team>) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, ...patch } : t))
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", teamId), cleanPatch(patch), {
          merge: true,
        })
      } catch (err) {
        handleFirestoreError(err, "teams:updateTeam")
        throw err
      }
    }
  }

  const deleteTeam = async (teamId: string) => {
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
    setMatches((prev) => {
      const updated = prev.map((m) => {
        if (m.teamAId === teamId) return { ...m, teamAId: "TBD" }
        if (m.teamBId === teamId) return { ...m, teamBId: "TBD" }
        return m
      })
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
      return updated
    })

    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await deleteDoc(doc(firestore, "teams", teamId))

        const statsQuery = query(
          collection(firestore, "playerStats"),
          where("teamId", "==", teamId)
        )
        const statsSnap = await getDocs(statsQuery)
        await Promise.all(statsSnap.docs.map((d) => deleteDoc(d.ref)))

        const matchSnap = await getDocs(collection(firestore, "matches"))
        const affected = matchSnap.docs.filter((d) => {
          const m = d.data() as Match
          return m.teamAId === teamId || m.teamBId === teamId
        })
        await Promise.all(
          affected.map((d) => {
            const m = d.data() as Match
            const patch: Partial<Match> = {}
            if (m.teamAId === teamId) patch.teamAId = "TBD"
            if (m.teamBId === teamId) patch.teamBId = "TBD"
            return setDoc(d.ref, patch, { merge: true })
          })
        )
      } catch (err) {
        handleFirestoreError(err, "teams:deleteTeam")
        throw err
      }
    }
  }

  const updateTeamStatus = async (teamId: string, approved: boolean) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, approved } : t))
      localStorage.setItem(KEY("teams"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "teams", teamId), { approved }, { merge: true })
      } catch (err) {
        handleFirestoreError(err, "teams:updateStatus")
        throw err
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
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(
          doc(firestore, "matches", matchId),
          { scoreA, scoreB, status },
          { merge: true }
        )
      } catch (err) {
        handleFirestoreError(err, "matches:updateScore")
        throw err
      }
    }
  }

  const updateMatch = async (matchId: string, patch: Partial<Match>) => {
    setMatches((prev) => {
      const updated = prev.map((m) => (m.id === matchId ? { ...m, ...patch } : m))
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "matches", matchId), cleanPatch(patch), {
          merge: true,
        })
      } catch (err) {
        handleFirestoreError(err, "matches:updateMatch")
        // Rethrow so the caller (e.g. MatchFormModal) can surface the failure
        // instead of closing as if the save succeeded.
        throw err
      }
    }
  }

  const addMatch = async (newMatchData: Omit<Match, "id">) => {
    const localMatch: Match = {
      ...newMatchData,
      source: newMatchData.source ?? "manual",
      id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }
    setMatches((prev) => {
      const updated = [localMatch, ...prev]
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "matches", localMatch.id), {
          ...cleanPatch(newMatchData),
          source: newMatchData.source ?? "manual",
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        handleFirestoreError(err, "matches:addMatch")
        throw err
      }
    }
  }

  const deleteMatch = async (matchId: string) => {
    setMatches((prev) => {
      const updated = prev.filter((m) => m.id !== matchId)
      localStorage.setItem(KEY("matches"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await deleteDoc(doc(firestore, "matches", matchId))
      } catch (err) {
        handleFirestoreError(err, "matches:deleteMatch")
        throw err
      }
    }
  }

  const replaceGeneratedMatches: DataContextType["replaceGeneratedMatches"] =
    async (category, source, newMatches) => {
      const toDelete = matches.filter(
        (m) => m.category === category && m.source === source
      )
      const ts = Date.now()
      const toCreate: Match[] = newMatches.map((m, i) => ({
        ...m,
        source,
        id: `match_${ts}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      }))

      setMatches((prev) => {
        const deleteIds = new Set(toDelete.map((m) => m.id))
        const filtered = prev.filter((m) => !deleteIds.has(m.id))
        const updated = [...toCreate, ...filtered]
        localStorage.setItem(KEY("matches"), JSON.stringify(updated))
        return updated
      })

      if (db && !useLocalOnly) {
        const firestore = db
        try {
          const batch = writeBatch(firestore)
          for (const m of toDelete) {
            batch.delete(doc(firestore, "matches", m.id))
          }
          for (const m of toCreate) {
            const { id, ...payload } = m
            batch.set(doc(firestore, "matches", id), {
              ...cleanPatch(payload),
              createdAt: serverTimestamp(),
            })
          }
          await batch.commit()
        } catch (err) {
          handleFirestoreError(err, "matches:replaceGenerated")
          throw err
        }
      }

      return { deleted: toDelete.length, created: toCreate.length }
    }

  const addScorer = async (newScorerData: Omit<Scorer, "id">) => {
    const localScorer: Scorer = {
      ...newScorerData,
      id: `scorer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }
    setScorers((prev) => {
      const updated = [...prev, localScorer]
      localStorage.setItem(KEY("scorers"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(doc(firestore, "scorers", localScorer.id), {
          ...cleanPatch(newScorerData),
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        handleFirestoreError(err, "scorers:addScorer")
        throw err
      }
    }
  }

  const deleteScorer = async (scorerId: string) => {
    setScorers((prev) => {
      const updated = prev.filter((s) => s.id !== scorerId)
      localStorage.setItem(KEY("scorers"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await deleteDoc(doc(firestore, "scorers", scorerId))
      } catch (err) {
        handleFirestoreError(err, "scorers:deleteScorer")
        throw err
      }
    }
  }

  const updateTournamentSettings = async (
    newSettings: Partial<TournamentSettings>
  ) => {
    setTournament((prev) => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem(KEY("tournament"), JSON.stringify(updated))
      return updated
    })
    if (db && !useLocalOnly) {
      const firestore = db
      try {
        await setDoc(
          doc(firestore, "tournament", "config"),
          cleanPatch(newSettings),
          { merge: true }
        )
      } catch (err) {
        handleFirestoreError(err, "tournament:updateSettings")
        throw err
      }
    }
  }

  const getTeam = (id: string) => teams.find((t) => t.id === id)

  const approvedTeams = useMemo(
    () => teams.filter((t) => t.approved),
    [teams]
  )

  return (
    <DataContext.Provider
      value={{
        teams,
        approvedTeams,
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
        updateMatch,
        addMatch,
        deleteMatch,
        replaceGeneratedMatches,
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