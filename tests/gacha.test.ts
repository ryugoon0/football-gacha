import { describe, expect, it } from 'vitest'
import { DRAW_TEN_SIZE, drawCost, drawMany, drawOne, rollRarity } from '../lib/gacha'
import { PLAYERS, PLAYERS_BY_RARITY, effectiveOvr, getPlayer } from '../lib/players'
import { RARITIES, RARITY_WEIGHTS } from '../lib/rarity'
import { seededRandom } from '../lib/players'

describe('roster', () => {
  it('has players of every rarity and a keeper in each', () => {
    for (const rarity of RARITIES) {
      const pool = PLAYERS_BY_RARITY[rarity]
      expect(pool.length).toBeGreaterThan(0)
      expect(pool.some((player) => player.position === 'GK')).toBe(true)
    }
  })

  it('gives every player a unique id and a sane overall', () => {
    const ids = new Set(PLAYERS.map((player) => player.id))
    expect(ids.size).toBe(PLAYERS.length)
    for (const player of PLAYERS) {
      expect(player.ovr).toBeGreaterThanOrEqual(40)
      expect(player.ovr).toBeLessThanOrEqual(99)
    }
  })

  it('raises every stat by one per training level', () => {
    const player = PLAYERS[0]
    expect(effectiveOvr(player, 3)).toBe(player.ovr + 2)
  })
})

describe('gacha rates', () => {
  it('rolls rarities close to the published table', () => {
    const rng = seededRandom(1234)
    const counts: Record<string, number> = {}
    const runs = 20000
    for (let i = 0; i < runs; i++) {
      const rarity = rollRarity(rng)
      counts[rarity] = (counts[rarity] ?? 0) + 1
    }
    for (const rarity of RARITIES) {
      const percent = ((counts[rarity] ?? 0) / runs) * 100
      expect(Math.abs(percent - RARITY_WEIGHTS[rarity])).toBeLessThan(2)
    }
  })

  it('always returns a known player', () => {
    const rng = seededRandom(7)
    for (let i = 0; i < 200; i++) {
      expect(getPlayer(drawOne(rng).id)).toBeDefined()
    }
  })

  it('guarantees a rare or better in a ten pull', () => {
    // An rng that always rolls into the Normal band.
    const alwaysNormal = () => 0.001
    const pulled = drawMany(DRAW_TEN_SIZE, alwaysNormal)
    expect(pulled).toHaveLength(DRAW_TEN_SIZE)
    expect(pulled.some((player) => player.rarity !== 'Normal')).toBe(true)
  })

  it('does not upgrade single pulls', () => {
    const pulled = drawMany(1, () => 0.001)
    expect(pulled[0].rarity).toBe('Normal')
  })

  it('charges less per card for the ten pull', () => {
    expect(drawCost(DRAW_TEN_SIZE) / DRAW_TEN_SIZE).toBeLessThan(drawCost(1))
  })
})

describe('packs and pity', () => {
  it('guarantees a Legend or better when the counter runs out', async () => {
    const { PITY_LIMIT, drawSession } = await import('../lib/gacha')
    const outcome = drawSession({ count: 1, pity: PITY_LIMIT - 1, rng: () => 0.001 })

    expect(outcome.pityHit).toBe(true)
    expect(['Legend', 'Live', 'World']).toContain(outcome.players[0].rarity)
    expect(outcome.pity).toBe(0)
  })

  it('counts up while nothing good comes out', async () => {
    const { drawSession } = await import('../lib/gacha')
    const outcome = drawSession({ count: 5, pity: 3, rng: () => 0.001 })
    expect(outcome.players.every((player) => player.rarity === 'Normal')).toBe(true)
    expect(outcome.pity).toBe(8)
    expect(outcome.pityHit).toBe(false)
  })

  it('resets the counter as soon as a Legend appears', async () => {
    const { drawSession } = await import('../lib/gacha')
    // 0.95 lands in the Live band, which is above Legend.
    const outcome = drawSession({ count: 1, pity: 12, rng: () => 0.95 })
    expect(outcome.pity).toBe(0)
  })

  it('keeps a position pack inside the chosen part of the pitch', async () => {
    const { drawSession } = await import('../lib/gacha')
    const { POSITION_GROUP } = await import('../lib/players')
    const rng = seededRandom(19)
    for (const group of ['GK', 'DF', 'MF', 'FW'] as const) {
      const outcome = drawSession({ count: 10, group, rng })
      for (const player of outcome.players) {
        expect(POSITION_GROUP[player.position]).toBe(group)
      }
    }
  })

  it('never drops below the pack floor', async () => {
    const { drawSession, packOf } = await import('../lib/gacha')
    const pack = packOf('rarePlus')
    const outcome = drawSession({
      count: 20,
      minRarity: pack.minRarity,
      rng: seededRandom(5),
    })
    expect(outcome.players.some((player) => player.rarity === 'Normal')).toBe(false)
  })

  it('rotates the featured player weekly and favours them', async () => {
    const { drawSession, featuredPlayer } = await import('../lib/gacha')
    const thisWeek = featuredPlayer('2026-08-31')
    expect(featuredPlayer('2026-08-31').id).toBe(thisWeek.id)
    expect(['Legend', 'Live', 'World']).toContain(thisWeek.rarity)

    const weeks = new Set(
      ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'].map(
        (week) => featuredPlayer(week).id,
      ),
    )
    expect(weeks.size).toBeGreaterThan(1)

    // At the featured rarity the pick-up should show up far more than a plain roll.
    const rng = seededRandom(31)
    let hits = 0
    const runs = 400
    for (let i = 0; i < runs; i++) {
      const outcome = drawSession({
        count: 1,
        featured: thisWeek,
        minRarity: thisWeek.rarity,
        rng,
      })
      if (outcome.players[0].id === thisWeek.id) hits++
    }
    expect(hits / runs).toBeGreaterThan(0.3)
  })
})

describe('shards', () => {
  it('pays more for rarer cards', async () => {
    const { SHARD_VALUES, shardsFor } = await import('../lib/shards')
    const normal = { uid: 'a', playerId: 'n01', level: 1, condition: 100, injuredFor: 0, exp: 0 }
    const world = { ...normal, playerId: 'w01' }
    expect(shardsFor(world)).toBeGreaterThan(shardsFor(normal))
    expect(shardsFor(normal)).toBe(SHARD_VALUES.Normal)
    expect(shardsFor({ ...normal, level: 5 })).toBeGreaterThan(shardsFor(normal))
  })

  it('exchanges for the rarity that was paid for', async () => {
    const { SHARD_OFFERS, exchangeResult } = await import('../lib/shards')
    for (const offer of SHARD_OFFERS) {
      expect(exchangeResult(offer.rarity, seededRandom(3)).rarity).toBe(offer.rarity)
    }
  })
})
