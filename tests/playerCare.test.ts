import { describe, expect, it } from 'vitest'
import { MAX_CONDITION, isInjured, recoveryCost, treatmentCost } from '../lib/condition'
import { resetTuning, setTuning } from '../lib/tuning'
import type { Card } from '../lib/types'

const card = (over: Partial<Card> = {}): Card => ({
  uid: 'a',
  playerId: 'x',
  level: 1,
  limit: 5,
  condition: MAX_CONDITION,
  injuredFor: 0,
  exp: 0,
  ...over,
})

describe('caring for a player', () => {
  it('charges nothing for a card that needs nothing', () => {
    expect(recoveryCost(card())).toBe(0)
    expect(treatmentCost(card())).toBe(0)
    expect(isInjured(card())).toBe(false)
  })

  it('charges by how far the condition has fallen', () => {
    resetTuning()
    const half = recoveryCost(card({ condition: 50 }))
    const worse = recoveryCost(card({ condition: 20 }))
    expect(worse).toBeGreaterThan(half)
    expect(half).toBeGreaterThan(0)
  })

  it('charges by how many matches an injury still has to run', () => {
    resetTuning()
    expect(treatmentCost(card({ injuredFor: 3 }))).toBe(treatmentCost(card({ injuredFor: 1 })) * 3)
  })

  it('follows the operator price setting', () => {
    setTuning({ recoveryCostPerPoint: 1 })
    expect(recoveryCost(card({ condition: 40 }))).toBe(60)
    setTuning({ recoveryCostPerPoint: 10 })
    expect(recoveryCost(card({ condition: 40 }))).toBe(600)
    resetTuning()
  })
})
