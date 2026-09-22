import type { Category, Match, Team } from "@/lib/types"

// ============================================================
// Public API
// ============================================================

export type TournamentFormat = "league" | "knockout"

export interface GenerationOptions {
  format: TournamentFormat
  venue: string
  /** Knockout date (used for format=knockout, and for the SF/Final stage). */
  startDate: string
  startTime: string
  /** Length of one match in minutes. */
  matchDurationMin: number
  /** Rest gap between consecutive matches on the same court. */
  matchGapMin: number
  /** Courts to distribute matches across, in order. */
  courts: string[]
  /** Knockout-only: 4 or 8 teams in the bracket. */
  knockoutSize?: 4 | 8
  /** League-only: explicit list of match dates (YYYY-MM-DD), in order. */
  leagueDates?: string[]
  /** League-only: soft cap per day. 0 or unset = distribute evenly. */
  matchesPerDay?: number
}

export interface GenerationResult {
  matches: Omit<Match, "id">[]
  summary: string[]
  error?: string
}

// ============================================================
// Time helpers
// ============================================================

function parseTime(input: string): { h: number; m: number } | null {
  const s = input.trim()
  const match = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/)
  if (!match) return null
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3]?.toUpperCase()
  if (ampm === "PM" && h < 12) h += 12
  if (ampm === "AM" && h === 12) h = 0
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

function addMinutes(base: string, minutes: number): string {
  const parsed = parseTime(base)
  if (!parsed) return base
  const total = parsed.h * 60 + parsed.m + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return formatTime(h, m)
}

// ============================================================
// Round-robin (circle method)
// ============================================================

function roundRobinRounds(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds]
  const hadBye = teams.length % 2 === 1
  if (hadBye) teams.push("__BYE__")
  const n = teams.length
  const rounds: [string, string][][] = []

  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i]
      const b = teams[n - 1 - i]
      if (a !== "__BYE__" && b !== "__BYE__") {
        pairs.push(r % 2 === 0 ? [a, b] : [b, a])
      }
    }
    rounds.push(pairs)

    const last = teams[n - 1]
    for (let i = n - 1; i > 1; i--) teams[i] = teams[i - 1]
    teams[1] = last
  }

  return rounds
}

// ============================================================
// League generator — multi-day
// ============================================================

export function generateLeague(
  teams: Team[],
  category: Category,
  options: GenerationOptions
): GenerationResult {
  const summary: string[] = []
  const eligible = teams.filter(
    (t) => t.category === category && t.approved
  )

  if (eligible.length < 3) {
    return {
      matches: [],
      summary,
      error: `League needs at least 3 approved teams in "${category}". Found ${eligible.length}.`,
    }
  }

  const teamsById = new Map(eligible.map((t) => [t.id, t]))

  // Build a flat list of matches, ordered by round (so teams alternate).
  const rounds = roundRobinRounds(eligible.map((t) => t.id))
  const allPairs: { roundIdx: number; pair: [string, string] }[] = []
  rounds.forEach((round, roundIdx) => {
    round.forEach((pair) => allPairs.push({ roundIdx, pair }))
  })
  const total = allPairs.length

  // Dates: use leagueDates if provided, otherwise single startDate.
  const dates =
    options.leagueDates && options.leagueDates.length > 0
      ? options.leagueDates.filter(Boolean)
      : [options.startDate]

  // Distribution: fill days evenly, respecting a soft cap if provided.
  const matchesForDay: number[] = []
  let remaining = total
  const cap = options.matchesPerDay && options.matchesPerDay > 0
    ? options.matchesPerDay
    : Infinity

  for (let i = 0; i < dates.length; i++) {
    if (i === dates.length - 1) {
      matchesForDay.push(remaining)
    } else {
      const even = Math.ceil(remaining / (dates.length - i))
      const today = Math.min(even, cap)
      matchesForDay.push(today)
      remaining -= today
    }
  }

  // Warn if the last day is overloaded.
  const maxPerDay = Math.max(...matchesForDay)
  if (cap !== Infinity && maxPerDay > cap) {
    summary.push(
      `⚠ Last day has ${maxPerDay} matches (target ${cap}). Add more dates to spread the load.`
    )
  }

  // Build the matches.
  const courts = options.courts.length > 0 ? options.courts : ["Main Court"]
  const slotMinutes = options.matchDurationMin + options.matchGapMin

  const matches: Omit<Match, "id">[] = []
  let cursor = 0

  for (let d = 0; d < dates.length; d++) {
    const count = matchesForDay[d]
    for (let i = 0; i < count && cursor < allPairs.length; i++) {
      const { roundIdx, pair } = allPairs[cursor]
      const [aId, bId] = pair
      const a = teamsById.get(aId)
      const b = teamsById.get(bId)
      if (!a || !b) {
        cursor++
        continue
      }

      const courtIdx = i % courts.length
      const slotOffset = Math.floor(i / courts.length)

      matches.push({
        court: courts[courtIdx],
        category,
        teamAId: a.id,
        teamBId: b.id,
        scoreA: 0,
        scoreB: 0,
        status: "upcoming",
        date: dates[d],
        time: addMinutes(options.startTime, slotOffset * slotMinutes),
        stage: "pool",
        pool: a.pool === b.pool ? a.pool : "Cross",
        round: `League · Round ${roundIdx + 1}`,
        venue: options.venue,
        source: "auto-league",
      })
      cursor++
    }
  }

  // Summary
  summary.push(
    `League: ${eligible.length} teams · ${total} matches · ${rounds.length} rounds.`
  )
  summary.push(
    `Spread across ${dates.length} day${dates.length === 1 ? "" : "s"}: ${matchesForDay
      .map((n, i) => `${dates[i].slice(5)} → ${n}`)
      .join(" · ")}.`
  )
  summary.push(
    `Each team plays ${eligible.length - 1} match${
      eligible.length - 1 === 1 ? "" : "es"
    } · max ${maxPerDay}/day.`
  )

  return { matches, summary }
}

// ============================================================
// Knockout generator — direct, from scratch
// ============================================================

export function generateKnockout(
  teams: Team[],
  category: Category,
  options: GenerationOptions
): GenerationResult {
  const summary: string[] = []
  const size = options.knockoutSize ?? 4
  const eligible = teams
    .filter((t) => t.category === category && t.approved)
    .slice(0, size)

  if (eligible.length < size) {
    return {
      matches: [],
      summary,
      error: `Knockout of ${size} needs ${size} approved teams in "${category}". Found ${eligible.length}.`,
    }
  }

  const court = options.courts[0] ?? "Main Court"
  const slotMinutes = options.matchDurationMin + options.matchGapMin

  const base = {
    court,
    category,
    status: "upcoming" as const,
    date: options.startDate,
    venue: options.venue,
    source: "auto-knockout" as const,
  }

  const matches: Omit<Match, "id">[] = []

  if (size === 4) {
    matches.push(
      {
        ...base,
        teamAId: eligible[0].id,
        teamBId: eligible[3].id,
        scoreA: 0,
        scoreB: 0,
        stage: "semifinal",
        round: "Semifinal 1",
        time: addMinutes(options.startTime, 0),
      },
      {
        ...base,
        teamAId: eligible[1].id,
        teamBId: eligible[2].id,
        scoreA: 0,
        scoreB: 0,
        stage: "semifinal",
        round: "Semifinal 2",
        time: addMinutes(options.startTime, slotMinutes),
      },
      {
        ...base,
        teamAId: "TBD",
        teamBId: "TBD",
        scoreA: 0,
        scoreB: 0,
        stage: "third",
        round: "3rd Place Playoff",
        time: addMinutes(options.startTime, slotMinutes * 2),
      },
      {
        ...base,
        teamAId: "TBD",
        teamBId: "TBD",
        scoreA: 0,
        scoreB: 0,
        stage: "final",
        round: "Final",
        time: addMinutes(options.startTime, slotMinutes * 3),
      }
    )
  } else {
    const pairs: [number, number][] = [
      [0, 7],
      [3, 4],
      [1, 6],
      [2, 5],
    ]
    pairs.forEach(([a, b], i) => {
      matches.push({
        ...base,
        teamAId: eligible[a].id,
        teamBId: eligible[b].id,
        scoreA: 0,
        scoreB: 0,
        stage: "quarterfinal",
        round: `Quarterfinal ${i + 1}`,
        time: addMinutes(options.startTime, i * slotMinutes),
      })
    })
    for (let i = 0; i < 2; i++) {
      matches.push({
        ...base,
        teamAId: "TBD",
        teamBId: "TBD",
        scoreA: 0,
        scoreB: 0,
        stage: "semifinal",
        round: `Semifinal ${i + 1}`,
        time: addMinutes(options.startTime, (pairs.length + i) * slotMinutes),
      })
    }
    matches.push({
      ...base,
      teamAId: "TBD",
      teamBId: "TBD",
      scoreA: 0,
      scoreB: 0,
      stage: "third",
      round: "3rd Place Playoff",
      time: addMinutes(options.startTime, 6 * slotMinutes),
    })
    matches.push({
      ...base,
      teamAId: "TBD",
      teamBId: "TBD",
      scoreA: 0,
      scoreB: 0,
      stage: "final",
      round: "Final",
      time: addMinutes(options.startTime, 7 * slotMinutes),
    })
  }

  summary.push(
    `Knockout: ${size}-team single elimination · ${matches.length} matches · all on ${options.startDate}.`
  )

  return { matches, summary }
}

// ============================================================
// Advance top 4 from league standings → semifinals
// ============================================================

export interface AdvanceResult {
  matches: Omit<Match, "id">[]
  summary: string[]
  error?: string
}

function sortByStandings(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const diffA = a.pointsFor - a.pointsAgainst
    const diffB = b.pointsFor - b.pointsAgainst
    if (diffB !== diffA) return diffB - diffA
    return b.pointsFor - a.pointsFor
  })
}

export function advanceTopFour(
  teams: Team[],
  category: Category,
  options: {
    venue: string
    startDate: string
    startTime: string
    court: string
    matchDurationMin: number
    matchGapMin: number
  }
): AdvanceResult {
  const summary: string[] = []
  const approved = teams.filter((t) => t.category === category && t.approved)

  if (approved.length < 4) {
    return {
      matches: [],
      summary,
      error: `Need at least 4 approved teams in "${category}" to advance. Found ${approved.length}.`,
    }
  }

  const pools = Array.from(
    new Set(approved.map((t) => t.pool).filter((p) => p && p !== "TBD"))
  ).sort()

  let seeds: Team[] = []

  if (pools.length >= 2) {
    const [poolA, poolB] = pools
    const topA = sortByStandings(approved.filter((t) => t.pool === poolA)).slice(0, 2)
    const topB = sortByStandings(approved.filter((t) => t.pool === poolB)).slice(0, 2)
    seeds = [topA[0], topB[0], topA[1], topB[1]].filter(Boolean)
    summary.push(`Seeds: A1, B1, A2, B2 (top 2 from Pool ${poolA} and Pool ${poolB}).`)
  } else {
    seeds = sortByStandings(approved).slice(0, 4)
    summary.push(`Seeds: top 4 by standings.`)
  }

  if (seeds.length < 4) {
    return {
      matches: [],
      summary,
      error: `Only ${seeds.length} teams qualify — need 4.`,
    }
  }

  const slotMinutes = options.matchDurationMin + options.matchGapMin

  const base = {
    court: options.court,
    category,
    status: "upcoming" as const,
    date: options.startDate,
    venue: options.venue,
    source: "auto-knockout" as const,
  }

  const matches: Omit<Match, "id">[] = [
    {
      ...base,
      teamAId: seeds[0].id,
      teamBId: seeds[3].id,
      scoreA: 0,
      scoreB: 0,
      stage: "semifinal",
      round: "Semifinal 1",
      time: addMinutes(options.startTime, 0),
    },
    {
      ...base,
      teamAId: seeds[1].id,
      teamBId: seeds[2].id,
      scoreA: 0,
      scoreB: 0,
      stage: "semifinal",
      round: "Semifinal 2",
      time: addMinutes(options.startTime, slotMinutes),
    },
    {
      ...base,
      teamAId: "TBD",
      teamBId: "TBD",
      scoreA: 0,
      scoreB: 0,
      stage: "third",
      round: "3rd Place Playoff",
      time: addMinutes(options.startTime, slotMinutes * 2),
    },
    {
      ...base,
      teamAId: "TBD",
      teamBId: "TBD",
      scoreA: 0,
      scoreB: 0,
      stage: "final",
      round: "Final",
      time: addMinutes(options.startTime, slotMinutes * 3),
    },
  ]

  summary.push(
    `Scheduled on ${options.startDate}: SF1 @ ${matches[0].time} → SF2 @ ${matches[1].time} → 3rd @ ${matches[2].time} → Final @ ${matches[3].time}.`
  )

  return { matches, summary }
}

// ============================================================
// Utilities exposed to the panel
// ============================================================

export function roundRobinMatchCount(n: number): number {
  return (n * (n - 1)) / 2
}

export function rankTeamsForDisplay(teams: Team[]): Team[] {
  return sortByStandings(teams)
}