import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
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
  approveTeam: (id: string, approved: boolean) => Promise<void>
  updateMatch: (id: string, data: Partial<Match>) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(mockTeams)
  const [matches, setMatches] = useState<Match[]>(mockMatches)
  const [scorers] = useState<Scorer[]>(mockScorers)

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) => {
      if (!snap.empty) setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team))
    })
    const unsubMatches = onSnapshot(collection(db, "matches"), (snap) => {
      if (!snap.empty) setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match))
    })
    return () => {
      unsubTeams()
      unsubMatches()
    }
  }, [])

  const value = useMemo<DataContextValue>(() => {
    const getTeam = (id: string) => teams.find((t) => t.id === id)

    const addTeam = async (team: Team) => {
      setTeams((prev) => [...prev, team])
      if (isFirebaseConfigured && db) {
        const { id, ...rest } = team
        await addDoc(collection(db, "teams"), rest)
      }
    }

    const approveTeam = async (id: string, approved: boolean) => {
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, approved } : t)))
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "teams", id), { approved })
      }
    }

    const updateMatch = async (id: string, data: Partial<Match>) => {
      setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "matches", id), data, { merge: true })
      }
    }

    return { teams, matches, scorers, usingMock: !isFirebaseConfigured, getTeam, addTeam, approveTeam, updateMatch }
  }, [teams, matches, scorers])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
