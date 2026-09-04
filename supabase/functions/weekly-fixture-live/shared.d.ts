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

/** Opaque — built by buildWeeklyMatchSetup, consumed by the replay only. */
export type SharedMatchSetup = { readonly __brand: 'MatchSetup' }

export interface SharedSideMaterial {
  cards: SharedCard[]
  squad: SharedSquad
  division: number
}

export interface SharedSnapshot {
  setup: SharedMatchSetup
  home: SharedSideMaterial
  away: SharedSideMaterial
}

export type SharedSide = 'home' | 'away'

export interface SharedCommand {
  id: number
  side: SharedSide
  minute: number
  payload: unknown
}

export interface SharedLiveState {
  finished: boolean
  minute: number
  scoreFor: number
  scoreAgainst: number
  events: SharedMatchEvent[]
}

export interface SharedReplayResult {
  state: SharedLiveState
  setup: SharedMatchSetup
  applied: { id: number; side: SharedSide; appliedMinute: number; text: string }[]
  rejected: { id: number; side: SharedSide; reason: string }[]
  subsUsed: Record<SharedSide, number>
}

export interface SharedPublicState {
  minute: number
  finished: boolean
  phase: string
  stoppage: string | null
  scoreHome: number
  scoreAway: number
  shotsHome: number
  shotsAway: number
  possessionHome: number
  events: SharedMatchEvent[]
}

export interface SharedLineupView {
  slots: { slotId: string; position: string; uid: string | null; name: string; stamina: number | null }[]
  bench: { uid: string; name: string; condition: number }[]
  subsLeft: number
}

export interface SharedMatchResult {
  scoreFor: number
  scoreAgainst: number
  events: SharedMatchEvent[]
  engineVersion: string
}

export const ENGINE_VERSION: string
export const KNOB_KEYS: string[]
export const LIVE_WINDOW_SECONDS: number
export function setTuning(next: Partial<Record<string, number>>): void

export function buildWeeklyMatchSetup(args: {
  groupId: number
  home: SharedMemberSummary
  away: SharedMemberSummary
  homeInput?: SharedRealSquadInput
  awayInput?: SharedRealSquadInput
  neutralVenue: boolean
  aiAnchor?: number
}): SharedMatchSetup

export const TIERS: { maxRealUsers: number; aiBaseRating: number }[]
export function evaluateSquad(cards: SharedCard[], squad: SharedSquad, division?: number): { overall: number }
export function weeklyAiAnchor(realOveralls: number[], tierAiBaseRating: number, topTierAiBaseRating: number): number | undefined

export function runToEnd(setup: SharedMatchSetup, rng?: () => number): SharedLiveState
export function toResult(
  state: SharedLiveState,
  setup: SharedMatchSetup,
  meta: { seed: string; engineVersion?: string },
): SharedMatchResult

export function matchMinuteAt(scheduledAtMs: number, nowMs: number): number
export function liveWindowEnded(scheduledAtMs: number, nowMs: number): boolean
export function replayFixture(
  snapshot: SharedSnapshot,
  seed: string,
  commands: SharedCommand[],
  targetMinute?: number,
): SharedReplayResult
export function publicStateOf(state: SharedLiveState): SharedPublicState
export function lineupViewOf(
  result: SharedReplayResult,
  side: SharedSide,
  playerNameOf: (playerId: string) => string,
): SharedLineupView
export function getPlayer(id: string): { name: string } | undefined
