// shared.js는 lib/weeklyLiveServer.ts에서 만들어진 번들이라 타입이 없습니다.
// 여기서 쓰는 부분만 적어 둡니다.

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

export interface SharedMatchEvent {
  minute: number
  type: string
  side: 'home' | 'away'
  text: string
}

export interface SharedMemberSummary {
  slot: number
  kind: 'user' | 'ai'
  clubName: string
  rating: number
}

export interface SharedRealSquadInput {
  cards: SharedCard[]
  squad: SharedSquad
  division: number
  tactic?: unknown
  plan?: unknown
}

/** Opaque — built by buildWeeklyMatchSetup, consumed by runToEnd/toResult only. */
export type SharedMatchSetup = { readonly __brand: 'MatchSetup' }

export interface SharedLiveState {
  finished: boolean
  minute: number
  scoreFor: number
  scoreAgainst: number
  events: SharedMatchEvent[]
}

export interface SharedMatchResult {
  scoreFor: number
  scoreAgainst: number
  events: SharedMatchEvent[]
  engineVersion: string
}

export const ENGINE_VERSION: string
export const KNOB_KEYS: string[]
export function setTuning(next: Partial<Record<string, number>>): void

export function buildWeeklyMatchSetup(args: {
  groupId: number
  home: SharedMemberSummary
  away: SharedMemberSummary
  homeInput?: SharedRealSquadInput
  awayInput?: SharedRealSquadInput
  neutralVenue: boolean
}): SharedMatchSetup

export function runToEnd(setup: SharedMatchSetup, rng?: () => number): SharedLiveState
export function toResult(
  state: SharedLiveState,
  setup: SharedMatchSetup,
  meta: { seed: string; engineVersion?: string },
): SharedMatchResult
