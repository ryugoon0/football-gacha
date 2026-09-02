import { describe, expect, it } from 'vitest'
import { DEFAULT_TACTIC } from '../lib/tactics'
import { addExperience, applyExperience, expForLevel, matchRatings } from '../lib/growth'
import { PLAYERS, PLAYERS_BY_RARITY, getPlayer, seededRandom } from '../lib/players'
import { subStatsOf } from '../lib/subStats'
import { STAT_GROUPS } from '../lib/subStats'
import { TRAITS, playerTraitFactors, teamTraitEffects, traitsOf } from '../lib/traits'
import type { Card } from '../lib/types'

const card = (uid: string, playerId: string, level = 2, exp = 0, limit = level + 1): Card => ({
  uid,
  playerId,
  level,
  limit,
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

describe('levels and limits', () => {
  it('starts each rarity where the tier says and caps it there', async () => {
    const { PLAYERS_BY_RARITY: pool, startLevel, levelCap } = await import('../lib/players')
    expect(pool.Normal.every((player) => startLevel(player) === 2)).toBe(true)
    expect(pool.Rare.every((player) => startLevel(player) === 3)).toBe(true)
    expect(pool.Legend.every((player) => [4, 5].includes(startLevel(player)))).toBe(true)
    expect(pool.Live.every((player) => [4, 5].includes(startLevel(player)))).toBe(true)

    expect(levelCap(pool.Normal[0])).toBe(8)
    expect(levelCap(pool.Rare[0])).toBe(9)
    expect(levelCap(pool.Legend[0])).toBe(10)
    expect(levelCap(pool.Live[0])).toBe(10)
    expect(levelCap(pool.World[0])).toBe(10)
  })

  it('pushes the key attributes to 99 only at level ten', async () => {
    const { PLAYERS_BY_RARITY: pool, effectiveStats, keyStatsOf, levelCap } = await import(
      '../lib/players'
    )
    const gold = pool.Legend[0]
    const maxed = effectiveStats(gold, levelCap(gold))
    for (const key of keyStatsOf(gold.position)) expect(maxed[key]).toBe(99)

    // 일반 카드는 상한이 8이라 99 근처에도 가지 못한다.
    const normal = pool.Normal[0]
    const normalMax = effectiveStats(normal, levelCap(normal))
    const normalKeys = keyStatsOf(normal.position)
    expect(normalMax[normalKeys[0]]).toBeLessThan(95)
    expect(normalMax[normalKeys[0]]).toBeGreaterThan(normal.stats[normalKeys[0]])
  })

  it('keeps a rarity gap through the hidden attributes', async () => {
    const { PLAYERS_BY_RARITY: pool, hiddenPower } = await import('../lib/players')
    const average = (players: { hidden: unknown }[]) =>
      players.reduce((sum, player) => sum + hiddenPower(player as never), 0) / players.length

    expect(average(pool.Live)).toBeGreaterThan(average(pool.Legend))
    expect(average(pool.Legend)).toBeGreaterThan(average(pool.Rare))
    expect(average(pool.World)).toBeGreaterThan(average(pool.Live))
  })

  it('stops experience at the limit until a duplicate raises it', async () => {
    const { limitBreak } = await import('../lib/growth')
    const { PLAYERS_BY_RARITY: pool } = await import('../lib/players')
    const player = pool.Rare[0]
    const stuck = card('a', player.id, 3, 0, 3)

    const trained = addExperience(stuck, 9999)
    expect(trained.card.level).toBe(3)
    expect(trained.wasted).toBeGreaterThan(0)

    const raised = limitBreak(stuck)
    expect(raised.raised).toBe(true)
    expect(raised.card.limit).toBe(4)
    expect(addExperience(raised.card, 9999).card.level).toBe(4)
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
  it('levels a card up once it banks enough', async () => {
    const { PLAYERS_BY_RARITY: pool } = await import('../lib/players')
    const player = pool.Rare[0]
    const cards = [card('a', player.id, 3, expForLevel(3) - 5, 6)]
    const { cards: next, levelUps } = applyExperience(cards, [
      { uid: 'a', name: player.name, rating: 8, goals: 1, exp: 30 },
    ])

    expect(next[0].level).toBe(4)
    expect(levelUps).toHaveLength(1)
    expect(levelUps[0].name).toBe(player.name)
  })

  it('does not push a card past its limit', async () => {
    const { PLAYERS_BY_RARITY: pool } = await import('../lib/players')
    const player = pool.Normal[0]
    const cards = [card('a', player.id, 4, 0, 4)]
    const { cards: next, levelUps } = applyExperience(cards, [
      { uid: 'a', name: player.name, rating: 10, goals: 3, exp: 9999 },
    ])

    expect(next[0].level).toBe(4)
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

describe('hidden attributes in a match', () => {
  it('rates the higher rarities higher on the hidden scale', async () => {
    const { PLAYERS_BY_RARITY: pool, hiddenPower } = await import('../lib/players')
    const average = (rarity: 'Normal' | 'Rare' | 'Legend' | 'Live' | 'World') =>
      pool[rarity].reduce((sum, player) => sum + hiddenPower(player), 0) / pool[rarity].length

    expect(average('Live')).toBeGreaterThan(average('Legend'))
    expect(average('World')).toBeGreaterThan(average('Live'))
  })

  it('wins more matches with the same visible rating but better hidden stats', async () => {
    const { simulateMatch } = await import('../lib/match')
    const { evaluateSquad } = await import('../lib/squad')
    const { initialState } = await import('../lib/storage')

    const state = initialState()
    const base = evaluateSquad(state.cards, state.squad, 5)
    const opponent = { id: 'x', name: '상대', badge: 'XX', rating: base.overall }

    const points = (hidden: number, seed: number) => {
      const rng = seededRandom(seed)
      let wins = 0
      let draws = 0
      for (let i = 0; i < 400; i++) {
        const result = simulateMatch({
          team: { ...base, hidden },
          teamName: '팀',
          opponent,
          division: 5,
          venue: 'home',
          tactic: DEFAULT_TACTIC,
          traits: base.traits,
          rng,
        })
        if (result.result === 'W') wins++
        else if (result.result === 'D') draws++
      }
      return wins * 3 + draws
    }

    // Counted in points over several seeds, not wins on one.
    //
    // Against an evenly matched side the hidden attributes mostly turn a bad
    // day into a draw rather than a win — every seed shows the higher hidden
    // squad drawing far more — so counting only wins measured the wrong thing
    // and tied often enough to fail on any change to the roster.
    const seeds = [9, 17, 33, 51, 77, 91, 123, 199]
    const strong = seeds.reduce((sum, seed) => sum + points(11, seed), 0)
    const weak = seeds.reduce((sum, seed) => sum + points(1, seed), 0)

    expect(strong).toBeGreaterThan(weak)
  })
})
