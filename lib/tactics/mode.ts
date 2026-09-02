import type { PhasedTactics } from './phases'

/**
 * How much of the tactics system a manager wants to use.
 *
 * - `sliders`: the 21 dials and nothing else. One set of instructions the team
 *   follows all match, which is how most football games work.
 * - `phased`: the dials plus per-situation overrides, so the same team can
 *   press on losing the ball and sit deep once the opponent has settled.
 *
 * Both are real settings, not screens: a plan run in `sliders` mode ignores its
 * phase overrides in the match too, so switching modes changes how the team
 * actually plays and the two can be compared on the same save.
 */
export type TacticsMode = 'sliders' | 'phased'

export const TACTICS_MODES: TacticsMode[] = ['sliders', 'phased']

export const TACTICS_MODE_LABELS: Record<TacticsMode, string> = {
  sliders: '슬라이더',
  phased: '국면 분리',
}

export const TACTICS_MODE_NOTES: Record<TacticsMode, string> = {
  sliders: '21개 값 하나로 90분을 지시합니다. 단순하고, 상황을 가리지 않습니다.',
  phased: '네 상황마다 다르게 지시합니다. 손은 더 가지만 훨씬 정교합니다.',
}

/**
 * The plan as the chosen mode plays it. In slider mode the phase overrides are
 * dropped for the match but left untouched in the save, so switching back
 * restores them exactly.
 */
export function planForMode(plan: PhasedTactics, mode: TacticsMode): PhasedTactics {
  return mode === 'phased' ? plan : { base: plan.base }
}
