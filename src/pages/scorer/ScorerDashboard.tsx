import { useState, useEffect, useRef } from "react"
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
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useData } from "@/context/DataContext"
import type { Player } from "@/lib/types"
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"

interface LivePlayer extends Player {
  points: number
  fouls: number
  subbedOut: boolean
}

type MatchLifecycle = "live" | "finished"

interface LiveGameState {
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
  status: MatchLifecycle
  winnerId?: string
  endedAt?: number
}

const DEFAULT_STATE: LiveGameState = {
  teamAName: "Skyline Ballers",
  teamBName: "Court Kings",
  teamAColor: "#6B1728",
  teamBColor: "#0F172A",
  scoreA: 14,
  scoreB: 11,
  foulsA: 3,
  foulsB: 4,
  period: "Q1",
  gameTime: 540,
  isGameRunning: false,
  shotTime: 12,
  isShotRunning: false,
  shotClockPreset: 12,
  status: "live",
  rosterA: [
    { name: "Rahul Verma", jersey: 7, height: "6'2\"", role: "Guard", isSub: false, points: 6, fouls: 1, subbedOut: false },
    { name: "Aditya Singh", jersey: 11, height: "6'5\"", role: "Forward", isSub: false, points: 4, fouls: 1, subbedOut: false },
    { name: "Karan Mehta", jersey: 23, height: "6'7\"", role: "Center", isSub: false, points: 4, fouls: 1, subbedOut: false },
    { name: "Sameer Roy", jersey: 4, height: "6'0\"", role: "Wing", isSub: true, points: 0, fouls: 0, subbedOut: true },
  ],
  rosterB: [
    { name: "Vikram Nair", jersey: 5, height: "6'1\"", role: "Guard", isSub: false, points: 5, fouls: 2, subbedOut: false },
    { name: "Dev Patel", jersey: 14, height: "6'4\"", role: "Forward", isSub: false, points: 4, fouls: 1, subbedOut: false },
    { name: "Arjun Das", jersey: 32, height: "6'6\"", role: "Center", isSub: false, points: 2, fouls: 1, subbedOut: false },
    { name: "Neel Kapoor", jersey: 9, height: "5'11\"", role: "Wing", isSub: true, points: 0, fouls: 0, subbedOut: true },
  ],
}

export default function ScorerDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { teams } = useData()

  const [gameState, setGameState] = useState<LiveGameState>(() => {
    const saved = localStorage.getItem("imrt_live_game_v3")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return DEFAULT_STATE
  })

  const [notification, setNotification] = useState<string | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showEndMatchModal, setShowEndMatchModal] = useState(false)
  const [matchId] = useState<string>("live_match_1")

  const lastLocalEditRef = useRef<number>(0)
  const lastRemoteWriteRef = useRef<number>(0)
  const applyingRemoteRef = useRef<boolean>(false)
  const hasFinalizedRef = useRef<boolean>(false)

  const isEnded = gameState.status === "finished"

  const showNotice = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 2500)
  }

  // Seed the match document on mount
  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const firestore = db
    setDoc(doc(firestore, "matches", matchId), { ...DEFAULT_STATE }, { merge: true }).catch((err) =>
      console.error("[Scorer] initial seed error:", err)
    )
  }, [matchId])

  // Realtime mirror of Firestore state (ignore our own recent writes)
  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const firestore = db
    const unsub = onSnapshot(
      doc(firestore, "matches", matchId),
      (snap) => {
        if (!snap.exists()) return
        if (Date.now() - lastLocalEditRef.current < 1000) return
        const data = snap.data() as Partial<LiveGameState> & { updatedAt?: unknown }
        const { updatedAt, ...rest } = data
        lastRemoteWriteRef.current = Date.now()
        applyingRemoteRef.current = true
        setGameState((prev) => ({ ...prev, ...rest }))
      },
      (err) => console.error("[Scorer] Firestore listen error:", err)
    )
    return () => unsub()
  }, [matchId])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("imrt_live_game_v3", JSON.stringify(gameState))
  }, [gameState])

  // Debounced sync to Firestore
  useEffect(() => {
    if (!db || !isFirebaseConfigured) return
    const firestore = db
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false
      return
    }
    if (Date.now() - lastRemoteWriteRef.current < 750) return

    lastLocalEditRef.current = Date.now()
    const timer = setTimeout(async () => {
      try {
        await setDoc(
          doc(firestore, "matches", matchId),
          { ...gameState, updatedAt: serverTimestamp() },
          { merge: true }
        )
      } catch (err) {
        console.error("[Scorer] Firestore sync error:", err)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [gameState, matchId])

  // Game clock timer
  useEffect(() => {
    let interval: any = null
    if (gameState.isGameRunning && gameState.gameTime > 0) {
      interval = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          gameTime: Math.max(0, prev.gameTime - 1),
          isGameRunning: prev.gameTime - 1 > 0 ? prev.isGameRunning : false,
        }))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState.isGameRunning, gameState.gameTime])

  // Shot clock timer
  useEffect(() => {
    let interval: any = null
    if (gameState.isShotRunning && gameState.shotTime > 0) {
      interval = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          shotTime: Math.max(0, prev.shotTime - 1),
          isShotRunning: prev.shotTime - 1 > 0 ? prev.isShotRunning : false,
        }))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState.isShotRunning, gameState.shotTime])

  const handleLogout = async () => {
    await logout()
    navigate("/scorer/login", { replace: true })
  }

  // --- Manual save ---

  const saveNow = async () => {
    if (!db || !isFirebaseConfigured) {
      showNotice("Firestore offline — nothing saved")
      return
    }
    const firestore = db
    try {
      await setDoc(
        doc(firestore, "matches", matchId),
        { ...gameState, updatedAt: serverTimestamp() },
        { merge: true }
      )
      lastLocalEditRef.current = Date.now()
      showNotice("Scoreboard saved to Firestore")
    } catch (err) {
      console.error("[Scorer] manual save failed:", err)
      showNotice("Save failed — check console")
    }
  }

  // --- End match ---

  const confirmEndMatch = async () => {
    if (hasFinalizedRef.current || gameState.status === "finished") {
      setShowEndMatchModal(false)
      return
    }

    const winnerIsA = gameState.scoreA > gameState.scoreB
    const winnerIsB = gameState.scoreB > gameState.scoreA
    const tied = !winnerIsA && !winnerIsB

    const teamA = teams.find((t) => t.name === gameState.teamAName)
    const teamB = teams.find((t) => t.name === gameState.teamBName)

    const winnerId = winnerIsA && teamA ? teamA.id : winnerIsB && teamB ? teamB.id : undefined

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

    if (db && isFirebaseConfigured) {
      const firestore = db
      try {
        await setDoc(
          doc(firestore, "matches", matchId),
          { ...finalState, updatedAt: serverTimestamp() },
          { merge: true }
        )

        // Bump team standings (skip ties for W/L, still record points)
        if (teamA) {
          await setDoc(
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
          await setDoc(
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
      } catch (err) {
        console.error("[Scorer] end match failed:", err)
      }
    }

    showNotice(
      tied
        ? "Match ended in a tie"
        : `Match ended — ${winnerIsA ? gameState.teamAName : gameState.teamBName} wins!`
    )
  }

  const reopenMatch = async () => {
    hasFinalizedRef.current = false
    setGameState((prev) => ({
      ...prev,
      status: "live",
      winnerId: undefined,
      endedAt: undefined,
    }))
    showNotice("Match reopened — you can edit scores again")
  }

  // --- Timers ---

  const toggleGameClock = () => {
    if (isEnded) return
    setGameState((p) => ({ ...p, isGameRunning: !p.isGameRunning }))
  }

  const resetGameClock = () => {
    if (isEnded) return
    setGameState((p) => ({ ...p, gameTime: 600, isGameRunning: false }))
    showNotice("Game clock reset to 10:00")
  }

  const addOneMinute = () => {
    if (isEnded) return
    setGameState((p) => ({ ...p, gameTime: p.gameTime + 60 }))
    showNotice("Added +1:00 to Game Clock")
  }

  const toggleShotClock = () => {
    if (isEnded) return
    setGameState((p) => ({ ...p, isShotRunning: !p.isShotRunning }))
  }

  const resetShotClock = (val: number) => {
    if (isEnded) return
    setGameState((p) => ({ ...p, shotTime: val, shotClockPreset: val, isShotRunning: true }))
    showNotice(`Shot clock reset to ${val}s`)
  }

  // --- Scoring ---

  const adjustTeamScoreDirect = (team: "A" | "B", delta: number) => {
    if (isEnded) return
    const scoreKey = team === "A" ? "scoreA" : "scoreB"
    setGameState((prev) => {
      const teamName = team === "A" ? prev.teamAName : prev.teamBName
      const updatedScore = Math.max(0, prev[scoreKey] + delta)
      showNotice(`${teamName} score updated to ${updatedScore}`)
      return { ...prev, [scoreKey]: updatedScore }
    })
  }

  const modifyPlayerPoints = (team: "A" | "B", playerIndex: number, delta: number) => {
    if (isEnded) return
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
    if (isEnded) return
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
    if (isEnded) return
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

  const handleSelectTeam = (teamSide: "A" | "B", teamName: string) => {
    if (isEnded) return
    const found = teams.find((t) => t.name === teamName)
    const liveRoster: LivePlayer[] =
      found && found.roster && found.roster.length > 0
        ? found.roster.map((p, idx) => ({
            ...p,
            points: 0,
            fouls: 0,
            subbedOut: idx >= 3,
          }))
        : [
            { name: "Player 1", jersey: 1, height: "6'0\"", role: "Guard", isSub: false, points: 0, fouls: 0, subbedOut: false },
            { name: "Player 2", jersey: 2, height: "6'2\"", role: "Forward", isSub: false, points: 0, fouls: 0, subbedOut: false },
            { name: "Player 3", jersey: 3, height: "6'4\"", role: "Center", isSub: false, points: 0, fouls: 0, subbedOut: false },
          ]

    if (teamSide === "A") {
      setGameState((p) => ({
        ...p,
        teamAName: teamName,
        teamAColor: found?.color || "#6B1728",
        scoreA: 0,
        foulsA: 0,
        rosterA: liveRoster,
      }))
    } else {
      setGameState((p) => ({
        ...p,
        teamBName: teamName,
        teamBColor: found?.color || "#0F172A",
        scoreB: 0,
        foulsB: 0,
        rosterB: liveRoster,
      }))
    }
    showNotice(`Loaded team: ${teamName}`)
  }

  const confirmResetEntireGame = () => {
    hasFinalizedRef.current = false
    setGameState(DEFAULT_STATE)
    setShowResetModal(false)
    showNotice("Scoreboard reset to default state.")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const nextPeriod = () => {
    if (isEnded) return
    setGameState((p) => {
      const next =
        p.period === "Q1"
          ? "Q2"
          : p.period === "Q2"
            ? "Q3"
            : p.period === "Q3"
              ? "Q4"
              : "OT"
      showNotice(`Switched to period: ${next}`)
      return { ...p, period: next, gameTime: 600 }
    })
  }

  const winnerName =
    gameState.winnerId && gameState.winnerId === teams.find((t) => t.name === gameState.teamAName)?.id
      ? gameState.teamAName
      : gameState.winnerId && gameState.winnerId === teams.find((t) => t.name === gameState.teamBName)?.id
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
                  Clears scores, player stats, and active game timers.
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
                  Finalizes the scoreboard and updates team standings. You can reopen afterward if needed.
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
                  ? "Tied — will record as a draw, no W/L change."
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
                  <Activity className="h-3 w-3 animate-pulse" /> {isEnded ? "MATCH ENDED" : "LIVE CONSOLE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Official Table Official Control Desk • IMRT Championship
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save Now */}
            <button
              onClick={saveNow}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 cursor-pointer"
              title="Save scoreboard to Firestore now"
            >
              <Save className="h-3.5 w-3.5" /> Save Now
            </button>

            {/* End Match / Reopen */}
            {isEnded ? (
              <button
                onClick={reopenMatch}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20 cursor-pointer"
                title="Reopen this match for editing"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reopen Match
              </button>
            ) : (
              <button
                onClick={() => setShowEndMatchModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:brightness-110 shadow-md shadow-gold-500/20 cursor-pointer"
                title="Finalize the match and update standings"
              >
                <Flag className="h-3.5 w-3.5" /> End Match
              </button>
            )}

            <button
              onClick={() => setShowResetModal(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              title="Reset match state"
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
        {/* Scoreboard Banner */}
        <div
          className={`relative rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden ${
            isEnded ? "border-red-500/30" : "border-gold-500/30"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative grid items-center gap-8 md:grid-cols-7 text-center">
            <div className="md:col-span-3 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Team A
                </span>
                <select
                  value={gameState.teamAName}
                  onChange={(e) => handleSelectTeam("A", e.target.value)}
                  disabled={isEnded}
                  className="rounded-xl border border-gold-500/30 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-gold-400 shadow-inner focus:outline-none focus:ring-1 focus:ring-gold-500 max-w-[220px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teams.length === 0 && <option value={gameState.teamAName}>{gameState.teamAName}</option>}
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                {gameState.teamAName}
              </h2>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Direct Score:</span>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("A", -1)}
                  disabled={isEnded}
                  className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -1 PT
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("A", 1)}
                  disabled={isEnded}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +1 PT
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
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Team B
                </span>
                <select
                  value={gameState.teamBName}
                  onChange={(e) => handleSelectTeam("B", e.target.value)}
                  disabled={isEnded}
                  className="rounded-xl border border-gold-500/30 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-gold-400 shadow-inner focus:outline-none focus:ring-1 focus:ring-gold-500 max-w-[220px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teams.length === 0 && <option value={gameState.teamBName}>{gameState.teamBName}</option>}
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                {gameState.teamBName}
              </h2>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Direct Score:</span>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("B", -1)}
                  disabled={isEnded}
                  className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -1 PT
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("B", 1)}
                  disabled={isEnded}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +1 PT
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

        {/* Timers & Controls */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Game Clock */}
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
                type="button"
                onClick={toggleGameClock}
                disabled={isEnded}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  gameState.isGameRunning
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gold-500 text-slate-950 hover:brightness-110 shadow-gold-500/20"
                }`}
              >
                {gameState.isGameRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {gameState.isGameRunning ? "PAUSE" : "START"}
              </button>
              <button
                type="button"
                onClick={resetGameClock}
                disabled={isEnded}
                className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Reset to 10:00"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={addOneMinute}
                disabled={isEnded}
                className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 font-mono cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Add +1:00 Overtime"
              >
                +1m
              </button>
            </div>
          </div>

          {/* Shot Clock */}
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
                type="button"
                onClick={toggleShotClock}
                disabled={isEnded}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  gameState.isShotRunning
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gold-500 text-slate-950 hover:brightness-110"
                }`}
              >
                {gameState.isShotRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {gameState.isShotRunning ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                onClick={() => resetShotClock(12)}
                disabled={isEnded}
                className={`rounded-xl px-2.5 py-2 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  gameState.shotClockPreset === 12
                    ? "bg-gold-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                12s
              </button>
              <button
                type="button"
                onClick={() => resetShotClock(14)}
                disabled={isEnded}
                className={`rounded-xl px-2.5 py-2 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  gameState.shotClockPreset === 14
                    ? "bg-gold-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                14s
              </button>
              <button
                type="button"
                onClick={() => resetShotClock(21)}
                disabled={isEnded}
                className={`rounded-xl px-2.5 py-2 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  gameState.shotClockPreset === 21
                    ? "bg-gold-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                21s
              </button>
            </div>
          </div>

          {/* Period */}
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
                  type="button"
                  onClick={nextPeriod}
                  disabled={isEnded}
                  className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-400 hover:bg-gold-500/20 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
          {/* Team A Roster */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{gameState.teamAName}</h3>
                <p className="text-xs text-slate-400">
                  Manage player points, fouls & substitutions
                </p>
              </div>
              <span className="rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-mono text-2xl font-black text-gold-500 shadow-inner">
                {gameState.scoreA} pts
              </span>
            </div>

            <div className="space-y-4">
              {gameState.rosterA.map((player, idx) => (
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
                      type="button"
                      onClick={() => toggleSub("A", idx)}
                      disabled={isEnded}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
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
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, -1)}
                        disabled={isEnded || player.subbedOut || player.points <= 0}
                        className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 1)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +1 PT
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 2)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +2 PTS
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 3)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1.5 text-xs font-black text-gold-400 hover:bg-gold-500/30 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +3 ARC
                      </button>
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
                            type="button"
                            onClick={() => adjustPlayerFouls("A", idx, -1)}
                            disabled={isEnded || player.fouls <= 0}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-black text-amber-400">
                            {player.fouls}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("A", idx, 1)}
                            disabled={isEnded}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
          </div>

          {/* Team B Roster */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{gameState.teamBName}</h3>
                <p className="text-xs text-slate-400">
                  Manage player points, fouls & substitutions
                </p>
              </div>
              <span className="rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-mono text-2xl font-black text-gold-500 shadow-inner">
                {gameState.scoreB} pts
              </span>
            </div>

            <div className="space-y-4">
              {gameState.rosterB.map((player, idx) => (
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
                      type="button"
                      onClick={() => toggleSub("B", idx)}
                      disabled={isEnded}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
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
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, -1)}
                        disabled={isEnded || player.subbedOut || player.points <= 0}
                        className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 1)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +1 PT
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 2)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +2 PTS
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 3)}
                        disabled={isEnded || player.subbedOut}
                        className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1.5 text-xs font-black text-gold-400 hover:bg-gold-500/30 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +3 ARC
                      </button>
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
                            type="button"
                            onClick={() => adjustPlayerFouls("B", idx, -1)}
                            disabled={isEnded || player.fouls <= 0}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-black text-amber-400">
                            {player.fouls}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("B", idx, 1)}
                            disabled={isEnded}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </main>
    </div>
  )
}