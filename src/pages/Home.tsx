import { Link } from "react-router-dom"
import { CalendarDays, MapPin, PlayCircle, Trophy, Users, Radio, ArrowRight } from "lucide-react"
import Countdown from "@/components/Countdown"
import MatchCard from "@/components/MatchCard"
import TeamLogo from "@/components/TeamLogo"
import { useData } from "@/context/DataContext"

export default function Home() {
  const { matches, teams, playerStats, getTeam, tournament } = useData()
  const live = matches.filter((m) => m.status === "live")
  const upcoming = matches.filter((m) => m.status === "upcoming").slice(0, 3)
  const featured = live.length ? live : upcoming.slice(0, 3)
  const topScorer = playerStats.length
    ? [...playerStats].sort((a, b) => b.points - a.points)[0]
    : undefined

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1752757/pexels-photo-1752757.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-maroon-900/60 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
              <Radio className="h-3.5 w-3.5" /> Official FIBA 3x3 Championship
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] text-white sm:text-7xl lg:text-8xl">
              {tournament.name.split(" ")[0]} 3x3 <span className="text-gold-500">Basketball</span> 2026
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Seven days of high-intensity half-court action under official FIBA 3x3 rules at{" "}
              {tournament.venue}. Register your squad and chase the crown.
            </p>

            <div className="mt-7 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2 text-slate-200">
                <CalendarDays className="h-5 w-5 text-gold-500" /> {tournament.dates}
              </span>
              <span className="flex items-center gap-2 text-slate-200">
                <MapPin className="h-5 w-5 text-gold-500" /> {tournament.venue}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-gold">
                <Users className="h-4 w-4" /> Register Your Team
              </Link>
              <Link to="/hub" className="btn-maroon">
                <Trophy className="h-4 w-4" /> Schedule & Brackets
              </Link>
              <a href="#live" className="btn-ghost">
                <PlayCircle className="h-4 w-4" /> Watch Live Stream
              </a>
            </div>

            <div className="mt-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Tournament Tip-off In
              </p>
              <Countdown target={tournament.tipOff} />
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-y border-white/10 bg-black/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-4 sm:px-6 md:grid-cols-4">
          {[
            { label: "Registered Teams", value: teams.length },
            { label: "Matches Scheduled", value: matches.length },
            { label: "Pools", value: new Set(teams.map((t) => t.pool)).size },
            { label: "Categories", value: 5 },
          ].map((s) => (
            <div key={s.label} className="py-6 text-center">
              <div className="font-display text-4xl font-bold text-gold-500">{s.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Match Center */}
      <section id="live" className="court-lines">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Match Center</h2>
              <p className="mt-1 text-sm text-slate-400">
                Live games and the next tip-offs on every court.
              </p>
            </div>
            <Link
              to="/hub"
              className="hidden items-center gap-1 text-sm font-semibold text-gold-500 hover:underline sm:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.length === 0 ? (
              <p className="col-span-full rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
                No matches scheduled yet. Check back soon.
              </p>
            ) : (
              featured.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </div>
        </div>
      </section>

      {/* Highlight row */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {topScorer &&
            (() => {
              const team = getTeam(topScorer.teamId)
              const ppg = topScorer.games > 0 ? topScorer.points / topScorer.games : 0
              return (
                <div className="glass relative overflow-hidden rounded-2xl p-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
                    MVP Race Leader
                  </span>
                  <div className="mt-4 flex items-center gap-4">
                    <TeamLogo team={team ?? null} size="lg" />
                    <div>
                      <div className="font-display text-2xl font-bold text-white">
                        {topScorer.playerName}
                      </div>
                      <div className="text-sm text-slate-400">{team?.name ?? "TBD"}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-6">
                    <div>
                      <div className="font-display text-3xl font-bold text-gold-500">
                        {topScorer.points}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-slate-400">Total Pts</div>
                    </div>
                    <div>
                      <div className="font-display text-3xl font-bold text-white">
                        {ppg.toFixed(1)}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-slate-400">PPG</div>
                    </div>
                  </div>
                </div>
              )
            })()}

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maroon-700 to-maroon-900 p-6 lg:col-span-2">
            <div className="court-lines absolute inset-0 opacity-40" />
            <div className="relative">
              <h3 className="font-display text-3xl font-bold text-white">Your squad. The big stage.</h3>
              <p className="mt-2 max-w-md text-sm text-white/80">
                Rally three starters and a reserve, pick your category, and lock your spot in the
                championship bracket at {tournament.venue}.
              </p>
              <Link to="/register" className="btn-gold mt-6">
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}