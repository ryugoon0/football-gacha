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
  autoSub?: boolean
}

export function kickoffSquadOf(input: SharedRealSquadInput): SharedSquad

/** Opaque — built by buildWeeklyMatchSetup, consumed by the replay only. */
export type SharedMatchSetup = { readonly __brand: 'MatchSetup' }

export interface SharedSideMaterial {
  cards: SharedCard[]
  squad: SharedSquad
  division: number
  autoSub?: boolean
}

export interface SharedSnapshot {
  setup: SharedMatchSetup
  home: SharedSideMaterial
  away: SharedSideMaterial
  kickoffUtcMs?: number
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
  cardPlayed: Record<SharedSide, string | null>
}

export const TACTIC_CARDS: Record<string, { id: string; name: string; when: string; boost: number }>
export function isTacticCardId(value: unknown): boolean

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
  ball: { x: number; y: number }
  home: unknown[]
  away: unknown[]
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

export const TIERS: { maxRealUsers: number; aiBaseRating: number; rewardMultiplier: number }[]
export function rewardsForFixture(args: {
  tier: number
  kickoffUtcMs: number
  scoreHome: number
  scoreAway: number
  homeUserId: string | null
  awayUserId: string | null
  homeCommands: number
  awayCommands: number
}): { userId: string; kind: 'match' | 'hot_time'; amount: number }[]
export interface SharedSquadRatingLite {
  overall: number
  evaluations: { card: SharedCard | null; rating: number }[]
}
export function evaluateSquad(cards: SharedCard[], squad: SharedSquad, division?: number): SharedSquadRatingLite
export function starterAverageOf(rating: SharedSquadRatingLite): number
export function weeklyAiAnchor(realStarterAverages: number[], tierAiBaseRating: number, topTierAiBaseRating: number): number | undefined

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
