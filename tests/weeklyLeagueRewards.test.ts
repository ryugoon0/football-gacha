import { describe, expect, it } from 'vitest'
import { matchReward } from '../lib/match'
import { tune } from '../lib/tuning'
import { HOT_TIME_HOURS_KST, TIERS } from '../lib/weeklyLeague/config'
import {
  hotTimeBonus,
  isHotTime,
  outcomeOf,
  rewardsForFixture,
  weeklyMatchReward,
} from '../lib/weeklyLeague/rewards'

/** A KST wall-clock hour on 2026-09-08, as UTC ms. */
const kstHour = (hour: number) => Date.UTC(2026, 8, 8, hour - 9, 0, 0)

describe('weekly match reward', () => {
  it('pays more for a win than a draw than a loss, and more with goals', () => {
    expect(weeklyMatchReward('W', 0, 2)).toBeGreaterThan(weeklyMatchReward('D', 0, 2))
    expect(weeklyMatchReward('D', 0, 2)).toBeGreaterThan(weeklyMatchReward('L', 0, 2))
    expect(weeklyMatchReward('W', 0, 3)).toBeGreaterThan(weeklyMatchReward('W', 0, 1))
  })

  it('pays the top tier more than each lower tier for the same result', () => {
    const wins = TIERS.map((_, tier) => weeklyMatchReward('W', tier, 1))
    for (let i = 1; i < wins.length; i++) expect(wins[i]).toBeLessThan(wins[i - 1])
  })

  it('shares casual mode reward shape, scaled by the competitive multiplier', () => {
    // Tier 0 = division 1, tier multiplier 1.0: only competitiveGoldMultiplier differs from casual.
    const casual = matchReward('W', 1, 2) / tune('casualGoldMultiplier')
    expect(weeklyMatchReward('W', 0, 2)).toBe(Math.round(casual * tune('competitiveGoldMultiplier')))
  })

  it('reads the outcome from the score', () => {
    expect(outcomeOf(2, 1)).toBe('W')
    expect(outcomeOf(1, 1)).toBe('D')
    expect(outcomeOf(0, 3)).toBe('L')
  })
})

describe('핫타임', () => {
  it('is the configured KST kick-off hours only', () => {
    for (const hour of HOT_TIME_HOURS_KST) expect(isHotTime(kstHour(hour))).toBe(true)
    expect(isHotTime(kstHour(10))).toBe(false)
    expect(isHotTime(kstHour(20))).toBe(false)
  })

  it('pays the bonus only to a manager who actually sent an order', () => {
    expect(hotTimeBonus(kstHour(15), 1)).toBe(tune('hotTimeBonus'))
    expect(hotTimeBonus(kstHour(15), 0)).toBe(0)
    expect(hotTimeBonus(kstHour(12), 3)).toBe(0)
  })
})

describe('rewards for a fixture', () => {
  it('pays each real side its match gold and the bonus where earned, and AI nothing', () => {
    const lines = rewardsForFixture({
      tier: 1,
      kickoffUtcMs: kstHour(21),
      scoreHome: 2,
      scoreAway: 2,
      homeUserId: 'user-home',
      awayUserId: null,
      homeCommands: 2,
      awayCommands: 0,
    })
    expect(lines.filter((line) => line.userId === 'user-home').map((line) => line.kind).sort()).toEqual(['hot_time', 'match'])
    expect(lines.some((line) => line.userId !== 'user-home')).toBe(false)
    const match = lines.find((line) => line.kind === 'match')!
    expect(match.amount).toBe(weeklyMatchReward('D', 1, 2))
  })

  it('gives the winner more than the loser in a real-vs-real fixture', () => {
    const lines = rewardsForFixture({
      tier: 0,
      kickoffUtcMs: kstHour(11),
      scoreHome: 3,
      scoreAway: 0,
      homeUserId: 'a',
      awayUserId: 'b',
      homeCommands: 0,
      awayCommands: 0,
    })
    const a = lines.find((line) => line.userId === 'a')!
    const b = lines.find((line) => line.userId === 'b')!
    expect(a.amount).toBeGreaterThan(b.amount)
    expect(lines.some((line) => line.kind === 'hot_time')).toBe(false)
  })
})
