import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Award, LogOut, Play, Pause, RotateCcw, Plus, Minus, ArrowLeft, Shield, Flame, Activity, CheckCircle2, RefreshCw } from "lucide-react"
import { mockTeams } from "@/lib/mockData"
import type { Team, Player } from "@/lib/types"
import { useAuth } from "@/context/AuthContext"

interface LivePlayer extends Player {
  points: number
  fouls: number
  subbedOut: boolean
}

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
  rosterA: [
    { name: "Rahul Verma", jersey: 7, height: "6'2\"", role: "Guard", points: 6, fouls: 1, subbedOut: false },
    { name: "Aditya Singh", jersey: 11, height: "6'5\"", role: "Forward", points: 4, fouls: 1, subbedOut: false },
    { name: "Karan Mehta", jersey: 23, height: "6'7\"", role: "Center", points: 4, fouls: 1, subbedOut: false },
    { name: "Sameer Roy", jersey: 4, height: "6'0\"", role: "Wing", points: 0, fouls: 0, subbedOut: true },
  ],
  rosterB: [
    { name: "Vikram Nair", jersey: 5, height: "6'1\"", role: "Guard", points: 5, fouls: 2, subbedOut: false },
    { name: "Dev Patel", jersey: 14, height: "6'4\"", role: "Forward", points: 4, fouls: 1, subbedOut: false },
    { name: "Arjun Das", jersey: 32, height: "6'6\"", role: "Center", points: 2, fouls: 1, subbedOut: false },
    { name: "Neel Kapoor", jersey: 9, height: "5'11\"", role: "Wing", points: 0, fouls: 0, subbedOut: true },
  ],
}

export default function ScorerDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [teams] = useState<Team[]>(() => {
    const saved = localStorage.getItem("imrt_teams")
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error(e)
      }
    }
    return mockTeams
  })

  const [gameState, setGameState] = useState<LiveGameState>(() => {
    const saved = localStorage.getItem("imrt_live_game")
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { console.error(e) }
    }
    return DEFAULT_STATE
  })

  const [notification, setNotification] = useState<string | null>(null)

  const showNotice = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    const isAuthed = localStorage.getItem("imrt_scorer_auth") || localStorage.getItem("imrt_auth_role") === "scorer" || localStorage.getItem("imrt_auth_role") === "admin"
    if (!isAuthed) {
      navigate("/scorer/login")
    }
  }, [navigate])

  useEffect(() => {
    localStorage.setItem("imrt_live_game", JSON.stringify(gameState))
  }, [gameState])

  // Game clock interval
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

  // Shot clock interval
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
    localStorage.removeItem("imrt_scorer_auth")
    localStorage.removeItem("imrt_auth_role")
    localStorage.removeItem("imrt_auth_email")
    navigate("/scorer/login", { replace: true })
  }

  // Clock handlers
  const toggleGameClock = () => setGameState((p) => ({ ...p, isGameRunning: !p.isGameRunning }))
  const resetGameClock = () => {
    setGameState((p) => ({ ...p, gameTime: 600, isGameRunning: false }))
    showNotice("Game clock reset to 10:00")
  }
  const addOneMinute = () => {
    setGameState((p) => ({ ...p, gameTime: p.gameTime + 60 }))
    showNotice("Added +1:00 to Game Clock")
  }

  const toggleShotClock = () => setGameState((p) => ({ ...p, isShotRunning: !p.isShotRunning }))
  const resetShotClock = (val: number) => {
    setGameState((p) => ({ ...p, shotTime: val, shotClockPreset: val, isShotRunning: true }))
    showNotice(`Shot clock reset to ${val}s`)
  }

  const adjustTeamScoreDirect = (team: "A" | "B", delta: number) => {
    setGameState((prev) => {
      const scoreKey = team === "A" ? "scoreA" : "scoreB"
      const teamName = team === "A" ? prev.teamAName : prev.teamBName
      const newScore = Math.max(0, prev[scoreKey] + delta)
      showNotice(`${teamName} score adjusted by ${delta > 0 ? `+${delta}` : delta} (Total: ${newScore})`)
      return {
        ...prev,
        [scoreKey]: newScore,
      }
    })
  }

  const modifyPlayerPoints = (team: "A" | "B", playerIndex: number, delta: number) => {
    setGameState((prev) => {
      const rosterKey = team === "A" ? "rosterA" : "rosterB"
      const scoreKey = team === "A" ? "scoreA" : "scoreB"
      const updatedRoster = [...prev[rosterKey]]
      const player = updatedRoster[playerIndex]

      const newPlayerPoints = Math.max(0, player.points + delta)
      const pointDifference = newPlayerPoints - player.points
      player.points = newPlayerPoints

      const newTeamScore = Math.max(0, prev[scoreKey] + pointDifference)

      showNotice(`${player.name} (${delta > 0 ? `+${delta}` : delta} pt) updated`)

      return {
        ...prev,
        [scoreKey]: newTeamScore,
        [rosterKey]: updatedRoster,
      }
    })
  }

  const adjustPlayerFouls = (team: "A" | "B", playerIndex: number, delta: number) => {
    setGameState((prev) => {
      const rosterKey = team === "A" ? "rosterA" : "rosterB"
      const foulKey = team === "A" ? "foulsA" : "foulsB"
      const updatedRoster = [...prev[rosterKey]]
      const player = updatedRoster[playerIndex]
      const newFouls = Math.max(0, Math.min(5, player.fouls + delta))
      const diff = newFouls - player.fouls
      player.fouls = newFouls

      return {
        ...prev,
        [foulKey]: Math.max(0, prev[foulKey] + diff),
        [rosterKey]: updatedRoster,
      }
    })
  }

  const toggleSub = (team: "A" | "B", playerIndex: number) => {
    setGameState((prev) => {
      const rosterKey = team === "A" ? "rosterA" : "rosterB"
      const updatedRoster = [...prev[rosterKey]]
      updatedRoster[playerIndex].subbedOut = !updatedRoster[playerIndex].subbedOut
      return { ...prev, [rosterKey]: updatedRoster }
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSelectTeam = (teamSide: "A" | "B", teamName: string) => {
    const found = teams.find((t) => t.name === teamName)
    const liveRoster: LivePlayer[] = found && found.roster && found.roster.length > 0
      ? found.roster.map((p, idx) => ({ ...p, points: 0, fouls: 0, subbedOut: idx >= 3 }))
      : [
          { name: "Player 1", jersey: 1, height: "6'0\"", role: "Guard", points: 0, fouls: 0, subbedOut: false },
          { name: "Player 2", jersey: 2, height: "6'2\"", role: "Forward", points: 0, fouls: 0, subbedOut: false },
          { name: "Player 3", jersey: 3, height: "6'4\"", role: "Center", points: 0, fouls: 0, subbedOut: false },
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

  const resetEntireGame = () => {
    if (window.confirm("Are you sure you want to reset the entire scoreboard? All scores and times will be reset.")) {
      setGameState(DEFAULT_STATE)
      showNotice("Scoreboard reset to default state.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl border border-gold-500/40 bg-slate-900/95 px-4 py-3 text-xs font-bold text-gold-400 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 via-amber-600 to-maroon-700 text-slate-950 font-black shadow-lg shadow-gold-500/20">
              <Award className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-extrabold tracking-wide text-white">FIBA 3x3 Master Scorer</h1>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Activity className="h-3 w-3 animate-pulse" /> LIVE CONSOLE
                </span>
              </div>
              <p className="text-xs text-slate-400">Official Table Official Control Desk • IMRT Championship</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetEntireGame}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              title="Reset match state"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Match
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Public Portal
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        
        {/* TOP MASTER SCOREBOARD & DIRECT SCORE CORRECTION */}
        <div className="relative rounded-3xl border border-gold-500/30 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative grid items-center gap-8 md:grid-cols-7 text-center">
            
            {/* Team A Master Card */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team A Squad</span>
                <select
                  value={gameState.teamAName}
                  onChange={(e) => handleSelectTeam("A", e.target.value)}
                  className="rounded-xl border border-gold-500/30 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-gold-400 shadow-inner focus:outline-none focus:ring-1 focus:ring-gold-500 max-w-[220px] cursor-pointer"
                >
                  {teams.length === 0 && <option value={gameState.teamAName}>{gameState.teamAName}</option>}
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">{gameState.teamAName}</h2>
              
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Direct Correction:</span>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("A", -1)}
                  className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer"
                  title="Subtract 1 point"
                >
                  -1 PT
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("A", 1)}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer"
                  title="Add 1 point"
                >
                  +1 PT
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <Shield className="h-3.5 w-3.5 text-gold-500" />
                Team Fouls: <span className={`font-mono font-bold ${gameState.foulsA >= 6 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>{gameState.foulsA} / 6 {gameState.foulsA >= 6 ? "(PENALTY)" : ""}</span>
              </div>
            </div>

            {/* Central Score Display */}
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-gold-500/50 bg-slate-950/90 px-6 py-5 shadow-2xl shadow-gold-500/10">
                <span className="font-mono text-5xl sm:text-6xl font-black text-white">{gameState.scoreA}</span>
                <span className="text-3xl font-black text-gold-500/50">:</span>
                <span className="font-mono text-5xl sm:text-6xl font-black text-white">{gameState.scoreB}</span>
              </div>
            </div>

            {/* Team B Master Card */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team B Squad</span>
                <select
                  value={gameState.teamBName}
                  onChange={(e) => handleSelectTeam("B", e.target.value)}
                  className="rounded-xl border border-gold-500/30 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-gold-400 shadow-inner focus:outline-none focus:ring-1 focus:ring-gold-500 max-w-[220px] cursor-pointer"
                >
                  {teams.length === 0 && <option value={gameState.teamBName}>{gameState.teamBName}</option>}
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">{gameState.teamBName}</h2>

              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Direct Correction:</span>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("B", -1)}
                  className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-black text-red-400 hover:bg-red-500/30 transition shadow cursor-pointer"
                  title="Subtract 1 point"
                >
                  -1 PT
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamScoreDirect("B", 1)}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition shadow cursor-pointer"
                  title="Add 1 point"
                >
                  +1 PT
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <Shield className="h-3.5 w-3.5 text-gold-500" />
                Team Fouls: <span className={`font-mono font-bold ${gameState.foulsB >= 6 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>{gameState.foulsB} / 6 {gameState.foulsB >= 6 ? "(PENALTY)" : ""}</span>
              </div>
            </div>

          </div>
        </div>

        {/* CLOCKS & PERIOD CONTROLS */}
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
            <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={toggleGameClock}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-lg cursor-pointer ${
                  gameState.isGameRunning
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gold-500 text-slate-950 hover:brightness-110 shadow-gold-500/20"
                }`}
              >
                {gameState.isGameRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {gameState.isGameRunning ? "PAUSE GAME" : "START GAME"}
              </button>
              <button
                type="button"
                onClick={resetGameClock}
                className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="Reset to 10:00"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={addOneMinute}
                className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 font-mono cursor-pointer"
                title="Add +1:00 Overtime"
              >
                +1m
              </button>
            </div>
          </div>

          {/* FIBA Shot Clock */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md text-center flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">FIBA Shot Clock</span>
              <div className={`my-3 font-mono text-5xl font-black tracking-wider ${gameState.shotTime <= 3 ? "text-red-400 animate-pulse" : "text-white"}`}>
                {gameState.shotTime}s
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={toggleShotClock}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
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
                className={`rounded-xl px-3 py-2 text-xs font-mono font-bold transition cursor-pointer ${
                  gameState.shotClockPreset === 12 ? "bg-gold-500 text-slate-950" : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                12s
              </button>
              <button
                type="button"
                onClick={() => resetShotClock(14)}
                className={`rounded-xl px-3 py-2 text-xs font-mono font-bold transition cursor-pointer ${
                  gameState.shotClockPreset === 14 ? "bg-gold-500 text-slate-950" : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                14s
              </button>
              <button
                type="button"
                onClick={() => resetShotClock(21)}
                className={`rounded-xl px-3 py-2 text-xs font-mono font-bold transition cursor-pointer ${
                  gameState.shotClockPreset === 21 ? "bg-gold-500 text-slate-950" : "bg-slate-800 text-slate-300 border border-white/10"
                }`}
              >
                21s
              </button>
            </div>
          </div>

          {/* Period / Quarter */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Match Quarter / Period</span>
              <div className="my-2 flex items-center justify-between">
                <span className="font-display text-4xl font-black text-gold-500">{gameState.period}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = gameState.period === "Q1" ? "Q2" : gameState.period === "Q2" ? "Q3" : gameState.period === "Q3" ? "Q4" : "OT"
                    setGameState((p) => ({ ...p, period: next, gameTime: 600 }))
                    showNotice(`Switched to period: ${next}`)
                  }}
                  className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-400 hover:bg-gold-500/20 transition cursor-pointer"
                >
                  Next Quarter →
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
              <span className="font-semibold text-slate-300">FIBA 3x3 Rules</span>
              <span className="text-gold-400 font-bold">First to 21 points wins</span>
            </div>
          </div>
        </div>

        {/* ROSTER SCORING & DEPRECIATION / CORRECTION PANELS */}
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* TEAM A ROSTER */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{gameState.teamAName}</h3>
                <p className="text-xs text-slate-400">Assign points or use [-] to depreciate wrong scores</p>
              </div>
              <span className="rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-mono text-2xl font-black text-gold-500 shadow-inner">
                {gameState.scoreA} pts
              </span>
            </div>

            <div className="space-y-4">
              {gameState.rosterA.map((player, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 sm:p-5 transition ${
                    player.subbedOut ? "border-white/5 bg-slate-950/40 opacity-60" : "border-white/10 bg-slate-950/90 shadow-xl"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/30 font-mono text-sm font-black text-gold-400 shadow-inner">
                        #{player.jersey}
                      </span>
                      <div>
                        <div className="font-display font-bold text-base text-white">{player.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-slate-300 font-medium">{player.role}</span>
                          <span>•</span>
                          <span className="font-mono text-gold-400 font-bold">{player.points} pts</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSub("A", idx)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        player.subbedOut ? "bg-slate-800 text-slate-400" : "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                      }`}
                    >
                      {player.subbedOut ? "Bench" : "On Court"}
                    </button>
                  </div>

                  {/* Points Action Buttons (Add & Depreciate / Minus) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Points:</span>
                      
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, -1)}
                        disabled={player.subbedOut || player.points <= 0}
                        className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                        title="Subtract 1 pt"
                      >
                        -1
                      </button>

                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 1)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +1 PT
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 2)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +2 PTS
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("A", idx, 3)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1.5 text-xs font-black text-gold-400 hover:bg-gold-500/30 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +3 ARC
                      </button>
                    </div>

                    {/* Fouls Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fouls ({player.fouls}/5):</span>
                      {player.fouls >= 5 ? (
                        <span className="rounded-lg bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-black text-red-400">
                          OUT
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("A", idx, -1)}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-black text-amber-400">{player.fouls}</span>
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("A", idx, 1)}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
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

          {/* TEAM B ROSTER */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{gameState.teamBName}</h3>
                <p className="text-xs text-slate-400">Assign points or use [-] to depreciate wrong scores</p>
              </div>
              <span className="rounded-2xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 font-mono text-2xl font-black text-gold-500 shadow-inner">
                {gameState.scoreB} pts
              </span>
            </div>

            <div className="space-y-4">
              {gameState.rosterB.map((player, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 sm:p-5 transition ${
                    player.subbedOut ? "border-white/5 bg-slate-950/40 opacity-60" : "border-white/10 bg-slate-950/90 shadow-xl"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/30 font-mono text-sm font-black text-gold-400 shadow-inner">
                        #{player.jersey}
                      </span>
                      <div>
                        <div className="font-display font-bold text-base text-white">{player.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-slate-300 font-medium">{player.role}</span>
                          <span>•</span>
                          <span className="font-mono text-gold-400 font-bold">{player.points} pts</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSub("B", idx)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        player.subbedOut ? "bg-slate-800 text-slate-400" : "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                      }`}
                    >
                      {player.subbedOut ? "Bench" : "On Court"}
                    </button>
                  </div>

                  {/* Points Action Buttons (Add & Depreciate / Minus) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Points:</span>
                      
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, -1)}
                        disabled={player.subbedOut || player.points <= 0}
                        className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                        title="Subtract 1 pt"
                      >
                        -1
                      </button>

                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 1)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +1 PT
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 2)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +2 PTS
                      </button>
                      <button
                        type="button"
                        onClick={() => modifyPlayerPoints("B", idx, 3)}
                        disabled={player.subbedOut}
                        className="rounded-lg bg-gold-500/20 border border-gold-500/30 px-3 py-1.5 text-xs font-black text-gold-400 hover:bg-gold-500/30 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        +3 ARC
                      </button>
                    </div>

                    {/* Fouls Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fouls ({player.fouls}/5):</span>
                      {player.fouls >= 5 ? (
                        <span className="rounded-lg bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-black text-red-400">
                          OUT
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("B", idx, -1)}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-black text-amber-400">{player.fouls}</span>
                          <button
                            type="button"
                            onClick={() => adjustPlayerFouls("B", idx, 1)}
                            className="rounded-lg border border-white/10 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800 cursor-pointer"
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
