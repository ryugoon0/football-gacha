import { describe, expect, it } from 'vitest'
import { DRAW_TEN_SIZE, drawCost, drawMany, drawOne, rollRarity } from '../lib/gacha'
import { PLAYERS, PLAYERS_BY_RARITY, effectiveOvr, getPlayer } from '../lib/players'
import { RARITIES } from '../lib/rarity'
import { seededRandom } from '../lib/players'

describe('roster', () => {
  it('has players of every regular rarity and a keeper in each', () => {
    for (const rarity of RARITIES) {
      const pool = PLAYERS_BY_RARITY[rarity]
      // 월드 is reserved for past-season legends: a handful of cards, no keeper required.
      if (rarity === 'World') continue
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

  it('grows a card towards 99 as it levels', async () => {
    const { levelCap, startLevel } = await import('../lib/players')
    const player = PLAYERS_BY_RARITY.Legend[0]
    const start = startLevel(player)
    expect(effectiveOvr(player, start)).toBeLessThan(effectiveOvr(player, start + 2))
    expect(effectiveOvr(player, levelCap(player))).toBeGreaterThan(effectiveOvr(player, start))
    expect(effectiveOvr(player, levelCap(player))).toBeLessThanOrEqual(99)
  })
})

describe('gacha rates', () => {
  it('rolls each pack close to its own published table', async () => {
    const { PACK_RATES } = await import('../lib/gacha')
    for (const family of ['basic', 'premium', 'world'] as const) {
      const rates = PACK_RATES[family]
      const rng = seededRandom(1234)
      const counts: Record<string, number> = {}
      const runs = 20000
      for (let i = 0; i < runs; i++) {
        const rarity = rollRarity(rng, null, rates)
        counts[rarity] = (counts[rarity] ?? 0) + 1
      }
      for (const key of [...RARITIES, 'Limited'] as const) {
        const percent = ((counts[key] ?? 0) / runs) * 100
        expect(Math.abs(percent - (rates[key] ?? 0))).toBeLessThan(2)
      }
    }
  })

  it('gives the premium pack much better odds than the basic one', async () => {
    const { PACK_RATES } = await import('../lib/gacha')
    const high = (rates: (typeof PACK_RATES)['basic']) =>
      rates.Legend + rates.Live + rates.World
    expect(high(PACK_RATES.premium)).toBeGreaterThan(high(PACK_RATES.basic) * 3)
    for (const rates of Object.values(PACK_RATES)) {
      const total = RARITIES.reduce((sum, rarity) => sum + rates[rarity], 0) + (rates.Limited ?? 0)
      expect(total).toBeCloseTo(100)
    }
    // 월드: never from basic, a sliver from premium, the 월드 pack's own slice.
    expect(PACK_RATES.basic.World).toBe(0)
    expect(PACK_RATES.premium.World).toBeGreaterThan(0)
    expect(PACK_RATES.premium.World).toBeLessThan(1)
    expect(PACK_RATES.world.World).toBeGreaterThan(0)
    expect(PACK_RATES.world.Live + PACK_RATES.world.World).toBeCloseTo(100)
  })

  it('opens a 리미티드 bucket in the premium table only while a window is open, out of 일반·실버·골드', async () => {
    const { packRates } = await import('../lib/gacha')
    const { LIMITED_SCHEDULE } = await import('../lib/limited')
    const batch = LIMITED_SCHEDULE[0]
    const before = packRates('premium', Date.parse(batch.from) - 1000)
    const during = packRates('premium', Date.parse(batch.from) + 1000)
    expect(before.Limited).toBeUndefined()
    expect(during.Limited).toBeGreaterThan(0)
    expect(during.Live).toBe(before.Live)
    expect(during.Rare).toBeLessThan(before.Rare)
    expect(during.Legend).toBeLessThan(before.Legend)
    expect(during.Normal).toBeLessThan(before.Normal)
    expect(packRates('basic', Date.parse(batch.from) + 1000).Limited).toBeUndefined()
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
    // 0.999 lands in the top (플래티넘) band of the basic table, which is above Legend.
    const outcome = drawSession({ count: 1, pity: 12, rng: () => 0.999 })
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

  it('honours a pack guarantee in a multi pull', async () => {
    const { drawSession, packOf } = await import('../lib/gacha')
    const pack = packOf('premiumTen')
    expect(pack.guarantee).toBe('Legend')

    // An rng that always rolls into the lowest band still has to produce one.
    const outcome = drawSession({
      count: pack.count,
      guarantee: pack.guarantee,
      rates: pack.rates,
      rng: () => 0.001,
    })
    expect(outcome.players).toHaveLength(pack.count)
    expect(
      outcome.players.some((player) => ['Legend', 'Live', 'World'].includes(player.rarity)),
    ).toBe(true)
  })

  it('splits packs into a basic and a premium family', async () => {
    const { PACKS, packsOfFamily } = await import('../lib/gacha')
    expect(PACKS).toHaveLength(5)
    expect(packsOfFamily('basic').map((pack) => pack.id)).toEqual(['basic', 'basicTen'])
    expect(packsOfFamily('premium').map((pack) => pack.id)).toEqual(['premium', 'premiumTen'])
    expect(packsOfFamily('world').map((pack) => pack.id)).toEqual(['world'])
    expect(packsOfFamily('world')[0].cost).toBe(0)
    for (const pack of packsOfFamily('premium')) {
      const cheaper = packsOfFamily('basic').find((item) => item.count === pack.count)!
      expect(pack.cost).toBeGreaterThan(cheaper.cost)
    }
  })

  it('rotates the featured player weekly and favours them', async () => {
    const { drawSession, featuredPlayer } = await import('../lib/gacha')
    const thisWeek = featuredPlayer('2026-08-31')
    expect(featuredPlayer('2026-08-31').id).toBe(thisWeek.id)
    expect(['Legend', 'Live']).toContain(thisWeek.rarity)

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
    const normal = { uid: 'a', playerId: 'n01', level: 2, limit: 3, condition: 100, injuredFor: 0, exp: 0 }
    const world = { ...normal, playerId: 'w01' }
    expect(shardsFor(world)).toBeGreaterThan(shardsFor(normal))
    expect(shardsFor(normal)).toBe(SHARD_VALUES.Normal)
    expect(shardsFor({ ...normal, level: 5 })).toBeGreaterThan(shardsFor(normal))
  })

  it('exchanges for the rarity that was paid for', async () => {
    const { SHARD_OFFERS, exchangeResult } = await import('../lib/shards')
    for (const offer of SHARD_OFFERS) {
      // A grade with nothing released yet (월드 before the legends) hands out the grade below.
      const expected = PLAYERS_BY_RARITY[offer.rarity].length > 0 ? offer.rarity : 'Live'
      expect(exchangeResult(offer.rarity, seededRandom(3)).rarity).toBe(expected)
    }
  })
})
