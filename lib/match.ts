import { BOTTOM_DIVISION } from './league'
import { hashString, seededRandom } from './random'
import { KNOBS, tune } from './tuning'
import { ENGINE_VERSION, runToEnd, toResult, type MatchSetup, type Venue } from './matchEngine'
import type { MatchResult } from './types'

export { HOME_ADVANTAGE } from './matchEngine'
export type { Venue, MatchSetup }

/** Friendlies pay this share of a league match. */
export const MINI_GAME_REWARD = KNOBS.miniGameReward.default

/**
 * The reward before any mode multiplier: result, the division's bonus, and a
 * little for every goal. Casual mode and the weekly league both start from
 * this so a win is worth the same "shape" everywhere; each applies its own
 * multiplier on top (casualGoldMultiplier here, competitiveGoldMultiplier and
 * the tier gradient in lib/weeklyLeague/rewards.ts).
 */
export function rawMatchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number {
  const base = result === 'W' ? 420 : result === 'D' ? 180 : 70
  const divisionBonus = (BOTTOM_DIVISION + 1 - division) * 60
  const share = result === 'W' ? divisionBonus : Math.round(divisionBonus / 3)
  return base + share + scoreFor * 30
}

export function matchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number {
  // Friendlies apply their own share on top of this (MINI_GAME_REWARD), so
  // this multiplier reaches every casual-mode reward — league and friendly.
  return Math.round(rawMatchReward(result, division, scoreFor) * tune('casualGoldMultiplier'))
}

let seedCounter = 0

/** A fresh seed for a match nobody asked to name one for. */
export function matchSeed(): string {
  seedCounter += 1
  return `m${Date.now().toString(36)}${seedCounter.toString(36)}${Math.floor(
    Math.random() * 46656,
  ).toString(36)}`
}

export interface MatchOptions extends MatchSetup {
  rng?: () => number
  /**
   * Recorded on the result and, when rng is not given directly, used to
   * derive it — so replaying this seed with the same engineVersion
   * reproduces the same match. Generated when omitted, so every match is
   * reproducible whether or not the caller cares to name one.
   */
  seed?: string
}

/**
 * Plays a whole match in one go. The live engine drives it tick by tick, so the
 * text mode and the spectator mode share exactly the same rules.
 */
export function simulateMatch({ rng, seed, ...setup }: MatchOptions): MatchResult {
  const resolvedSeed = seed ?? matchSeed()
  const resolvedRng = rng ?? seededRandom(hashString(resolvedSeed))
  const state = runToEnd(setup, resolvedRng)
  const result = toResult(state, setup, { seed: resolvedSeed, engineVersion: ENGINE_VERSION })
  return { ...result, reward: matchReward(result.result, setup.division, result.scoreFor) }
}
