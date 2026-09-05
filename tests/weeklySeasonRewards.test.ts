import { afterEach, describe, expect, it } from 'vitest'
import { KNOBS, resetTuning, setTuning } from '../lib/tuning'
import {
  BEST_ELEVEN_PRIOR,
  bestElevenReward,
  bestElevenScore,
  cupReward,
  individualAwardReward,
  mastersReward,
  seasonRankKnob,
  seasonRankReward,
} from '../lib/weeklyLeague/rewards'

afterEach(() => resetTuning())

describe('주간 시즌 보상', () => {
  it('maps every final rank onto a band knob, in descending order of pay', () => {
    expect(seasonRankKnob(1)).toBe('weeklySeasonRank1')
    expect(seasonRankKnob(2)).toBe('weeklySeasonRank2')
    expect(seasonRankKnob(3)).toBe('weeklySeasonRank3')
    expect(seasonRankKnob(4)).toBe('weeklySeasonRank4to8')
    expect(seasonRankKnob(8)).toBe('weeklySeasonRank4to8')
    expect(seasonRankKnob(9)).toBe('weeklySeasonRank9to13')
    expect(seasonRankKnob(13)).toBe('weeklySeasonRank9to13')
    expect(seasonRankKnob(14)).toBe('weeklySeasonRank14to16')
    expect(seasonRankKnob(16)).toBe('weeklySeasonRank14to16')
    const pays = Array.from({ length: 16 }, (_, i) => seasonRankReward(i + 1, 0))
    for (let i = 1; i < pays.length; i++) expect(pays[i]).toBeLessThanOrEqual(pays[i - 1])
    expect(pays[15]).toBeGreaterThan(0)
  })

  it('applies the tier gradient and the competitive multiplier like match gold', () => {
    const base = KNOBS.weeklySeasonRank1.default
    expect(seasonRankReward(1, 0)).toBe(Math.round(base * KNOBS.weeklyTierMultiplier0.default * KNOBS.competitiveGoldMultiplier.default))
    expect(seasonRankReward(1, 3)).toBe(Math.round(base * KNOBS.weeklyTierMultiplier3.default * KNOBS.competitiveGoldMultiplier.default))
    expect(seasonRankReward(1, 3)).toBeLessThan(seasonRankReward(1, 0))
    // Preview rates win over the saved knobs, so the operator table moves with the slider.
    expect(seasonRankReward(1, 0, { weeklySeasonRank1: 1000, weeklyTierMultiplier0: 1, competitiveGoldMultiplier: 1 })).toBe(1000)
  })

  it('reads the saved knobs the operator changed', () => {
    setTuning({ weeklyCupWinner: 20000, weeklyTierMultiplier1: 0.5, competitiveGoldMultiplier: 1 })
    expect(cupReward('winner', 1)).toBe(10000)
    expect(cupReward('runnerUp', 1)).toBe(Math.round(KNOBS.weeklyCupRunnerUp.default * 0.5))
    expect(mastersReward(1)).toBe(Math.round(KNOBS.weeklyMastersWinner.default * 0.5))
    expect(bestElevenReward(1)).toBe(Math.round(KNOBS.weeklyBestElevenBonus.default * 0.5))
    expect(individualAwardReward(1)).toBe(Math.round(KNOBS.weeklyIndividualAward.default * 0.5))
  })

  it('shrinks a short brilliant run below a long consistent one', () => {
    // Three 9.0s versus thirty 8.0s: the prior pulls the sample of three down harder.
    expect(bestElevenScore(27, 3)).toBeLessThan(bestElevenScore(240, 30))
    // With no games the score is the prior itself; with many it approaches the mean.
    expect(bestElevenScore(0, 0)).toBeCloseTo(BEST_ELEVEN_PRIOR)
    expect(bestElevenScore(8 * 1000, 1000)).toBeCloseTo(8, 1)
  })
})
