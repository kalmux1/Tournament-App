import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Shield, LogOut, Plus, Trash2, Edit2, Users, Search, X, Check, ArrowLeft, Calendar, Settings } from "lucide-react"
import type { Team, Category, Match, Player } from "@/lib/types"
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal"
import { useAuth } from "@/context/AuthContext"
import { useData } from "@/context/DataContext"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { teams, matches, addTeam, updateTeam, deleteTeam, addMatch, updateMatch, deleteMatch, resetAllData, restoreSampleData } = useData()
  const [activeTab, setActiveTab] = useState<"teams" | "matches" | "settings">("teams")

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })
  
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState({
    name: "",
    code: "",
    color: "#6B1728",
    category: "Men's Open" as Category,
    pool: "A",
    captainName: "",
    captainEmail: "",
    captainPhone: "",
    captainStudentId: "",
    roster: [
      { name: "", jersey: 7, height: "6'0\"", role: "Guard" as const, isSub: false },
      { name: "", jersey: 11, height: "6'2\"", role: "Forward" as const, isSub: false },
      { name: "", jersey: 23, height: "6'5\"", role: "Center" as const, isSub: false },
    ] as Player[],
  })

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [matchForm, setMatchForm] = useState({
    court: "Court 1 (Main Arena)",
    category: "Men's Open" as Category,
    teamAId: "",
    teamBId: "",
    scoreA: 0,
    scoreB: 0,
    status: "upcoming" as "upcoming" | "live" | "completed",
    time: "10:00 AM",
    round: "Pool Stage",
    venue: "IMRT Indoor Arena",
  })

  useEffect(() => {
    const isAuthed = localStorage.getItem("imrt_admin_auth") || localStorage.getItem("imrt_auth_role") === "admin"
    if (!isAuthed) {
      navigate("/admin/login")
    }
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    localStorage.removeItem("imrt_admin_auth")
    localStorage.removeItem("imrt_auth_role")
    localStorage.removeItem("imrt_auth_email")
    navigate("/admin/login", { replace: true })
  }

  const handleOpenAddTeam = () => {
    setEditingTeamId(null)
    setTeamForm({
      name: "",
      code: `IMRT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      color: "#6B1728",
      category: "Men's Open",
      pool: "A",
      captainName: "",
      captainEmail: "",
      captainPhone: "",
      captainStudentId: "",
      roster: [
        { name: "", jersey: 7, height: "6'0\"", role: "Guard", isSub: false },
        { name: "", jersey: 11, height: "6'2\"", role: "Forward", isSub: false },
        { name: "", jersey: 23, height: "6'5\"", role: "Center", isSub: false },
      ],
    })
    setIsTeamModalOpen(true)
  }

  const handleOpenEditTeam = (team: Team) => {
    setEditingTeamId(team.id)
    setTeamForm({
      name: team.name || "",
      code: team.code || "",
      color: team.color || "#6B1728",
      category: team.category || "Men's Open",
      pool: team.pool || "A",
      captainName: team.captain?.name || "",
      captainEmail: team.captain?.email || "",
      captainPhone: team.captain?.phone || "",
      captainStudentId: team.captain?.studentId || "",
      roster: team.roster && team.roster.length > 0 ? [...team.roster] : [
        { name: "", jersey: 7, height: "6'0\"", role: "Guard", isSub: false }
      ],
    })
    setIsTeamModalOpen(true)
  }

  const handleDeleteTeam = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete Team",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone and will remove all associated player rosters.`,
      onConfirm: async () => {
        await deleteTeam(id)
        setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      },
    })
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamForm.name.trim()) return

    const newTeamObj: Team = {
      id: editingTeamId || `t_${Date.now()}`,
      code: teamForm.code || `IMRT-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: teamForm.name,
      color: teamForm.color,
      category: teamForm.category,
      pool: teamForm.pool,
      captain: {
        name: teamForm.captainName || "Captain",
        email: teamForm.captainEmail || "captain@imrt.edu",
        phone: teamForm.captainPhone || "+91 90000 00000",
        studentId: teamForm.captainStudentId || "IMRT-0000",
      },
      roster: teamForm.roster.filter((p) => p.name.trim() !== ""),
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      approved: true,
    }

    if (editingTeamId) {
      await updateTeam(editingTeamId, newTeamObj)
    } else {
      await addTeam(newTeamObj)
    }
    setIsTeamModalOpen(false)
  }

  const handleOpenAddMatch = () => {
    setEditingMatchId(null)
    setMatchForm({
      court: "Court 1 (Main Arena)",
      category: "Men's Open",
      teamAId: teams[0]?.id || "",
      teamBId: teams[1]?.id || "",
      scoreA: 0,
      scoreB: 0,
      status: "upcoming",
      time: "12:00 PM",
      round: "Pool Stage",
      venue: "IMRT Indoor Arena",
    })
    setIsMatchModalOpen(true)
  }

  const handleOpenEditMatch = (match: Match) => {
    setEditingMatchId(match.id)
    setMatchForm({
      court: match.court,
      category: match.category,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
      time: match.time,
      round: match.round,
      venue: match.venue,
    })
    setIsMatchModalOpen(true)
  }

  const handleDeleteMatch = (id: string) => {
    const teamA = teams.find((t) => t.id === matches.find((m) => m.id === id)?.teamAId)
    const teamB = teams.find((t) => t.id === matches.find((m) => m.id === id)?.teamBId)
    const matchName = teamA && teamB ? `${teamA.name} vs ${teamB.name}` : "this match fixture"

    setDeleteModal({
      isOpen: true,
      title: "Delete Match Fixture",
      message: `Are you sure you want to delete ${matchName}? This will remove it from tournament schedules.`,
      onConfirm: async () => {
        await deleteMatch(id)
        setDeleteModal((prev) => ({ ...prev, isOpen: false }))
      },
    })
  }

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    const newMatchObj: Match = {
      id: editingMatchId || `m_${Date.now()}`,
      ...matchForm,
    }

    if (editingMatchId) {
      await updateMatch(editingMatchId, newMatchObj)
    } else {
      await addMatch(newMatchObj)
    }
    setIsMatchModalOpen(false)
  }

  const filteredTeams = teams.filter((t) => {
    const matchesSearch = (t.name || "").toLowerCase().includes(search.toLowerCase()) || (t.code || "").toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-amber-600 text-slate-950 font-bold shadow-lg">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold text-white">Master Admin Console</h1>
              <p className="text-xs text-slate-400">IMRT 3x3 Championship Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/50 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Public Site
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-white/10 bg-slate-900/30">
        <div className="mx-auto flex max-w-7xl gap-2 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-display text-sm font-semibold transition ${
              activeTab === "teams"
                ? "border-gold-500 text-gold-500 bg-gold-500/5"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" /> Teams Management ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-display text-sm font-semibold transition ${
              activeTab === "matches"
                ? "border-gold-500 text-gold-500 bg-gold-500/5"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" /> Fixtures & Schedule ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 font-display text-sm font-semibold transition ${
              activeTab === "settings"
                ? "border-gold-500 text-gold-500 bg-gold-500/5"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" /> Tournament Settings
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Registered Teams</h2>
                <p className="text-sm text-slate-400">Add, review, edit or remove tournament participants and their rosters</p>
              </div>
              <button
                onClick={handleOpenAddTeam}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2.5 font-display text-sm font-semibold text-slate-950 shadow-lg shadow-gold-500/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Add New Team
              </button>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by team name or code..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["All", "Men's Open", "Women's Open", "Inter-Department"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                      selectedCategory === cat
                        ? "bg-gold-500 text-slate-950 font-semibold shadow-lg shadow-gold-500/10"
                        : "border border-white/10 bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Team</th>
                      <th className="px-6 py-4">Category / Pool</th>
                      <th className="px-6 py-4">Captain</th>
                      <th className="px-6 py-4">Roster</th>
                      <th className="px-6 py-4">Record (W-L)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTeams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No teams found. Click "Add New Team" or restore defaults in settings.
                        </td>
                      </tr>
                    ) : (
                      filteredTeams.map((team) => {
                        const teamCode = team.code || "IMRT"
                        const teamAvatarText = teamCode.substring(0, Math.min(3, teamCode.length))
                        return (
                          <tr key={team.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display font-bold text-white shadow-md"
                                  style={{ backgroundColor: team.color || "#6B1728" }}
                                >
                                  {teamAvatarText}
                                </span>
                                <div>
                                  <span className="font-display font-bold text-white">{team.name}</span>
                                  <span className="block text-xs font-mono text-slate-400">{team.code}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                                {team.category}
                              </span>
                              <span className="ml-2 inline-block rounded-md bg-gold-500/10 px-2 py-1 text-xs font-semibold text-gold-500">
                                Pool {team.pool}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-200">{team.captain?.name || "N/A"}</div>
                              <div className="text-xs text-slate-400">{team.captain?.phone || ""}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <Users className="h-3.5 w-3.5 text-gold-500" />
                                <span>{team.roster?.length || 0} players</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-semibold text-slate-200">
                              {team.wins ?? 0} - {team.losses ?? 0}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTeam(team)}
                                  className="rounded-lg border border-white/10 bg-slate-800/50 p-2 text-slate-300 transition hover:border-gold-500 hover:text-gold-500 cursor-pointer"
                                  title="Edit Team"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeam(team.id, team.name)}
                                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                                  title="Delete Team"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Fixtures & Match Schedules</h2>
                <p className="text-sm text-slate-400">Create matches, assign courts, schedule times, and update fixture statuses</p>
              </div>
              <button
                onClick={handleOpenAddMatch}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2.5 font-display text-sm font-semibold text-slate-950 shadow-lg shadow-gold-500/20 transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Schedule New Match
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Time & Court</th>
                      <th className="px-6 py-4">Round / Category</th>
                      <th className="px-6 py-4">Teams</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {matches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No match fixtures scheduled yet.
                        </td>
                      </tr>
                    ) : (
                      matches.map((match) => {
                        const teamA = teams.find((t) => t.id === match.teamAId)
                        const teamB = teams.find((t) => t.id === match.teamBId)
                        return (
                          <tr key={match.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <div className="font-display font-bold text-white">{match.time}</div>
                              <div className="text-xs text-slate-400">{match.court}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                                {match.round}
                              </span>
                              <span className="block mt-1 text-xs text-gold-400">{match.category}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{teamA?.name || "Team A"} vs {teamB?.name || "Team B"}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">
                              {match.scoreA} - {match.scoreB}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                                match.status === "live"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                                  : match.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}>
                                {match.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMatch(match)}
                                  className="rounded-lg border border-white/10 bg-slate-800/50 p-2 text-slate-300 transition hover:border-gold-500 hover:text-gold-500 cursor-pointer"
                                  title="Edit Match"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMatch(match.id)}
                                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                                  title="Delete Match"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md space-y-6">
            <h2 className="font-display text-2xl font-bold text-white">Tournament Control Panel</h2>
            <p className="text-sm text-slate-400">Manage global tournament rules and data states.</p>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 p-4">
                <div>
                  <h4 className="font-display font-bold text-white">Reset Tournament Data (Complete Clean)</h4>
                  <p className="text-xs text-slate-400">Wipe all teams, fixtures, and scheduled matches completely clean with no garbage items</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModal({
                      isOpen: true,
                      title: "Reset & Wipe Tournament Data",
                      message: "Are you sure you want to completely wipe all teams, fixtures, and scheduled matches? This will leave the tournament 100% clean.",
                      onConfirm: () => {
                        resetAllData()
                        setDeleteModal((prev) => ({ ...prev, isOpen: false }))
                      },
                    })
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 cursor-pointer"
                >
                  Wipe & Reset Clean
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 p-4">
                <div>
                  <h4 className="font-display font-bold text-white">Restore Default Mock Data</h4>
                  <p className="text-xs text-slate-400">Reload standard tournament sample teams and fixtures</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    restoreSampleData()
                  }}
                  className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 cursor-pointer"
                >
                  Load Sample Data
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950 p-4">
                <div>
                  <h4 className="font-display font-bold text-white">Export Tournament Backup</h4>
                  <p className="text-xs text-slate-400">Download JSON backup of all current teams and fixtures</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ teams, matches }, null, 2))
                    const downloadAnchor = document.createElement('a')
                    downloadAnchor.setAttribute("href", dataStr)
                    downloadAnchor.setAttribute("download", "imrt_3x3_backup.json")
                    document.body.appendChild(downloadAnchor)
                    downloadAnchor.click()
                    downloadAnchor.remove()
                  }}
                  className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 cursor-pointer"
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-display text-lg font-bold text-white">
                {editingTeamId ? "Edit Team & Roster" : "Add New Team"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="e.g. Skyline Ballers"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Team Code</label>
                  <input
                    type="text"
                    value={teamForm.code}
                    onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value })}
                    placeholder="e.g. IMRT-99"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm font-mono text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Category</label>
                  <select
                    value={teamForm.category}
                    onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value as Category })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  >
                    <option value="Men's Open">Men's Open</option>
                    <option value="Women's Open">Women's Open</option>
                    <option value="Inter-Department">Inter-Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Pool</label>
                  <select
                    value={teamForm.pool}
                    onChange={(e) => setTeamForm({ ...teamForm, pool: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white focus:border-gold-500 focus:outline-none"
                  >
                    <option value="A">Pool A</option>
                    <option value="B">Pool B</option>
                    <option value="C">Pool C</option>
                    <option value="D">Pool D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Theme Color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={teamForm.color}
                      onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                      className="h-11 w-12 cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={teamForm.color}
                      onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm font-mono text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="font-display text-sm font-semibold text-gold-500">Captain Details</h4>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400">Captain Name</label>
                    <input
                      type="text"
                      value={teamForm.captainName}
                      onChange={(e) => setTeamForm({ ...teamForm, captainName: e.target.value })}
                      placeholder="Full Name"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400">Phone Number</label>
                    <input
                      type="text"
                      value={teamForm.captainPhone}
                      onChange={(e) => setTeamForm({ ...teamForm, captainPhone: e.target.value })}
                      placeholder="+91..."
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-gold-500">Roster Players</h4>
                  <button
                    type="button"
                    onClick={() => setTeamForm({
                      ...teamForm,
                      roster: [...teamForm.roster, { name: "", jersey: teamForm.roster.length + 1, height: "6'0\"", role: "Guard", isSub: false }]
                    })}
                    className="rounded-lg bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-500 hover:bg-gold-500/20 cursor-pointer"
                  >
                    + Add Player
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {teamForm.roster.map((player, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                      <input
                        type="text"
                        placeholder="Player Name"
                        value={player.name}
                        onChange={(e) => {
                          const r = [...teamForm.roster]
                          r[idx].name = e.target.value
                          setTeamForm({ ...teamForm, roster: r })
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white"
                      />
                      <input
                        type="number"
                        placeholder="#"
                        value={player.jersey}
                        onChange={(e) => {
                          const r = [...teamForm.roster]
                          r[idx].jersey = parseInt(e.target.value) || 0
                          setTeamForm({ ...teamForm, roster: r })
                        }}
                        className="w-16 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-center text-white font-mono"
                      />
                      <select
                        value={player.role}
                        onChange={(e) => {
                          const r = [...teamForm.roster]
                          r[idx].role = e.target.value as any
                          setTeamForm({ ...teamForm, roster: r })
                        }}
                        className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white"
                      >
                        <option value="Guard">Guard</option>
                        <option value="Forward">Forward</option>
                        <option value="Center">Center</option>
                        <option value="Wing">Wing</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setTeamForm({ ...teamForm, roster: teamForm.roster.filter((_, i) => i !== idx) })}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-gold-500/20 hover:brightness-110 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-display text-lg font-bold text-white">
                {editingMatchId ? "Edit Match Fixture" : "Schedule New Match"}
              </h3>
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Court / Arena</label>
                <input
                  type="text"
                  required
                  value={matchForm.court}
                  onChange={(e) => setMatchForm({ ...matchForm, court: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Team A</label>
                  <select
                    value={matchForm.teamAId}
                    onChange={(e) => setMatchForm({ ...matchForm, teamAId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                  >
                    <option value="">Select Team A</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Team B</label>
                  <select
                    value={matchForm.teamBId}
                    onChange={(e) => setMatchForm({ ...matchForm, teamBId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                  >
                    <option value="">Select Team B</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Time</label>
                  <input
                    type="text"
                    value={matchForm.time}
                    onChange={(e) => setMatchForm({ ...matchForm, time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Round</label>
                  <input
                    type="text"
                    value={matchForm.round}
                    onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={matchForm.status}
                    onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMatchModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-gold-500/20 hover:brightness-110 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> Save Fixture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
