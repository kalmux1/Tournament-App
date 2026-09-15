import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { mockTeams, mockMatches, mockScorers } from "@/lib/mockData"
import type { Team, Match, Scorer } from "@/lib/types"

interface DataContextValue {
  teams: Team[]
  matches: Match[]
  scorers: Scorer[]
  usingMock: boolean
  getTeam: (id: string) => Team | undefined
  addTeam: (team: Team) => Promise<void>
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
  approveTeam: (id: string, approved: boolean) => Promise<void>
  addMatch: (match: Match) => Promise<void>
  updateMatch: (id: string, data: Partial<Match>) => Promise<void>
  deleteMatch: (id: string) => Promise<void>
  resetAllData: () => void
  restoreSampleData: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem("imrt_teams")
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
      return mockTeams
    } catch {
      return mockTeams
    }
  })
  
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem("imrt_matches")
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
      return mockMatches
    } catch {
      return mockMatches
    }
  })

  const [scorers] = useState<Scorer[]>(mockScorers)

  useEffect(() => {
    try {
      localStorage.setItem("imrt_teams", JSON.stringify(teams))
    } catch (e) {
      console.error("Failed to save teams to localStorage", e)
    }
  }, [teams])

  useEffect(() => {
    try {
      localStorage.setItem("imrt_matches", JSON.stringify(matches))
    } catch (e) {
      console.error("Failed to save matches to localStorage", e)
    }
  }, [matches])

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    try {
      const unsubTeams = onSnapshot(collection(db, "teams"), (snap) => {
        if (!snap.empty) {
          setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team))
        }
      }, (err) => {
        console.warn("Firestore teams snapshot warning:", err)
      })

      const unsubMatches = onSnapshot(collection(db, "matches"), (snap) => {
        if (!snap.empty) {
          setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match))
        }
      }, (err) => {
        console.warn("Firestore matches snapshot warning:", err)
      })

      return () => {
        unsubTeams()
        unsubMatches()
      }
    } catch (e) {
      console.error("Error setting up Firebase snapshots:", e)
    }
  }, [])

  const value = useMemo<DataContextValue>(() => {
    const getTeam = (id: string) => teams.find((t) => t.id === id)

    const addTeam = async (team: Team) => {
      setTeams((prev) => [team, ...prev])
      if (isFirebaseConfigured && db) {
        try {
          const { id, ...rest } = team
          await addDoc(collection(db, "teams"), rest)
        } catch (e) {
          console.error("Failed to add team to Firestore:", e)
        }
      }
    }

    const updateTeam = async (id: string, data: Partial<Team>) => {
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, "teams", id), data, { merge: true })
        } catch (e) {
          console.error("Failed to update team in Firestore:", e)
        }
      }
    }

    const deleteTeam = async (id: string) => {
      setTeams((prev) => prev.filter((t) => t.id !== id))
      if (isFirebaseConfigured && db) {
        try {
          await deleteDoc(doc(db, "teams", id))
        } catch (e) {
          console.error("Failed to delete team from Firestore:", e)
        }
      }
    }

    const approveTeam = async (id: string, approved: boolean) => {
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, approved } : t)))
      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, "teams", id), { approved })
        } catch (e) {
          console.error("Failed to update team approval in Firestore:", e)
        }
      }
    }

    const addMatch = async (match: Match) => {
      setMatches((prev) => [match, ...prev])
      if (isFirebaseConfigured && db) {
        try {
          const { id, ...rest } = match
          await addDoc(collection(db, "matches"), rest)
        } catch (e) {
          console.error("Failed to add match to Firestore:", e)
        }
      }
    }

    const updateMatch = async (id: string, data: Partial<Match>) => {
      setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, "matches", id), data, { merge: true })
        } catch (e) {
          console.error("Failed to update match in Firestore:", e)
        }
      }
    }

    const deleteMatch = async (id: string) => {
      setMatches((prev) => prev.filter((m) => m.id !== id))
      if (isFirebaseConfigured && db) {
        try {
          await deleteDoc(doc(db, "matches", id))
        } catch (e) {
          console.error("Failed to delete match from Firestore:", e)
        }
      }
    }

    const resetAllData = () => {
      setTeams([])
      setMatches([])
      localStorage.setItem("imrt_teams", JSON.stringify([]))
      localStorage.setItem("imrt_matches", JSON.stringify([]))
      localStorage.removeItem("imrt_live_game")
    }

    const restoreSampleData = () => {
      setTeams(mockTeams)
      setMatches(mockMatches)
      localStorage.setItem("imrt_teams", JSON.stringify(mockTeams))
      localStorage.setItem("imrt_matches", JSON.stringify(mockMatches))
    }

    return {
      teams,
      matches,
      scorers,
      usingMock: !isFirebaseConfigured,
      getTeam,
      addTeam,
      updateTeam,
      deleteTeam,
      approveTeam,
      addMatch,
      updateMatch,
      deleteMatch,
      resetAllData,
      restoreSampleData,
    }
  }, [teams, matches, scorers])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
