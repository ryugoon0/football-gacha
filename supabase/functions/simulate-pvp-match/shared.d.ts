// shared.js는 lib/serverMatch.ts에서 만들어진 번들이라 타입이 없습니다. 여기서
// 쓰는 부분만 적어 둡니다. simulate-match/shared.d.ts와 내용이 같습니다 —
// 같은 lib/serverMatch.ts를 이 함수 디렉터리 몫으로 한 번 더 번들한 것뿐이라
// (Supabase가 함수마다 독립 배포라 물리적으로 두 벌이 필요합니다), 소스는
// 여전히 한 곳입니다.

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
  opponentScorerUids: string[]
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
  att: number
  mid: number
  def: number
  chemistry: number
  filled: number
  hidden: number
  evaluations: SharedSlotEvaluation[]
  traits: unknown
  colors: unknown
  overCap: boolean
  levelTotal: number
  levelCap: number
}

export interface SharedMatchSetup {
  team: SharedSquadRating
  teamName: string
  opponent: { id: string; name: string; badge: string; rating: number }
  /** A real card-based opponent, for PvP — see lib/matchEngine.ts's MatchSetup. */
  opponentSquad?: SharedSquadRating
  opponentName?: string
  opponentTraits?: unknown
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
  duplicated: string[]
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
  opponentScorerUids: string[]
  shotsFor: number
  shotsAgainst: number
}

export function toResult(
  state: ReturnType<typeof runToEnd>,
  setup: SharedMatchSetup,
  meta: { seed: string; engineVersion?: string },
): SharedMatchResult

export function matchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number

export const KNOB_KEYS: string[]

export function setTuning(next: Partial<Record<string, number>>): void

export function tune(key: string): number
