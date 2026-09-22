import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useData } from "@/context/DataContext"
import { useAuth } from "@/context/AuthContext"
import type { Category, Match, Team } from "@/lib/types"
import TeamFormModal from "@/components/admin/TeamFormModal"
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal"
import BracketPanel from "@/components/admin/BracketPanel"
import ExportPanel from "@/components/admin/ExportPanel"
import MatchFormModal from "@/components/admin/MatchFormModal"
import {
  Shield, Users, Calendar, Trophy, CheckCircle, XCircle, Plus, Trash2,
  MapPin, Activity, Settings, UserCheck, Clock, BarChart3, AlertCircle,
  ArrowLeft, LogOut, Pencil, UserPlus, GitFork, Download,
} from "lucide-react"

const CATEGORY_OPTIONS: Category[] = [
  "Men's Open",
  "Women's Open",
  "Under-19 Boys",
  "Under-19 Girls",
  "Inter-Department",
]

type AdminTab =
  | "overview"
  | "teams"
  | "schedule"
  | "bracket"
  | "scorers"
  | "tournament"
  | "export"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const {
    teams, matches, scorers, tournament,
    createTeam, updateTeam, deleteTeam,
    updateTeamStatus, addMatch, deleteMatch,
    addScorer, deleteScorer, updateTournamentSettings,
  } = useData()

  const [activeTab, setActiveTab] = useState<AdminTab>("overview")

  // Team modal state
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)

  // Match edit modal state
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)

  // New match form state
  const [newCourt, setNewCourt] = useState("Court 1 (Main Arena)")
  const [newCategory, setNewCategory] = useState<Category>("Men's Open")
  const [newTeamA, setNewTeamA] = useState("")
  const [newTeamB, setNewTeamB] = useState("")
  const [newTime, setNewTime] = useState("10:00 AM")
  const [newDate, setNewDate] = useState("2026-09-27")
  const [newRound, setNewRound] = useState("Pool Stage")

  // Scorer form state
  const [scrName, setScrName] = useState("")
  const [scrEmail, setScrEmail] = useState("")
  const [scrPhone, setScrPhone] = useState("")
  const [scrCourt, setScrCourt] = useState("Court 1")

  // Tournament settings
  const [tName, setTName] = useState(tournament.name)
  const [tDates, setTDates] = useState(tournament.dates)
  const [tVenue, setTVenue] = useState(tournament.venue)
  const [tTipOff, setTTipOff] = useState(tournament.tipOff)
  const [savedMsg, setSavedMsg] = useState(false)

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamA || !newTeamB || newTeamA === newTeamB) return
    const roundLower = newRound.toLowerCase()
    let stage: Match["stage"] = "pool"
    if (roundLower.includes("quarter")) stage = "quarterfinal"
    else if (roundLower.includes("semi")) stage = "semifinal"
    else if (roundLower.includes("third") || roundLower.includes("3rd")) stage = "third"
    else if (roundLower.includes("final")) stage = "final"
    const teamA = teams.find((t) => t.id === newTeamA)
    const pool = stage === "pool" ? teamA?.pool : undefined
    addMatch({
      court: newCourt,
      category: newCategory,
      teamAId: newTeamA,
      teamBId: newTeamB,
      scoreA: 0,
      scoreB: 0,
      status: "upcoming",
      time: newTime,
      date: newDate,
      round: newRound,
      stage,
      pool,
      venue: tVenue,
      source: "manual",
    })
    setNewTeamA("")
    setNewTeamB("")
  }

  const handleCreateScorer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scrName || !scrEmail) return
    addScorer({
      name: scrName,
      email: scrEmail,
      phone: scrPhone,
      assignedCourt: scrCourt,
      active: true,
    })
    setScrName("")
    setScrEmail("")
    setScrPhone("")
  }

  const handleSaveTournament = (e: React.FormEvent) => {
    e.preventDefault()
    updateTournamentSettings({ name: tName, dates: tDates, venue: tVenue, tipOff: tTipOff })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  const handleTeamSave = async (data: Omit<Team, "id">) => {
    if (editingTeam) {
      await updateTeam(editingTeam.id, data)
    } else {
      await createTeam(data)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  const approvedTeamsCount = teams.filter((t) => t.approved).length
  const pendingTeamsCount = teams.filter((t) => !t.approved).length
  const liveMatchesCount = matches.filter((m) => m.status === "live").length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-maroon-900/90 via-slate-900 to-slate-950 p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="court-lines absolute inset-0 opacity-20" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-gold-500 border border-gold-500/30 mb-3">
              <Shield className="h-3.5 w-3.5" /> Admin Control Center
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tournament Administration
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Manage teams, schedule matches, assign referees, and configure championship timing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition border border-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition border border-red-500/30"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: "overview" as const, label: "Overview", icon: BarChart3 },
          {
            id: "teams" as const,
            label: `Teams (${teams.length})`,
            icon: Users,
            badge: pendingTeamsCount > 0 ? pendingTeamsCount : undefined,
          },
          { id: "schedule" as const, label: `Matches (${matches.length})`, icon: Calendar },
          { id: "bracket" as const, label: "Bracket", icon: GitFork },
          { id: "scorers" as const, label: `Scorers (${scorers.length})`, icon: UserCheck },
          { id: "tournament" as const, label: "Schedule & Venue", icon: Settings },
          { id: "export" as const, label: "Export", icon: Download },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-xl px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? "bg-gold-500 text-slate-950 shadow-lg shadow-gold-500/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="mt-8 space-y-8 animate-fadeIn">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Teams", value: teams.length, icon: Users, color: "gold", sub: `${approvedTeamsCount} approved squads` },
              { label: "Matches Scheduled", value: matches.length, icon: Calendar, color: "blue", sub: `${liveMatchesCount} currently live` },
              { label: "Official Scorers", value: scorers.length, icon: UserCheck, color: "amber", sub: "Assigned across courts" },
              { label: "Championship Status", value: "Active", icon: Trophy, color: "purple", sub: "FIBA 3x3 Standard Rules" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                <div className={`absolute right-4 top-4 rounded-2xl bg-${s.color}-500/10 p-3 text-${s.color}-400`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{s.label}</p>
                <h3 className="mt-2 font-display text-4xl font-bold text-white">{s.value}</h3>
                <p className="mt-2 text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gold-500" /> Pending Team Approvals
              </h3>
              <div className="mt-6 space-y-3">
                {pendingTeamsCount === 0 ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-slate-400">
                    <CheckCircle className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                    All registered teams have been approved!
                  </div>
                ) : (
                  teams.filter((t) => !t.approved).map((team) => (
                    <div key={team.id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold-400">{team.code}</span>
                          <span className="font-display text-lg font-bold text-white">{team.name}</span>
                        </div>
                        <p className="text-xs text-slate-400">{team.category} • Captain: {team.captain.name}</p>
                      </div>
                      <button
                        onClick={() => updateTeamStatus(team.id, true)}
                        className="rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-gold-500" /> Live & Upcoming Matches
              </h3>
              <div className="mt-6 space-y-3">
                {matches.slice(0, 3).map((m) => {
                  const a = teams.find((t) => t.id === m.teamAId)
                  const b = teams.find((t) => t.id === m.teamBId)
                  return (
                    <div key={m.id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{m.court}</span>
                          <span className={`uppercase font-semibold ${m.status === "live" ? "text-red-400 animate-pulse" : "text-gold-400"}`}>
                            • {m.status}
                          </span>
                        </div>
                        <div className="mt-1 font-display font-bold text-white">
                          {a?.name || "TBD"} vs {b?.name || "TBD"}
                        </div>
                      </div>
                      <div className="text-right font-display text-lg font-bold text-gold-400">
                        {m.scoreA} - {m.scoreB}
                      </div>
                    </div>
                  )
                })}
                {matches.length === 0 && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-slate-400">
                    <Calendar className="mx-auto h-8 w-8 text-gold-500 mb-2" />
                    No matches scheduled yet. Use the Bracket tab to generate a league or knockout.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAMS TAB */}
      {activeTab === "teams" && (
        <div className="mt-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Registered Teams & Squad Management
              </h2>
              <p className="text-sm text-slate-400">
                Add, edit, approve, or remove teams.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400">
                Total: <span className="text-white font-bold">{teams.length}</span> | Approved:{" "}
                <span className="text-emerald-400 font-bold">{approvedTeamsCount}</span>
              </div>
              <button
                onClick={() => {
                  setEditingTeam(null)
                  setShowTeamForm(true)
                }}
                className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-md shadow-gold-500/20"
              >
                <UserPlus className="h-4 w-4" /> Add Team
              </button>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-gold-500 mb-3" />
              <h3 className="font-display text-xl font-bold text-white">No teams yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Teams registered via /register will appear here. You can also add one manually.
              </p>
              <button
                onClick={() => {
                  setEditingTeam(null)
                  setShowTeamForm(true)
                }}
                className="btn-gold mt-6 inline-flex"
              >
                <UserPlus className="h-4 w-4" /> Add Team Manually
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between transition hover:border-gold-500/40"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-gold-500/10 px-2.5 py-1 text-xs font-mono font-bold text-gold-400 border border-gold-500/30">
                        {team.code}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          team.approved
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {team.approved ? "Approved" : "Pending Review"}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-2xl font-bold text-white">{team.name}</h3>
                    <p className="text-xs text-gold-400 font-medium mt-0.5">
                      {team.category} • Pool {team.pool}
                    </p>

                    <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-slate-300 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Captain:</span>
                        <span className="font-semibold text-white">{team.captain.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-slate-200 truncate ml-2">{team.captain.email || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-200">{team.captain.phone || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Roster:</span>
                        <span className="text-gold-400 font-bold">{team.roster.length} Players</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Record:</span>
                        <span className="text-slate-200">
                          {team.wins}W – {team.losses}L
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTeam(team)
                          setShowTeamForm(true)
                        }}
                        className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 py-2.5 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5 border border-white/10"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingTeam(team)}
                        className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 py-2.5 text-xs font-semibold text-red-400 transition flex items-center justify-center gap-1.5 border border-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                    {team.approved ? (
                      <button
                        onClick={() => updateTeamStatus(team.id, false)}
                        className="w-full rounded-xl bg-amber-500/10 hover:bg-amber-500/20 py-2.5 text-xs font-semibold text-amber-400 transition flex items-center justify-center gap-1.5 border border-amber-500/20"
                      >
                        <XCircle className="h-4 w-4" /> Revoke Approval
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTeamStatus(team.id, true)}
                        className="w-full rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 py-2.5 text-xs font-semibold text-emerald-400 transition flex items-center justify-center gap-1.5 border border-emerald-500/40"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve Team
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === "schedule" && (
        <div className="mt-8 space-y-8 animate-fadeIn">
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
            <h2 className="font-display text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="h-6 w-6 text-gold-500" /> Schedule New Tournament Match
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Create fixtures across courts for pool stages or knockout rounds.
            </p>

            <form onSubmit={handleCreateMatch} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Court Location</label>
                <input
                  type="text"
                  value={newCourt}
                  onChange={(e) => setNewCourt(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Category)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Team A</label>
                <select
                  value={newTeamA}
                  onChange={(e) => setNewTeamA(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                >
                  <option value="">Select Team A</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Team B</label>
                <select
                  value={newTeamB}
                  onChange={(e) => setNewTeamB(e.target.value)}
                  className="w-full rounded-2xl bg-slate-900 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                >
                  <option value="">Select Team B</option>
                  {teams.filter((t) => t.id !== newTeamA).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Match Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tip-off Time</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="02:00 PM"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Round Stage</label>
                <input
                  type="text"
                  value={newRound}
                  onChange={(e) => setNewRound(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  placeholder="Pool Stage / Semifinals"
                  required
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full btn-gold py-3">Schedule Match</button>
              </div>
            </form>
          </div>

          <h3 className="font-display text-2xl font-bold text-white">Scheduled Matches ({matches.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => {
              const a = teams.find((t) => t.id === m.teamAId)
              const b = teams.find((t) => t.id === m.teamBId)
              const sourceLabel =
                m.source === "auto-league"
                  ? "League"
                  : m.source === "auto-knockout"
                    ? "Knockout"
                    : "Manual"
              return (
                <div
                  key={m.id}
                  className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between transition hover:border-gold-500/40"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gold-500" /> {m.court}
                      </span>
                      <span
                        className={`uppercase font-semibold px-2 py-0.5 rounded text-[10px] ${
                          m.status === "live"
                            ? "bg-red-500/20 text-red-400"
                            : m.status === "finished"
                              ? "bg-white/10 text-slate-400"
                              : "bg-gold-500/10 text-gold-400"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {sourceLabel}
                      </span>
                      {m.stage && m.stage !== "pool" && (
                        <span className="rounded-md bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-400">
                          {m.stage}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 font-display text-lg font-bold text-white">
                      {a?.name || "TBD"} vs {b?.name || "TBD"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {m.date} at {m.time}
                      {m.round ? ` • ${m.round}` : ""}
                    </div>

                    <div className="mt-4 rounded-xl bg-white/5 p-3 flex justify-between items-center text-sm font-bold text-gold-400">
                      <span>Score</span>
                      <span>
                        {m.scoreA} - {m.scoreB}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex gap-2">
                    <button
                      onClick={() => setEditingMatch(m)}
                      className="flex-1 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 py-2.5 text-xs font-semibold text-gold-400 transition flex items-center justify-center gap-1.5 border border-gold-500/20"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => deleteMatch(m.id)}
                      className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 py-2.5 text-xs font-semibold text-red-400 transition flex items-center justify-center gap-1.5 border border-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
            {matches.length === 0 && (
              <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 px-6 py-16 text-center">
                <Calendar className="mx-auto h-10 w-10 text-gold-500 mb-3" />
                <h3 className="font-display text-xl font-bold text-white">No matches yet</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Schedule matches above, or auto-generate a full tournament in the Bracket tab.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BRACKET TAB */}
      {activeTab === "bracket" && <BracketPanel />}

      {/* SCORERS TAB */}
      {activeTab === "scorers" && (
        <div className="mt-8 space-y-8 animate-fadeIn">
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/10">
            <h2 className="font-display text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="h-6 w-6 text-gold-500" /> Assign Official Scorer
            </h2>
            <form onSubmit={handleCreateScorer} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Full Name</label>
                <input type="text" value={scrName} onChange={(e) => setScrName(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Login Email</label>
                <input type="email" value={scrEmail} onChange={(e) => setScrEmail(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
                <input type="text" value={scrPhone} onChange={(e) => setScrPhone(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Assigned Court</label>
                <input type="text" value={scrCourt} onChange={(e) => setScrCourt(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <button type="submit" className="btn-gold py-3 px-8">Add Official Scorer</button>
              </div>
            </form>
          </div>

          <h3 className="font-display text-2xl font-bold text-white">Active Official Scorers ({scorers.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scorers.map((s) => (
              <div key={s.id} className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold text-emerald-400 uppercase border border-emerald-500/30">
                    Active Official
                  </span>
                  <h4 className="mt-4 font-display text-xl font-bold text-white">{s.name}</h4>
                  <p className="text-xs text-slate-400">{s.email}</p>
                  <div className="mt-4 rounded-2xl bg-white/5 p-4 text-xs text-slate-300 space-y-1.5">
                    <p><strong>Court:</strong> {s.assignedCourt}</p>
                    <p><strong>Phone:</strong> {s.phone}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                  <button onClick={() => deleteScorer(s.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition">
                    <Trash2 className="h-3.5 w-3.5" /> Remove Scorer
                  </button>
                </div>
              </div>
            ))}
            {scorers.length === 0 && (
              <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center text-slate-400">
                <UserCheck className="mx-auto h-8 w-8 text-gold-500 mb-2" />
                No scorers assigned yet. Use the form above to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOURNAMENT SETTINGS TAB */}
      {activeTab === "tournament" && (
        <div className="mt-8 max-w-2xl mx-auto animate-fadeIn">
          <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-gold-500" /> Tournament Date & Venue Control
            </h2>
            {savedMsg && (
              <div className="mb-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                Tournament settings successfully updated!
              </div>
            )}
            <form onSubmit={handleSaveTournament} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Tournament Title</label>
                <input type="text" value={tName} onChange={(e) => setTName(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Tournament Dates</label>
                <input type="text" value={tDates} onChange={(e) => setTDates(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Venue Location</label>
                <input type="text" value={tVenue} onChange={(e) => setTVenue(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Tip-off Start Time</label>
                <input type="datetime-local" value={tTipOff.slice(0, 16)} onChange={(e) => setTTipOff(e.target.value + ":00")}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm text-white focus:border-gold-500 focus:outline-none" required />
              </div>
              <button type="submit" className="btn-gold py-3.5 px-8 w-full mt-2">
                Save Tournament Schedule & Venue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT TAB */}
      {activeTab === "export" && <ExportPanel />}

      {/* Team form modal */}
      {showTeamForm && (
        <TeamFormModal
          team={editingTeam}
          onSave={handleTeamSave}
          onClose={() => {
            setShowTeamForm(false)
            setEditingTeam(null)
          }}
        />
      )}

      {/* Match edit modal */}
      {editingMatch && (
        <MatchFormModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
        />
      )}

      {/* Delete team confirmation */}
      {deletingTeam && (
        <DeleteConfirmModal
          isOpen={true}
          title={`Delete "${deletingTeam.name}"?`}
          message={`This will permanently remove the team, its roster, and its standings from the tournament. Any scheduled matches involving this team will show "TBD". This action cannot be undone.`}
          onConfirm={async () => {
            await deleteTeam(deletingTeam.id)
            setDeletingTeam(null)
          }}
          onClose={() => setDeletingTeam(null)}
        />
      )}
    </div>
  )
}