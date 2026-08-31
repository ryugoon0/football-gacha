import { CUP_ROUNDS } from './cup'
import { ROUNDS_PER_SEASON } from './league'

export type MatchdayKind = 'league' | 'cup'

export interface Matchday {
  /** Position in the combined calendar, 0 based. */
  index: number
  kind: MatchdayKind
  /** Round number inside its own competition, 0 based. */
  round: number
}

/**
 * League and cup share one calendar: cup ties are slotted between league
 * rounds, so a squad has to survive both without resting between them.
 */
export function buildSchedule(
  leagueRounds = ROUNDS_PER_SEASON,
  cupRounds = CUP_ROUNDS,
): Matchday[] {
  const days: Matchday[] = []
  // Space the cup ties evenly through the league season.
  const gap = Math.max(1, Math.floor(leagueRounds / (cupRounds + 1)))
  const cupAfter = new Set(
    Array.from({ length: cupRounds }, (_, index) => Math.min(leagueRounds, (index + 1) * gap)),
  )

  let cupRound = 0
  for (let round = 0; round < leagueRounds; round++) {
    days.push({ index: days.length, kind: 'league', round })
    if (cupAfter.has(round + 1) && cupRound < cupRounds) {
      days.push({ index: days.length, kind: 'cup', round: cupRound })
      cupRound += 1
    }
  }
  // Any cup rounds that did not fit go at the end of the season.
  while (cupRound < cupRounds) {
    days.push({ index: days.length, kind: 'cup', round: cupRound })
    cupRound += 1
  }

  return days
}

export const SEASON_SCHEDULE = buildSchedule()

export function matchdayAt(index: number): Matchday | null {
  return SEASON_SCHEDULE[index] ?? null
}

export const TOTAL_MATCHDAYS = SEASON_SCHEDULE.length

/** Where the next cup tie sits, for the "다음 컵 경기" hint. */
export function nextCupMatchday(fromIndex: number): Matchday | null {
  return SEASON_SCHEDULE.find((day) => day.index >= fromIndex && day.kind === 'cup') ?? null
}
