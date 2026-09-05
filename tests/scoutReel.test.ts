import { describe, expect, it } from 'vitest'
import { PLAYERS_BY_RARITY } from '../lib/players'
import { seededRandom } from '../lib/random'
import { REEL_SIZE, isHighRarity, planReel } from '../lib/scoutReel'

const pick = (rarity: keyof typeof PLAYERS_BY_RARITY) => PLAYERS_BY_RARITY[rarity][0]

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

  it('keeps 라이브+ out of a plain reel and puts one in every special reel', () => {
    const rng = seededRandom(11)
    let plain = 0
    let special = 0
    for (let i = 0; i < 200; i += 1) {
      const plan = planReel(pick('Normal'), PLAYERS_BY_RARITY, rng)
      const highs = plan.cards.filter((card, index) => index !== plan.stopIndex && isHighRarity(card.rarity)).length
      if (plan.special) {
        special += 1
        expect(highs).toBeGreaterThanOrEqual(1)
      } else {
        plain += 1
        expect(highs).toBe(0)
      }
    }
    // The tease fires about one time in four.
    expect(special).toBeGreaterThan(20)
    expect(plain).toBeGreaterThan(100)
  })

  it('always goes special for a 라이브 or 레전드 result, with a second high card alongside', () => {
    const rng = seededRandom(3)
    for (const rarity of ['Live', 'World'] as const) {
      const plan = planReel(pick(rarity), PLAYERS_BY_RARITY, rng)
      expect(plan.special).toBe(true)
      expect(plan.cards.filter((card, index) => index !== plan.stopIndex && isHighRarity(card.rarity)).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('varies how the strip stops, leaning on the teasing stops when special', () => {
    const rng = seededRandom(21)
    const seen = new Set<string>()
    let teasing = 0
    for (let i = 0; i < 200; i += 1) {
      const plan = planReel(pick('Live'), PLAYERS_BY_RARITY, rng)
      seen.add(plan.stop)
      if (plan.stop === 'overshoot' || plan.stop === 'crawl') teasing += 1
    }
    expect(seen.size).toBe(4)
    expect(teasing).toBeGreaterThan(100)
  })

  it('never fires the tease when told not to', () => {
    const rng = seededRandom(5)
    for (let i = 0; i < 30; i += 1) {
      expect(planReel(pick('Legend'), PLAYERS_BY_RARITY, rng, 0).special).toBe(false)
    }
  })
})
