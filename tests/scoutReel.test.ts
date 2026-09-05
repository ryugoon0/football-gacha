import { describe, expect, it } from 'vitest'
import { PLAYERS_BY_RARITY } from '../lib/players'
import { seededRandom } from '../lib/random'
import { REEL_SIZE, isGoldOrBetter, isHighRarity, planReel } from '../lib/scoutReel'

// 월드 has no released cards until the first legends land; the reel treats it like 플래티넘 then.
const pick = (rarity: keyof typeof PLAYERS_BY_RARITY) => (PLAYERS_BY_RARITY[rarity] ?? PLAYERS_BY_RARITY.Live)[0] ?? PLAYERS_BY_RARITY.Live[0]

describe('premium scout reel', () => {
  it('seats the result in a seven-card strip with no repeats', () => {
    const rng = seededRandom(7)
    for (let i = 0; i < 50; i += 1) {
      const result = pick('Rare')
      const plan = planReel(result, PLAYERS_BY_RARITY, rng)
      expect(plan.cards).toHaveLength(REEL_SIZE)
      expect(plan.cards[plan.stopIndex].id).toBe(result.id)
      expect(plan.stopIndex).toBeGreaterThan(0)
      expect(new Set(plan.cards.map((card) => card.id)).size).toBe(REEL_SIZE)
    }
  })

  it('keeps a 일반·실버 result on a plain board: no sparkle, nothing above 실버 in the strip, a straight stop', () => {
    const rng = seededRandom(11)
    for (const rarity of ['Normal', 'Rare'] as const) {
      for (let i = 0; i < 100; i += 1) {
        const plan = planReel(pick(rarity), PLAYERS_BY_RARITY, rng)
        expect(plan.special).toBe(false)
        expect(plan.cards.some((card, index) => index !== plan.stopIndex && isGoldOrBetter(card.rarity))).toBe(false)
        expect(['plain', 'long']).toContain(plan.stop)
      }
    }
  })

  it('lights the board for 골드 or better and puts a 라이브+ card alongside to tease', () => {
    const rng = seededRandom(3)
    let teasing = 0
    for (const rarity of ['Legend', 'Live', 'World'] as const) {
      for (let i = 0; i < 60; i += 1) {
        const plan = planReel(pick(rarity), PLAYERS_BY_RARITY, rng)
        expect(plan.special).toBe(true)
        expect(plan.cards.filter((card, index) => index !== plan.stopIndex && isHighRarity(card.rarity)).length).toBeGreaterThanOrEqual(1)
        if (plan.stop === 'overshoot' || plan.stop === 'crawl') teasing += 1
      }
    }
    // Most special reels stop with one of the two teasing patterns.
    expect(teasing).toBeGreaterThan(100)
  })
})
