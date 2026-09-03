// shared.js는 lib/serverMatch.ts에서 만들어진 번들이라 타입이 없습니다. 여기서
// 쓰는 부분만 적어 둡니다. 값은 여전히 한 벌이고, 이 파일은 모양만 말합니다.

export interface SharedCard {
  uid: string
  playerId: string
  level: number
  limit: number
  condition: number
  injuredFor: number
  exp: number
}

export interface SharedSquad {
  formation: string
  slots: Record<string, string | null>
  bench: (string | null)[]
}

/** Loose on purpose — the four dials or a full 21-param plan, either shape passes through untouched. */
export type SharedTactic = Record<string, unknown>

export interface SharedMatchEvent {
  minute: number
  type: string
  side: 'home' | 'away'
  text: string
}

export interface SharedMatchResult {
  opponent: string
  scorerUids: string[]
  opponentRating: number
  scoreFor: number
  scoreAgainst: number
  result: 'W' | 'D' | 'L'
  events: SharedMatchEvent[]
  reward: number
  possession: number
  shotsFor: number
  shotsAgainst: number
  seed: string
  engineVersion: string
}

export interface SharedSlotEvaluation {
  slotId: string
  slotPosition: string
  card: SharedCard | null
}

export interface SharedSquadRating {
  overall: number
  evaluations: SharedSlotEvaluation[]
  traits: unknown
  overCap: boolean
  levelTotal: number
  levelCap: number
}

export interface SharedMatchSetup {
  team: SharedSquadRating
  teamName: string
  opponent: { id: string; name: string; badge: string; rating: number }
  division: number
  venue: 'home' | 'away' | 'neutral'
  tactic: SharedTactic
  traits?: unknown
  phased?: unknown
}

export const ENGINE_VERSION: string
export const MINI_GAME_REWARD: number
export const DEFAULT_TACTIC: SharedTactic

export function evaluateSquad(
  cards: SharedCard[],
  squad: SharedSquad,
  division?: number,
): SharedSquadRating

export function missingSlots(evaluations: SharedSlotEvaluation[]): {
  empty: string[]
  injured: string[]
}

export function lineupCapOf(division: number): number

export function runToEnd(
  setup: SharedMatchSetup,
  rng?: () => number,
): {
  finished: boolean
  scoreFor: number
  scoreAgainst: number
  events: SharedMatchEvent[]
  scorerUids: string[]
  shotsFor: number
  shotsAgainst: number
}

export function toResult(
  state: ReturnType<typeof runToEnd>,
  setup: SharedMatchSetup,
  meta: { seed: string; engineVersion?: string },
): SharedMatchResult

export function matchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number
