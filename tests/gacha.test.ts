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
