import { BOTTOM_DIVISION } from './league'
import { runToEnd, toResult, type MatchSetup, type Venue } from './matchEngine'
import type { MatchResult } from './types'

export { HOME_ADVANTAGE } from './matchEngine'
export type { Venue, MatchSetup }

export function matchReward(result: 'W' | 'D' | 'L', division: number, scoreFor: number): number {
  const base = result === 'W' ? 420 : result === 'D' ? 180 : 70
  const divisionBonus = (BOTTOM_DIVISION + 1 - division) * 60
  const share = result === 'W' ? divisionBonus : Math.round(divisionBonus / 3)
  return base + share + scoreFor * 30
}

export interface MatchOptions extends MatchSetup {
  rng?: () => number
}

/**
 * Plays a whole match in one go. The live engine drives it tick by tick, so the
 * text mode and the spectator mode share exactly the same rules.
 */
export function simulateMatch({ rng = Math.random, ...setup }: MatchOptions): MatchResult {
  const state = runToEnd(setup, rng)
  const result = toResult(state, setup)
  return { ...result, reward: matchReward(result.result, setup.division, result.scoreFor) }
}
