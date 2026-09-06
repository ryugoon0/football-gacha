import { describe, expect, it } from 'vitest'
import { DRAW_FAILURE_MESSAGE } from '../lib/serverDraw'
import { PACKS, PACK_RATES, drawSession, pickupWeekKey } from '../lib/gacha'
import { RARITIES } from '../lib/rarity'

describe('the pick-up week is one shared decision', () => {
  it('puts everyone in the same week regardless of device timezone', () => {
    // 09:00 KST on a Monday is 00:00 UTC the same day; both must agree.
    const utcMidnight = new Date('2026-09-07T00:00:00Z')
    const lateSunday = new Date('2026-09-06T15:30:00Z') // 00:30 Monday KST
    expect(pickupWeekKey(utcMidnight)).toBe(pickupWeekKey(lateSunday))
  })

  it('rolls over to a new key across the boundary', () => {
    const before = new Date('2026-09-06T14:00:00Z') // 23:00 Sunday KST
    const after = new Date('2026-09-06T16:00:00Z') // 01:00 Monday KST
    expect(pickupWeekKey(before)).not.toBe(pickupWeekKey(after))
  })

  it('always lands on a Monday', () => {
    for (let day = 1; day <= 28; day++) {
      const key = pickupWeekKey(new Date(Date.UTC(2026, 8, day, 3, 0, 0)))
      expect(new Date(`${key}T00:00:00Z`).getUTCDay()).toBe(1)
    }
  })
})

describe('the odds the server will use', () => {
  it('every pack has a rate table that sums to 100', () => {
    for (const rates of Object.values(PACK_RATES)) {
      const total = RARITIES.reduce((sum, rarity) => sum + rates[rarity], 0) + (rates.Limited ?? 0)
      expect(total).toBeCloseTo(100, 6)
    }
  })

  it('gives every pack a cost and a count the server can charge for', () => {
    for (const pack of PACKS) {
      expect(pack.cost).toBeGreaterThanOrEqual(0)
      expect(pack.count).toBeGreaterThan(0)
    }
  })

  it('honours a pack guarantee, which is what the server settles on', () => {
    const pack = PACKS.find((item) => item.guarantee)
    expect(pack).toBeDefined()
    if (!pack) return
    let seed = 7
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const order = RARITIES.indexOf(pack.guarantee!)
    const outcome = drawSession({
      count: pack.count,
      guarantee: pack.guarantee ?? null,
      rates: pack.rates,
      rng,
    })
    expect(outcome.players.some((p) => RARITIES.indexOf(p.rarity) >= order)).toBe(true)
  })
})

describe('a failed pull never falls back to the browser', () => {
  it('has a message for every way the server can refuse', () => {
    for (const key of ['offline', 'not signed in', 'not enough gold', 'not seeded', 'unavailable']) {
      expect(DRAW_FAILURE_MESSAGE[key as keyof typeof DRAW_FAILURE_MESSAGE]).toBeTruthy()
    }
  })
})

describe('crossing onto the ledger', () => {
  it('has a message for a player whose migration has not run yet', () => {
    // Reaching this at all means the retry could not fix it, so the wording
    // has to tell the person to try again rather than blame them.
    expect(DRAW_FAILURE_MESSAGE['not seeded']).toContain('다시 시도')
  })
})
