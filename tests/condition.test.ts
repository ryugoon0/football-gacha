import { describe, expect, it } from 'vitest'
import {
  MAX_CONDITION,
  applyMatchWear,
  conditionFactor,
  isAvailable,
  recoveryCost,
  treatmentCost,
} from '../lib/condition'
import { seededRandom } from '../lib/players'
import type { Card } from '../lib/types'

const card = (uid: string, condition = MAX_CONDITION, injuredFor = 0): Card => ({
  uid,
  playerId: 'n01',
  level: 1,
  condition,
  injuredFor,
  exp: 0,
})

describe('condition', () => {
  it('scales performance between 85% and 100%', () => {
    expect(conditionFactor(MAX_CONDITION)).toBe(1)
    expect(conditionFactor(0)).toBeCloseTo(0.85)
    expect(conditionFactor(50)).toBeGreaterThan(conditionFactor(20))
  })

  it('falls back to full fitness for older saves', () => {
    expect(conditionFactor(undefined as unknown as number)).toBe(1)
  })

  it('prices recovery and treatment by how bad it is', () => {
    expect(recoveryCost(card('a', 100))).toBe(0)
    expect(recoveryCost(card('a', 40))).toBeGreaterThan(recoveryCost(card('a', 80)))
    expect(treatmentCost(card('a', 100, 3))).toBeGreaterThan(treatmentCost(card('a', 100, 1)))
  })
})

describe('match wear', () => {
  it('tires the starters and rests everyone else', () => {
    const cards = [card('start', 90), card('bench', 40)]
    const { cards: next } = applyMatchWear(cards, ['start'], seededRandom(3))

    expect(next[0].condition).toBeLessThan(90)
    expect(next[1].condition).toBeGreaterThan(40)
    expect(next[1].condition).toBeLessThanOrEqual(MAX_CONDITION)
  })

  it('counts an injury down while the player sits out', () => {
    const { cards: next } = applyMatchWear([card('hurt', 80, 2)], [], seededRandom(1))
    expect(next[0].injuredFor).toBe(1)
    expect(isAvailable(next[0])).toBe(false)

    const { cards: healed } = applyMatchWear(next, [], seededRandom(1))
    expect(healed[0].injuredFor).toBe(0)
    expect(isAvailable(healed[0])).toBe(true)
  })

  it('never pushes condition out of range', () => {
    const rng = seededRandom(21)
    let cards = [card('a', 10), card('b', 100)]
    for (let i = 0; i < 40; i++) {
      cards = applyMatchWear(cards, ['a'], rng).cards
      for (const item of cards) {
        expect(item.condition).toBeGreaterThanOrEqual(0)
        expect(item.condition).toBeLessThanOrEqual(MAX_CONDITION)
        expect(item.injuredFor).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('injures tired players more often than fresh ones', () => {
    const count = (condition: number) => {
      const rng = seededRandom(77)
      let injuries = 0
      for (let i = 0; i < 600; i++) {
        injuries += applyMatchWear([card('a', condition)], ['a'], rng).injuries.length
      }
      return injuries
    }
    expect(count(10)).toBeGreaterThan(count(100))
  })
})
