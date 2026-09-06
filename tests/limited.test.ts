import { describe, expect, it } from 'vitest'
import { drawSession, featuredPlayer, limitedPool, releasedPoolFor } from '../lib/gacha'
import { LIMITED_SCHEDULE, limitedOpen, limitedPhase } from '../lib/limited'
import { PLAYERS, PLAYERS_BY_RARITY } from '../lib/players'
import { seededRandom } from '../lib/random'
import type { PlayerDef } from '../lib/types'

const batch = LIMITED_SCHEDULE[0]
const before = Date.parse(batch.teaseFrom) + 60_000
const during = Date.parse(batch.from) + 60_000
const after = Date.parse(batch.to) + 60_000

const fake = (limited: PlayerDef['limited']): PlayerDef => ({ ...PLAYERS_BY_RARITY.Live[0], id: 'fake-limited', limited })

describe('리미티드 windows', () => {
  it('opens a card only inside its window and leaves ordinary cards alone', () => {
    const card = fake({ label: batch.label, from: batch.from, to: batch.to })
    expect(limitedOpen(card, before)).toBe(false)
    expect(limitedOpen(card, during)).toBe(true)
    expect(limitedOpen(card, after)).toBe(false)
    expect(limitedOpen(PLAYERS_BY_RARITY.Live[0], before)).toBe(true)
  })

  it('tells the screen what to show: teaser before, active during, nothing after', () => {
    expect(limitedPhase(before).phase).toBe('teaser')
    expect(limitedPhase(during).phase).toBe('active')
    expect(limitedPhase(after).phase).toBe('none')
    expect(limitedPhase(Date.parse(batch.teaseFrom) - 1).phase).toBe('none')
  })

  it('keeps 리미티드 cards out of the pool and the pick-up outside their window', () => {
    const limitedCards = PLAYERS.filter((player) => player.limited)
    for (const now of [before, after]) {
      const pool = releasedPoolFor('Live', now)
      expect(pool.some((player) => player.limited)).toBe(false)
      const rng = seededRandom(5)
      const drawn = drawSession({ count: 30, rates: { Normal: 0, Rare: 0, Legend: 0, Live: 100, World: 0 }, rng, nowMs: now }).players
      expect(drawn.some((player) => player.limited)).toBe(false)
      expect(featuredPlayer('2026-09-07', now).limited).toBeUndefined()
    }
    // During the window every limited card is drawable — through the 리미티드
    // bucket only (2026-09-07): the 플래티넘 pool never holds them — and the
    // pick-up is one of them.
    if (limitedCards.length > 0) {
      expect(releasedPoolFor('Live', during).some((player) => player.limited)).toBe(false)
      const pool = limitedPool(during)
      for (const card of limitedCards) expect(pool.some((player) => player.id === card.id)).toBe(true)
      const rng = seededRandom(9)
      const drawn = drawSession({ count: 40, rates: { Normal: 0, Rare: 0, Legend: 0, Live: 0, World: 0, Limited: 100 }, rng, nowMs: during }).players
      expect(drawn.every((player) => player.limited?.label === batch.label)).toBe(true)
      expect(featuredPlayer('2026-09-07', during).limited?.label).toBe(batch.label)
    }
  })
})
