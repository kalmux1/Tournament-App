import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Award,
  LogOut,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  ArrowLeft,
  Shield,
  Flame,
  Activity,
  CircleCheck as CheckCircle2,
  RefreshCw,
  UserCheck,
  UserX,
  TriangleAlert as AlertTriangle,
  X,
  Save,
  Flag,
  Calendar,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useData } from "@/context/DataContext"
import type { Player, Match, MatchStatus, Category } from "@/lib/types"
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"

interface LivePlayer extends Player {
  points: number
  fouls: number
  subbedOut: boolean
}

interface LiveGameState {
  matchId?: string
  teamAId?: string
  teamBId?: string
  teamAName: string
  teamBName: string
  teamAColor: string
  teamBColor: string
  scoreA: number
  scoreB: number
  foulsA: number
  foulsB: number
  period: string
  gameTime: number
  isGameRunning: boolean
  shotTime: number
  isShotRunning: boolean
  shotClockPreset: number
  rosterA: LivePlayer[]
  rosterB: LivePlayer[]
  status: MatchStatus
  stage?: Match["stage"]
  date?: string
  time?: string
  court?: string
  category?: Category
  winnerId?: string
  endedAt?: number
}

const EMPTY_STATE: LiveGameState = {
  teamAName: "Select a match above",
  teamBName: "—",
  teamAColor: "#6B1728",
  teamBColor: "#0F172A",
  scoreA: 0,
  scoreB: 0,
  foulsA: 0,
  foulsB: 0,
  period: "Q1",
  gameTime: 600,
  isGameRunning: false,
  shotTime: 12,
  isShotRunning: false,
  shotClockPreset: 12,
  rosterA: [],
  rosterB: [],
  status: "live",
}

const STORAGE_KEY = "imrt_v2_live_game"

/**
 * Fields that get written to Firestore. Clocks are intentionally excluded —
 * they tick once per second locally and would otherwise cause a Firestore
 * write storm. They persist to localStorage so a page reload keeps position.
 */
function toSyncPayload(state: LiveGameState) {
  const {
    gameTime: _gt,
    isGameRunning: _igr,
    shotTime: _st,
    isShotRunning: _isr,
    ...rest
  } = state
  return rest
}

export default function ScorerDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { teams, matches } = useData()

  const [gameState, setGameState] = useState<LiveGameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return EMPTY_STATE
  })

  const [notification, setNotification] = useState<string | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showEndMatchModal, setShowEndMatchModal] = useState(false)

  const lastLocalEditRef = useRef<number>(0)
  const lastRemoteWriteRef = useRef<number>(0)
  const applyingRemoteRef = useRef<boolean>(false)
  const hasFinalizedRef = useRef<boolean>(false)
  // Snapshot of the last payload we actually pushed to Firestore. Used to
  // short-circuit no-op writes when the debounced effect re-runs with an
  // object that is referentially new but content-identical.
  const lastSyncedJsonRef = useRef<string>("")

  const isEnded = gameState.status === "finished"
  const hasMatch = Boolean(gameState.matchId)

  const selectableMatches = useMemo(
    () => matches.filter((m) => m.status === "upcoming" || m.status === "live"),
    [matches]
  )

  const showNotice = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 2500)
  }

  const loadMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    const teamA = teams.find((t) => t.id === match.teamAId)
    const teamB = teams.find((t) => t.id === match.teamBId)

    const buildRoster = (teamRoster: Player[] | undefined): LivePlayer[] =>
      (teamRoster || []).map((p, idx) => ({
        ...p,
        points: 0,
        fouls: 0,
        subbedOut: idx >= 3,
      }))

    setGameState({
      matchId: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: teamA?.name || "TBD",
      teamBName: teamB?.name || "TBD",
      teamAColor: teamA?.color || "#6B1728",
      teamBColor: teamB?.color || "#0F172A",
      scoreA: match.scoreA ?? 0,
      scoreB: match.scoreB ?? 0,
      foulsA: 0,
      foulsB: 0,
      period: "Q1",
      gameTime: 600,
      isGameRunning: false,
      shotTime: 12,
      isShotRunning: false,
      shotClockPreset: 12,
      rosterA: buildRoster(teamA?.roster),
      rosterB: buildRoster(teamB?.roster),
      status: match.status === "finished" ? "finished" : "live",
      stage: match.stage,
      date: match.date,
      time: match.time,
      court: match.court,
      category: match.category,
    })
    hasFinalizedRef.current = false
    showNotice(`Loaded: ${teamA?.name} vs ${teamB?.name}`)
  }

  // Realtime mirror of the selected match doc
  useEffect(() => {
    if (!gameState.matchId || !db || !isFirebaseConfigured) return
    const firestore = db
    const unsub = onSnapshot(
      doc(firestore, "matches", gameState.matchId),
      (snap) => {
        if (!snap.exists()) return
        if (Date.now() - lastLocalEditRef.current < 1000) return
        const data = snap.data() as Partial<LiveGameState> & { updatedAt?: unknown }
        const { updatedAt: _u, ...rest } = data
        lastRemoteWriteRef.current = Date.now()
        applyingRemoteRef.current = true
        // Preserve local-only clocks while accepting remote score/roster changes.
        setGameState((prev) => ({
          ...prev,
          ...rest,
          gameTime: prev.gameTime,
          isGameRunning: prev.isGameRunning,
          shotTime: prev.shotTime,
          isShotRunning: prev.isShotRunning,
        }))
      },
      (err) => console.error("[Scorer] Firestore listen error:", err)
    )
    return () => unsub()
  }, [gameState.matchId])

  // Persist everything (including clocks) to localStorage for reload safety.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  // Debounced Firestore sync — triggered ONLY by meaningful state changes.
  //
  // We intentionally do NOT depend on `gameState` here. The clock effects
  // produce a brand new state object every second; depending on that object
  // would re-create `syncPayload` on every tick and fire a Firestore write
  // every ~400ms for the duration of the game. Instead we list the fields
  // that actually go over the wire. Array references (rosterA/rosterB) are
  // preserved across clock ticks because the tick handlers use spreads that
  // only replace `gameTime`/`shotTime`, so this dep list is stable.
  const syncPayload = useMemo(
    () => toSyncPayload(gameState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      gameState.matchId,
      gameState.teamAId,
      gameState.teamBId,
      gameState.teamAName,
      gameState.teamBName,
      gameState.teamAColor,
      gameState.teamBColor,
      gameState.scoreA,
      gameState.scoreB,
      gameState.foulsA,
      gameState.foulsB,
      gameState.period,
      gameState.rosterA,
      gameState.rosterB,
      gameState.status,
      gameState.stage,
      gameState.date,
      gameState.time,
      gameState.court,
      gameState.category,
      gameState.winnerId,
      gameState.endedAt,
    ]
  )

  useEffect(() => {
    if (!hasMatch || !db || !isFirebaseConfigured) return
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false
      return
    }
    if (Date.now() - lastRemoteWriteRef.current < 750) return

    // Skip if nothing actually changed since the last write.
    const json = JSON.stringify(syncPayload)
    if (json === lastSyncedJsonRef.current) return

    lastLocalEditRef.current = Date.now()
    const firestore = db
    const timer = setTimeout(async () => {
      try {
        await setDoc(
          doc(firestore, "matches", gameState.matchId!),
          { ...syncPayload, updatedAt: serverTimestamp() },
          { merge: true }
        )
        lastSyncedJsonRef.current = json
      } catch (err) {
        console.error("[Scorer] Firestore sync error:", err)
      }
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncPayload, hasMatch, gameState.matchId])

  // Game clock (local-only — not synced)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (gameState.isGameRunning && gameState.gameTime > 0) {
      interval = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          gameTime: Math.max(0, prev.gameTime - 1),
          isGameRunning: prev.gameTime - 1 > 0 ? prev.isGameRunning : false,
        }))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameState.isGameRunning, gameState.gameTime])

  // Shot clock (local-only — not synced)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (gameState.isShotRunning && gameState.shotTime > 0) {
      interval = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          shotTime: Math.max(0, prev.shotTime - 1),
          isShotRunning: prev.shotTime - 1 > 0 ? prev.isShotRunning : false,
        }))
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameState.isShotRunning, gameState.shotTime])

  const handleLogout = async () => {
    await logout()
    navigate("/scorer/login", { replace: true })
  }

  // --- Save Now ---
  const saveNow = async () => {
    if (!gameState.matchId) {
      showNotice("Select a match first")
      return
    }
    if (!db || !isFirebaseConfigured) {
      showNotice("Firestore offline — nothing saved")
      return
    }
    const firestore = db
    try {
      const json = JSON.stringify(syncPayload)
      await setDoc(
        doc(firestore, "matches", gameState.matchId),
        { ...syncPayload, updatedAt: serverTimestamp() },
        { merge: true }
      )
      lastSyncedJsonRef.current = json
      lastLocalEditRef.current = Date.now()
      showNotice("Scoreboard saved to Firestore")
    } catch (err) {
      console.error("[Scorer] manual save failed:", err)
      showNotice("Save failed — check console")
    }
  }

  // --- End Match (atomic batch write) ---
  const confirmEndMatch = async () => {
    if (hasFinalizedRef.current || !gameState.matchId || gameState.status === "finished") {
      setShowEndMatchModal(false)
      return
    }

    const winnerIsA = gameState.scoreA > gameState.scoreB
    const winnerIsB = gameState.scoreB > gameState.scoreA
    const tied = !winnerIsA && !winnerIsB

    const teamA = teams.find((t) => t.id === gameState.teamAId)
    const teamB = teams.find((t) => t.id === gameState.teamBId)
    const winnerId = winnerIsA ? teamA?.id : winnerIsB ? teamB?.id : undefined

    const finalState: LiveGameState = {
      ...gameState,
      isGameRunning: false,
      isShotRunning: false,
      status: "finished",
      winnerId,
      endedAt: Date.now(),
    }

    hasFinalizedRef.current = true
    setGameState(finalState)
    setShowEndMatchModal(false)

    if (db && isFirebaseConfigured && gameState.matchId) {
      const firestore = db
      try {
        const batch = writeBatch(firestore)

        // 1. Finalize match doc
        batch.set(
          doc(firestore, "matches", gameState.matchId),
          { ...toSyncPayload(finalState), updatedAt: serverTimestamp() },
          { merge: true }
        )

        // 2. Team standings
        if (teamA) {
          batch.set(
            doc(firestore, "teams", teamA.id),
            {
              wins: teamA.wins + (winnerIsA ? 1 : 0),
              losses: teamA.losses + (winnerIsB ? 1 : 0),
              pointsFor: teamA.pointsFor + gameState.scoreA,
              pointsAgainst: teamA.pointsAgainst + gameState.scoreB,
            },
            { merge: true }
          )
        }
        if (teamB) {
          batch.set(
            doc(firestore, "teams", teamB.id),
            {
              wins: teamB.wins + (winnerIsB ? 1 : 0),
              losses: teamB.losses + (winnerIsA ? 1 : 0),
              pointsFor: teamB.pointsFor + gameState.scoreB,
              pointsAgainst: teamB.pointsAgainst + gameState.scoreA,
            },
            { merge: true }
          )
        }

        // 3. Player stats (MVP race) — accumulative increments
        const scorersToWrite: Array<{ player: LivePlayer; teamId: string }> = []
        if (teamA) {
          finalState.rosterA.forEach((p) => {
            if (p.points > 0) scorersToWrite.push({ player: p, teamId: teamA.id })
          })
        }
        if (teamB) {
          finalState.rosterB.forEach((p) => {
            if (p.points > 0) scorersToWrite.push({ player: p, teamId: teamB.id })
          })
        }

        for (const { player, teamId } of scorersToWrite) {
          const statId = `${teamId}_${player.jersey}_${player.name.replace(/\s+/g, "_")}`
          batch.set(
            doc(firestore, "playerStats", statId),
            {
              playerName: player.name,
              teamId,
              points: increment(player.points),
              games: increment(1),
            },
            { merge: true }
          )
        }

        await batch.commit()
        lastLocalEditRef.current = Date.now()
      } catch (err) {
        console.error("[Scorer] end match failed:", err)
        hasFinalizedRef.current = false
        showNotice("End match failed — check console")
        return
      }
    }

    showNotice(
      tied
        ? "Match ended in a tie"
        : `Match ended — ${winnerIsA ? gameState.teamAName : gameState.teamBName} wins!`
    )
  }

  // --- Reopen Match (reverts standings + playerStats) ---
  const reopenMatch = async () => {
    if (!gameState.matchId) return

    const teamA = teams.find((t) => t.id === gameState.teamAId)
    const teamB = teams.find((t) => t.id === gameState.teamBId)
    const winnerIsA = gameState.winnerId === teamA?.id
    const winnerIsB = gameState.winnerId === teamB?.id

    if (db && isFirebaseConfigured) {
      const firestore = db
      try {
        const batch = writeBatch(firestore)

        if (teamA) {
          batch.set(
            doc(firestore, "teams", teamA.id),
            {
              wins: Math.max(0, teamA.wins - (winnerIsA ? 1 : 0)),
              losses: Math.max(0, teamA.losses - (winnerIsB ? 1 : 0)),
              pointsFor: Math.max(0, teamA.pointsFor - gameState.scoreA),
              pointsAgainst: Math.max(0, teamA.pointsAgainst - gameState.scoreB),
            },
            { merge: true }
          )
        }
        if (teamB) {
          batch.set(
            doc(firestore, "teams", teamB.id),
            {
              wins: Math.max(0, teamB.wins - (winnerIsB ? 1 : 0)),
              losses: Math.max(0, teamB.losses - (winnerIsA ? 1 : 0)),
              pointsFor: Math.max(0, teamB.pointsFor - gameState.scoreB),
              pointsAgainst: Math.max(0, teamB.pointsAgainst - gameState.scoreA),
            },
            { merge: true }
          )
        }

        // Decrement MVP stats for every scorer we recorded
        const rosters: Array<{ player: LivePlayer; teamId?: string }> = [
          ...gameState.rosterA.map((p) => ({ player: p, teamId: teamA?.id })),
          ...gameState.rosterB.map((p) => ({ player: p, teamId: teamB?.id })),
        ]
        for (const { player, teamId } of rosters) {
          if (!teamId || player.points <= 0) continue
          const statId = `${teamId}_${player.jersey}_${player.name.replace(/\s+/g, "_")}`
          batch.set(
            doc(firestore, "playerStats", statId),
            {
              points: increment(-player.points),
              games: increment(-1),
            },
            { merge: true }
          )
        }

        batch.set(
          doc(firestore, "matches", gameState.matchId),
          { status: "live", winnerId: null, endedAt: null, updatedAt: serverTimestamp() },
          { merge: true }
        )

        await batch.commit()
        lastLocalEditRef.current = Date.now()
      } catch (err) {
        console.error("[Scorer] reopen failed:", err)
        showNotice("Reopen failed — check console")
        return
      }
    }

    hasFinalizedRef.current = false
    setGameState((prev) => ({
      ...prev,
      status: "live",
      winnerId: undefined,
      endedAt: undefined,
    }))
    showNotice("Match reopened — standings and MVP stats reverted")
  }

  // --- Timers ---
  const toggleGameClock = () => {
    if (isEnded || !hasMatch) return
    setGameState((p) => ({ ...p, isGameRunning: !p.isGameRunning }))
  }
  const resetGameClock = () => {
    if (isEnded || !hasMatch) return
    setGameState((p) => ({ ...p, gameTime: 600, isGameRunning: false }))
    showNotice("Game clock reset to 10:00")
  }
  const addOneMinute = () => {
    if (isEnded || !hasMatch) return
    setGameState((p) => ({ ...p, gameTime: p.gameTime + 60 }))
    showNotice("Added +1:00 to Game Clock")
  }
  const toggleShotClock = () => {
    if (isEnded || !hasMatch) return
    setGameState((p) => ({ ...p, isShotRunning: !p.isShotRunning }))
  }
  const resetShotClock = (val: number) => {
    if (isEnded || !hasMatch) return
    setGameState((p) => ({ ...p, shotTime: val, shotClockPreset: val, isShotRunning: true }))
    showNotice(`Shot clock reset to ${val}s`)
  }

  // --- Scoring ---
  const adjustTeamScoreDirect = (team: "A" | "B", delta: number) => {
    if (isEnded || !hasMatch) return
    const scoreKey = team === "A" ? "scoreA" : "scoreB"
    setGameState((prev) => {
      const teamName = team === "A" ? prev.teamAName : prev.teamBName
      const updatedScore = Math.max(0, prev[scoreKey] + delta)
      showNotice(`${teamName} score updated to ${updatedScore}`)
      return { ...prev, [scoreKey]: updatedScore }
    })
  }

  const modifyPlayerPoints = (team: "A" | "B", playerIndex: number, delta: number) => {
    if (isEnded || !hasMatch) return
    // FIBA 3x3: only 1- and 2-point baskets exist. Guard against any future
    // caller (or stale UI) trying to add 3.
    if (delta !== 1 && delta !== 2 && delta !== -1) return
    const rosterKey = team === "A" ? "rosterA" : "rosterB"
    const scoreKey = team === "A" ? "scoreA" : "scoreB"
    setGameState((prev) => {
      const updatedRoster = prev[rosterKey].map((p, idx) => {
        if (idx !== playerIndex) return p
        const next = Math.max(0, p.points + delta)
        showNotice(`${p.name}: ${delta > 0 ? `+${delta}` : delta} pt`)
        return { ...p, points: next }
      })
      return {
        ...prev,
        [scoreKey]: Math.max(0, prev[scoreKey] + delta),
        [rosterKey]: updatedRoster,
      }
    })
  }

  const adjustPlayerFouls = (team: "A" | "B", playerIndex: number, delta: number) => {
    if (isEnded || !hasMatch) return
    const rosterKey = team === "A" ? "rosterA" : "rosterB"
    const foulKey = team === "A" ? "foulsA" : "foulsB"
    setGameState((prev) => {
      const updatedRoster = prev[rosterKey].map((p, idx) => {
        if (idx !== playerIndex) return p
        const newFouls = Math.max(0, Math.min(5, p.fouls + delta))
        return { ...p, fouls: newFouls }
      })
      return {
        ...prev,
        [foulKey]: Math.max(0, prev[foulKey] + delta),
        [rosterKey]: updatedRoster,
      }
    })
  }

  const toggleSub = (team: "A" | "B", playerIndex: number) => {
    if (isEnded || !hasMatch) return
    const rosterKey = team === "A" ? "rosterA" : "rosterB"
    setGameState((prev) => {
      const updatedRoster = prev[rosterKey].map((p, idx) => {
        if (idx !== playerIndex) return p
        const nextSubState = !p.subbedOut
        showNotice(`${p.name} is now ${nextSubState ? "on Bench" : "On Court"}`)
        return { ...p, subbedOut: nextSubState }
      })
      return { ...prev, [rosterKey]: updatedRoster }
    })
  }

  const confirmResetEntireGame = () => {
    hasFinalizedRef.current = false
    setGameState((prev) => ({
      ...EMPTY_STATE,
      matchId: prev.matchId,
      teamAId: prev.teamAId,
      teamBId: prev.teamBId,
      teamAName: prev.teamAName,
      teamBName: prev.teamBName,
      teamAColor: prev.teamAColor,
      teamBColor: prev.teamBColor,
      stage: prev.stage,
      date: prev.date,
      time: prev.time,
      court: prev.court,
      category: prev.category,
      rosterA: prev.rosterA.map((p) => ({ ...p, points: 0, fouls: 0 })),
      rosterB: prev.rosterB.map((p) => ({ ...p, points: 0, fouls: 0 })),
    }))
    setShowResetModal(false)
    showNotice("Scoreboard reset")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const nextPeriod = () => {
    if (isEnded || !hasMatch) return
    setGameState((p) => {
      const next =
        p.period === "Q1" ? "Q2" : p.period === "Q2" ? "Q3" : p.period === "Q3" ? "Q4" : "OT"
      showNotice(`Switched to period: ${next}`)
      return { ...p, period: next, gameTime: 600 }
    })
  }

  const winnerName =
    gameState.winnerId && gameState.winnerId === gameState.teamAId
      ? gameState.teamAName
      : gameState.winnerId && gameState.winnerId === gameState.teamBId
        ? gameState.teamBName
        : null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 selection:bg-gold-500 selection:text-slate-950">
      {notification && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl border border-gold-500/40 bg-slate-900/95 px-4 py-3 text-xs font-bold text-gold-400 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Reset modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-white">Reset Match Scoreboard?</h3>
                <p className="text-xs text-slate-400">
                  Clears scores, player stats, and active game timers for this match.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetEntireGame}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End match modal */}
      {showEndMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-gold-500/40 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setShowEndMatchModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/20 border border-gold-500/40 text-gold-400">
                <Flag className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-white">End Match?</h3>
                <p className="text-xs text-slate-400">
                  Finalizes the match, updates standings, and refreshes the MVP leaderboard.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{gameState.teamAName}</span>
                <span className="font-mono font-black text-white text-lg">{gameState.scoreA}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{gameState.teamBName}</span>
                <span className="font-mono font-black text-white text-lg">{gameState.scoreB}</span>
              </div>
              <p className="pt-2 border-t border-white/10 text-xs text-gold-400">
                {gameState.scoreA === gameState.scoreB
                  ? "Tied — recorded as a draw, no W/L change."
                  : `Winner: ${
                      gameState.scoreA > gameState.scoreB
                        ? gameState.teamAName
                        : gameState.teamBName
                    }`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEndMatchModal(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEndMatch}
                className="rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-gold-500/30 cursor-pointer"
              >
                Yes, End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 via-amber-600 to-maroon-700 text-slate-950 font-black shadow-lg shadow-gold-500/20">
              <Award className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-extrabold tracking-wide text-white truncate">
                  FIBA 3x3 Master Scorer
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                    isEnded
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  <Activity className="h-3 w-3 animate-pulse" />
                  {isEnded ? "MATCH ENDED" : "LIVE CONSOLE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Official Table Official Control Desk • IMRT Championship
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={saveNow}
              disabled={!hasMatch}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Save to Firestore now"
            >
              <Save className="h-3.5 w-3.5" /> Save Now
            </button>

            {isEnded ? (
              <button
                onClick={reopenMatch}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reopen Match
              </button>
            ) : (
              <button
                onClick={() => setShowEndMatchModal(true)}
                disabled={!hasMatch}
                className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:brightness-110 shadow-md shadow-gold-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Flag className="h-3.5 w-3.5" /> End Match
              </button>
            )}

            <button
              onClick={() => setShowResetModal(true)}
              disabled={!hasMatch}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={() => navigate("/")}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Portal
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>

        {isEnded && (
          <div className="border-t border-red-500/20 bg-red-950/40 px-4 py-2.5 sm:px-6">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-2 text-xs text-red-300">
              <Flag className="h-4 w-4" />
              <span className="font-bold uppercase tracking-wider">Match Ended</span>
              {winnerName ? (
                <span className="text-red-200">
                  — Winner: <span className="font-bold text-gold-400">{winnerName}</span>
                </span>
              ) : (
                <span className="text-red-200">— Draw</span>
              )}
              <span className="text-red-400/60">
                · {gameState.scoreA} – {gameState.scoreB}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Match Selector */}
        <div className="rounded-2xl border border-gold-500/30 bg-slate-900/70 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 shrink-0">
              <Calendar className="h-4 w-4" /> Select Match
            </div>
            <select
              value={gameState.matchId || ""}
              onChange={(e) => loadMatch(e.target.value)}
              className="flex-1 rounded-xl border border-gold-500/30 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
            >
              <option value="">— Choose a scheduled match —</option>
              {selectableMatches.map((m) => {
                const a = teams.find((t) => t.id === m.teamAId)
                const b = teams.find((t) => t.id === m.teamBId)
                const label = `${a?.name || "TBD"} vs ${b?.name || "TBD"} · ${m.date} ${m.time} · ${m.court}`
                return (
                  <option key={m.id} value={m.id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>
          {selectableMatches.length === 0 && (
            <p className="mt-2 text-xs text-amber-400">
              No scheduled matches available. Create one in the Admin Dashboard first.
            </p>
          )}
          {gameState.matchId && (
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
              {gameState.stage && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                  Stage: <span className="text-gold-400 font-semibold">{gameState.stage}</span>
                </span>
              )}
              {gameState.court && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                  Court: <span className="text-slate-200">{gameState.court}</span>
                </span>
              )}
              {gameState.date && (
                <span className="rounded-full bg-white/5 px-2.5 py-1 border border-white/10">
                  {gameState.date} · {gameState.time}
                </span>
              )}
            </div>
          )}
        </div>

        {!hasMatch ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-16 text-center">
            <Calendar className="mx-auto h-10 w-10 text-gold-500 mb-3" />
            <h2 className="font-display text-2xl font-bold text-white">Select a match to begin</h2>
            <p className="mt-2 text-sm text-slate-400">
              Choose a scheduled match above to load its teams, rosters, and scoreboard.
            </p>
          </div>
        ) : (
          <>
            {/* Scoreboard Banner */}
            <div
              className={`relative rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden ${
                isEnded ? "border-red-500/30" : "border-gold-500/30"
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent pointer-events-none" />

              <div className="relative grid items-center gap-8 md:grid-cols-7 text-center">
                <div className="md:col-span-3 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Team A
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {gameState.teamAName}
                  </h2>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Direct Score:</span>
                    <button
                      onClick={() => adjustTeamScoreDirect("A", -1)}
                      disabled={isEnded}
                      className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => adjustTeamScoreDirect("A", 1)}
                      disabled={isEnded}
                      title="Inside the arc (1 point)"
                      className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      +1 PT
                    </button>
                    <button
                      onClick={() => adjustTeamScoreDirect("A", 2)}
                      disabled={isEnded}
                      title="Behind the arc (2 points)"
                      className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1 text-xs font-black text-gold-400 hover:bg-gold-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      +2 ARC
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                    <Shield className="h-3.5 w-3.5 text-gold-500" />
                    Team Fouls:{" "}
                    <span
                      className={`font-mono font-bold ${
                        gameState.foulsA >= 6 ? "text-red-400 animate-pulse" : "text-amber-400"
                      }`}
                    >
                      {gameState.foulsA} / 6 {gameState.foulsA >= 6 ? "(PENALTY)" : ""}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-1 flex items-center justify-center">
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-gold-500/50 bg-slate-950/90 px-6 py-5 shadow-2xl shadow-gold-500/10">
                    <span className="font-mono text-5xl sm:text-6xl font-black text-white">
                      {gameState.scoreA}
                    </span>
                    <span className="text-3xl font-black text-gold-500/50">:</span>
                    <span className="font-mono text-5xl sm:text-6xl font-black text-white">
                      {gameState.scoreB}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Team B
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {gameState.teamBName}
                  </h2>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Direct Score:</span>
                    <button
                      onClick={() => adjustTeamScoreDirect("B", -1)}
                      disabled={isEnded}
                      className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => adjustTeamScoreDirect("B", 1)}
                      disabled={isEnded}
                      title="Inside the arc (1 point)"
                      className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      +1 PT
                    </button>
                    <button
                      onClick={() => adjustTeamScoreDirect("B", 2)}
                      disabled={isEnded}
                      title="Behind the arc (2 points)"
                      className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1 text-xs font-black text-gold-400 hover:bg-gold-500/30 transition shadow cursor-pointer disabled:opacity-30"
                    >
                      +2 ARC
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                    <Shield className="h-3.5 w-3.5 text-gold-500" />
                    Team Fouls:{" "}
                    <span
                      className={`font-mono font-bold ${
                        gameState.foulsB >= 6 ? "text-red-400 animate-pulse" : "text-amber-400"
                      }`}
                    >
                      {gameState.foulsB} / 6 {gameState.foulsB >= 6 ? "(PENALTY)" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timers */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md text-center flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Flame className="h-4 w-4 text-gold-500" /> Game Clock (10:00)
                  </div>
                  <div className="my-3 font-mono text-5xl font-black tracking-wider text-gold-400 drop-shadow">
                    {formatTime(gameState.gameTime)}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={toggleGameClock}
                    disabled={isEnded}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-30 ${
                      gameState.isGameRunning
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-gold-500 text-slate-950 hover:brightness-110 shadow-gold-500/20"
                    }`}
                  >
                    {gameState.isGameRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {gameState.isGameRunning ? "PAUSE" : "START"}
                  </button>
                  <button
                    onClick={resetGameClock}
                    disabled={isEnded}
                    className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 cursor-pointer disabled:opacity-30"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={addOneMinute}
                    disabled={isEnded}
                    className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 font-mono cursor-pointer disabled:opacity-30"
                  >
                    +1m
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md text-center flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    FIBA 3x3 Shot Clock
                  </span>
                  <div
                    className={`my-3 font-mono text-5xl font-black tracking-wider ${
                      gameState.shotTime <= 3 ? "text-red-400 animate-pulse" : "text-white"
                    }`}
                  >
                    {gameState.shotTime}s
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={toggleShotClock}
                    disabled={isEnded}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-30 ${
                      gameState.isShotRunning
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-gold-500 text-slate-950 hover:brightness-110"
                    }`}
                  >
                    {gameState.isShotRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {gameState.isShotRunning ? "Pause" : "Start"}
                  </button>
                  {[12, 14, 21].map((val) => (
                    <button
                      key={val}
                      onClick={() => resetShotClock(val)}
                      disabled={isEnded}
                      className={`rounded-xl px-2.5 py-2 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30 ${
                        gameState.shotClockPreset === val
                          ? "bg-gold-500 text-slate-950"
                          : "bg-slate-800 text-slate-300 border border-white/10"
                      }`}
                    >
                      {val}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Match Quarter / Period
                  </span>
                  <div className="my-2 flex items-center justify-between">
                    <span className="font-display text-4xl font-black text-gold-500">
                      {gameState.period}
                    </span>
                    <button
                      onClick={nextPeriod}
                      disabled={isEnded}
                      className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-400 hover:bg-gold-500/20 transition cursor-pointer disabled:opacity-30"
                    >
                      Next Period →
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                  <span className="font-semibold text-slate-300">FIBA 3x3 Rules</span>
                  <span className="text-gold-400 font-bold">First to 21 points</span>
                </div>
              </div>
            </div>

            {/* Rosters */}
            <div className="grid gap-8 lg:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const rosterKey = side === "A" ? "rosterA" : "rosterB"
                const score = side === "A" ? gameState.scoreA : gameState.scoreB
                const teamName = side === "A" ? gameState.teamAName : gameState.teamBName
                return (
                  <div
                    key={side}
                    className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-display text-xl font-bold text-white">{teamName}</h3>
                        <p className="text-xs text-slate-400">
                          Manage player points, fouls & substitutions
                        </p>
                      </div>
                      <span className="rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-mono text-2xl font-black text-gold-500 shadow-inner">
                        {score} pts
                      </span>
                    </div>

                    {gameState[rosterKey].length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-slate-400">
                        No roster available for this team.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {gameState[rosterKey].map((player, idx) => (
                          <div
                            key={idx}
                            className={`rounded-2xl border p-4 sm:p-5 transition duration-200 ${
                              player.subbedOut
                                ? "border-amber-500/20 bg-amber-950/10 opacity-75"
                                : "border-emerald-500/30 bg-slate-950/90 shadow-xl ring-1 ring-emerald-500/10"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/30 font-mono text-sm font-black text-gold-400 shadow-inner">
                                  #{player.jersey}
                                </span>
                                <div>
                                  <div className="font-display font-bold text-base text-white flex items-center gap-2">
                                    {player.name}
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        player.subbedOut
                                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      }`}
                                    >
                                      {player.subbedOut ? "Bench" : "On Court"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="text-slate-300 font-medium">{player.role}</span>
                                    <span>•</span>
                                    <span className="font-mono text-gold-400 font-bold">
                                      {player.points} pts
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => toggleSub(side, idx)}
                                disabled={isEnded}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow cursor-pointer disabled:opacity-30 ${
                                  player.subbedOut
                                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                                }`}
                              >
                                {player.subbedOut ? (
                                  <UserCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <UserX className="h-3.5 w-3.5" />
                                )}
                                {player.subbedOut ? "Sub In" : "Send to Bench"}
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                                  Points:
                                </span>
                                <button
                                  onClick={() => modifyPlayerPoints(side, idx, -1)}
                                  disabled={isEnded || player.subbedOut || player.points <= 0}
                                  className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                                >
                                  -1
                                </button>
                                {/* FIBA 3x3: 1 point inside the arc, 2 points behind it.
                                    There is no 3-point basket. */}
                                {[1, 2].map((delta) => (
                                  <button
                                    key={delta}
                                    onClick={() => modifyPlayerPoints(side, idx, delta)}
                                    disabled={isEnded || player.subbedOut}
                                    title={
                                      delta === 2
                                        ? "Behind the arc (2 points)"
                                        : "Inside the arc (1 point)"
                                    }
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-black active:scale-95 transition disabled:opacity-50 cursor-pointer ${
                                      delta === 2
                                        ? "bg-gold-500/20 border-gold-500/30 text-gold-400 hover:bg-gold-500/30"
                                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                    }`}
                                  >
                                    +{delta} {delta === 2 ? "ARC" : "PT"}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Fouls ({player.fouls}/5):
                                </span>
                                {player.fouls >= 5 ? (
                                  <span className="rounded-lg bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-black text-red-400">
                                    OUT
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => adjustPlayerFouls(side, idx, -1)}
                                      disabled={isEnded || player.fouls <= 0}
                                      className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-5 text-center font-mono text-xs font-black text-amber-400">
                                      {player.fouls}
                                    </span>
                                    <button
                                      onClick={() => adjustPlayerFouls(side, idx, 1)}
                                      disabled={isEnded}
                                      className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer disabled:opacity-30"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}