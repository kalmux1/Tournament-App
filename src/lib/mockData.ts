import type { Team, Match, Scorer, PlayerStat } from "./types"

/**
 * Tournament settings live here as defaults. They can be overridden
 * at runtime from Admin → "Schedule & Venue". All other collections
 * are intentionally empty — production data is created by admins and
 * the public registration flow.
 */
export const TOURNAMENT = {
  name: "IMRT 3x3 Basketball Championship",
  year: 2026,
  dates: "September 27 - October 3, 2026",
  venue: "IMRT Basketball Court Near Divine Bliss",
  city: "Lucknow, India",
  tipOff: "2026-09-27T09:00:00",
  contactEmail: "kal.mux.cyber@gmail.com",
}

export const mockTeams: Team[] = []
export const mockMatches: Match[] = []
export const mockScorers: Scorer[] = []
export const mockPlayerStats: PlayerStat[] = []