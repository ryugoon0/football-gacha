import { describe, expect, it } from 'vitest'
import { applyExperience, expForLevel, matchRatings, maxLevelOf } from '../lib/growth'
import { PLAYERS, PLAYERS_BY_RARITY, getPlayer, seededRandom } from '../lib/players'
import { subStatsOf } from '../lib/subStats'
import { STAT_GROUPS } from '../lib/subStats'
import { TRAITS, playerTraitFactors, teamTraitEffects, traitsOf } from '../lib/traits'
import type { Card } from '../lib/types'

const card = (uid: string, playerId: string, level = 1, exp = 0): Card => ({
  uid,
  playerId,
  level,
  condition: 100,
  injuredFor: 0,
  exp,
})

describe('sub stats', () => {
  it('averages back to the headline stat', () => {
    for (const player of PLAYERS.slice(0, 12)) {
      for (const group of STAT_GROUPS) {
        const subs = subStatsOf(player, group)
        expect(subs).toHaveLength(3)
        const mean = subs.reduce((sum, item) => sum + item.value, 0) / subs.length
        // Clamping at the extremes can shift the mean by a point.
        expect(Math.abs(mean - player.stats[group])).toBeLessThanOrEqual(1.5)
      }
    }
  })

  it('is stable for the same player and grows with training', () => {
    const player = PLAYERS_BY_RARITY.Legend[0]
    expect(subStatsOf(player, 'sho')).toEqual(subStatsOf(player, 'sho'))
    const base = subStatsOf(player, 'sho')[0].value
    expect(subStatsOf(player, 'sho', 5)[0].value).toBeGreaterThan(base)
  })
})

describe('traits', () => {
  it('gives every player at most three, always from the catalogue', () => {
    for (const player of PLAYERS) {
      const traits = traitsOf(player)
      expect(traits.length).toBeLessThanOrEqual(3)
      for (const trait of traits) expect(TRAITS[trait]).toBeDefined()
    }
  })

  it('hands out traits to the players who earn them', () => {
    const withTraits = PLAYERS.filter((player) => traitsOf(player).length > 0)
    expect(withTraits.length).toBeGreaterThan(10)
    // The best players are far likelier to have one than the worst.
    const elite = PLAYERS.filter((p) => p.ovr >= 85)
    expect(elite.every((player) => traitsOf(player).length > 0)).toBe(true)
  })

  it('caps what a squad can stack', () => {
    const stacked = teamTraitEffects(PLAYERS_BY_RARITY.World.concat(PLAYERS_BY_RARITY.Live))
    expect(stacked.goal).toBeLessThanOrEqual(0.08)
    expect(stacked.concede).toBeLessThanOrEqual(0.08)
    expect(stacked.tempo).toBeLessThanOrEqual(1.18)
    expect(stacked.chemistry).toBeLessThanOrEqual(12)
  })

  it('changes how a player wears down', () => {
    const ironman = PLAYERS.find((player) => traitsOf(player).includes('ironman'))
    const glass = PLAYERS.find((player) => traitsOf(player).includes('glass'))
    if (ironman) expect(playerTraitFactors(ironman).conditionDrain).toBeLessThan(1)
    if (glass) expect(playerTraitFactors(glass).injuryRisk).toBeGreaterThan(1)
    expect(playerTraitFactors(undefined)).toEqual({ conditionDrain: 1, injuryRisk: 1 })
  })
})

describe('potential', () => {
  it('never exceeds ten and rewards the better cards', () => {
    for (const player of PLAYERS) {
      expect(maxLevelOf(player)).toBeGreaterThanOrEqual(5)
      expect(maxLevelOf(player)).toBeLessThanOrEqual(10)
    }
    expect(maxLevelOf(PLAYERS_BY_RARITY.World[0])).toBe(10)
    const normalAverage =
      PLAYERS_BY_RARITY.Normal.reduce((sum, player) => sum + maxLevelOf(player), 0) /
      PLAYERS_BY_RARITY.Normal.length
    const legendAverage =
      PLAYERS_BY_RARITY.Legend.reduce((sum, player) => sum + maxLevelOf(player), 0) /
      PLAYERS_BY_RARITY.Legend.length
    expect(legendAverage).toBeGreaterThan(normalAverage)
  })
})

describe('match ratings', () => {
  const striker = getPlayer('n20')!
  const keeper = getPlayer('n01')!

  it('rewards goals and results', () => {
    const rng = seededRandom(2)
    const [scorer] = matchRatings(
      [{ uid: 'a', player: striker, position: 'ST' }],
      { result: 'W', scoreAgainst: 1 },
      ['a', 'a'],
      rng,
    )
    const [quiet] = matchRatings(
      [{ uid: 'a', player: striker, position: 'ST' }],
      { result: 'L', scoreAgainst: 3 },
      [],
      rng,
    )
    expect(scorer.goals).toBe(2)
    expect(scorer.rating).toBeGreaterThan(quiet.rating)
    expect(scorer.exp).toBeGreaterThan(quiet.exp)
    expect(scorer.rating).toBeLessThanOrEqual(10)
    expect(quiet.rating).toBeGreaterThanOrEqual(4)
  })

  it('gives the keeper credit for a clean sheet', () => {
    const rng = seededRandom(8)
    const [clean] = matchRatings(
      [{ uid: 'g', player: keeper, position: 'GK' }],
      { result: 'W', scoreAgainst: 0 },
      [],
      rng,
    )
    const rng2 = seededRandom(8)
    const [beaten] = matchRatings(
      [{ uid: 'g', player: keeper, position: 'GK' }],
      { result: 'W', scoreAgainst: 2 },
      [],
      rng2,
    )
    expect(clean.rating).toBeGreaterThan(beaten.rating)
  })
})

describe('experience', () => {
  it('levels a card up once it banks enough', () => {
    const player = PLAYERS_BY_RARITY.Rare[0]
    const cards = [card('a', player.id, 1, expForLevel(1) - 5)]
    const { cards: next, levelUps } = applyExperience(cards, [
      { uid: 'a', name: player.name, rating: 8, goals: 1, exp: 30 },
    ])

    expect(next[0].level).toBe(2)
    expect(next[0].exp).toBeLessThan(expForLevel(2))
    expect(levelUps).toHaveLength(1)
    expect(levelUps[0].name).toBe(player.name)
  })

  it('stops at the potential ceiling', () => {
    const player = PLAYERS_BY_RARITY.Normal.find((item) => maxLevelOf(item) < 10)!
    const ceiling = maxLevelOf(player)
    const cards = [card('a', player.id, ceiling, 0)]
    const { cards: next, levelUps } = applyExperience(cards, [
      { uid: 'a', name: player.name, rating: 10, goals: 3, exp: 9999 },
    ])

    expect(next[0].level).toBe(ceiling)
    expect(next[0].exp).toBe(0)
    expect(levelUps).toHaveLength(0)
  })

  it('leaves players who did not appear alone', () => {
    const cards = [card('a', 'n01'), card('b', 'n02')]
    const { cards: next } = applyExperience(cards, [
      { uid: 'a', name: '', rating: 7, goals: 0, exp: 20 },
    ])
    expect(next[1]).toBe(cards[1])
    expect(next[0].exp).toBe(20)
  })
})
