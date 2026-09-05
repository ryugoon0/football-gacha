import { describe, expect, it } from 'vitest'
import { BOTTOM_DIVISION } from '../lib/league'
import { MARKET_SIZE, dailyMarket, rollListings, transferPrice } from '../lib/market'
import { releasedPoolFor } from '../lib/gacha'
import { PLAYERS_BY_RARITY, getPlayer, seededRandom } from '../lib/players'

describe('transfer prices', () => {
  it('charges more for better players', () => {
    const normal = PLAYERS_BY_RARITY.Normal[0]
    // The top released grade — 월드 once legends exist, 플래티넘 until then.
    const world = releasedPoolFor('World')[0]
    expect(transferPrice(world)).toBeGreaterThan(transferPrice(normal) * 5)
    expect(transferPrice(normal, 5)).toBeGreaterThan(transferPrice(normal, 1))
  })
})

describe('listings', () => {
  it('offers five different players', () => {
    const listings = rollListings(BOTTOM_DIVISION, seededRandom(4))
    expect(listings).toHaveLength(MARKET_SIZE)
    expect(new Set(listings.map((item) => item.playerId)).size).toBe(MARKET_SIZE)
    for (const listing of listings) {
      expect(getPlayer(listing.playerId)).toBeDefined()
      expect(listing.price).toBeGreaterThan(0)
    }
  })

  it('stays the same all day and changes tomorrow', () => {
    const today = dailyMarket('2026-03-01', 3)
    expect(dailyMarket('2026-03-01', 3).listings).toEqual(today.listings)
    expect(dailyMarket('2026-03-02', 3).listings).not.toEqual(today.listings)
  })

  it('shows stronger players in the higher divisions', () => {
    const average = (division: number) => {
      const rng = seededRandom(12)
      let total = 0
      const rounds = 200
      for (let i = 0; i < rounds; i++) {
        const listings = rollListings(division, rng)
        total +=
          listings.reduce((sum, item) => sum + (getPlayer(item.playerId)?.ovr ?? 0), 0) /
          listings.length
      }
      return total / rounds
    }
    expect(average(1)).toBeGreaterThan(average(BOTTOM_DIVISION))
  })
})
