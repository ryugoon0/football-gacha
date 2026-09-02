import { afterEach, describe, expect, it } from 'vitest'
import { KNOBS, KNOB_KEYS, clampKnob, currentTuning, resetTuning, setTuning, tune } from '../lib/tuning'
import { recoveryCost, treatmentCost } from '../lib/condition'
import { ratingInSlot } from '../lib/squad'
import { PLAYERS } from '../lib/players'
import { miniGamesLeft } from '../lib/daily'
import { freshDaily } from '../lib/daily'

afterEach(() => resetTuning())

describe('the operator knobs', () => {
  it('never lets a value out of its bounds', () => {
    expect(clampKnob('staminaDrain', 999)).toBe(KNOBS.staminaDrain.max)
    expect(clampKnob('staminaDrain', -4)).toBe(KNOBS.staminaDrain.min)
    expect(clampKnob('miniGameLimit', 7.6)).toBe(8)
  })

  it('falls back to the default rather than trusting a broken value', () => {
    expect(clampKnob('staminaDrain', Number.NaN)).toBe(KNOBS.staminaDrain.default)
    // Infinity is not a setting anyone meant, so it falls back rather than
    // silently becoming the maximum.
    expect(clampKnob('staminaDrain', Number.POSITIVE_INFINITY)).toBe(KNOBS.staminaDrain.default)
  })

  it('ignores keys it does not know and values that are not numbers', () => {
    setTuning({ nonsense: 5, staminaDrain: 'fast' as unknown as number })
    expect(tune('staminaDrain')).toBe(KNOBS.staminaDrain.default)
  })

  it('clamps on the way in, so a bad row in the database cannot break play', () => {
    setTuning({ staminaDrain: 500, miniGameLimit: -9 })
    expect(tune('staminaDrain')).toBe(KNOBS.staminaDrain.max)
    expect(tune('miniGameLimit')).toBe(KNOBS.miniGameLimit.min)
  })

  it('reports defaults for everything before anything is set', () => {
    const now = currentTuning()
    for (const key of KNOB_KEYS) expect(now[key]).toBe(KNOBS[key].default)
  })

  it('gives every knob a sane range around its default', () => {
    for (const key of KNOB_KEYS) {
      const knob = KNOBS[key]
      expect(knob.min).toBeLessThanOrEqual(knob.default)
      expect(knob.default).toBeLessThanOrEqual(knob.max)
      expect(knob.step).toBeGreaterThan(0)
      expect(knob.note.length).toBeGreaterThan(10)
    }
  })
})

describe('turning a knob actually changes the game', () => {
  it('changes what healing costs', () => {
    const card = { uid: 'a', playerId: 'x', level: 1, limit: 5, condition: 50, injuredFor: 0, exp: 0 }
    const before = recoveryCost(card)
    setTuning({ recoveryCostPerPoint: KNOBS.recoveryCostPerPoint.default * 2 })
    expect(recoveryCost(card)).toBe(before * 2)
  })

  it('changes what treating an injury costs', () => {
    const card = { uid: 'a', playerId: 'x', level: 1, limit: 5, condition: 100, injuredFor: 3, exp: 0 }
    setTuning({ treatmentCostPerMatch: 100 })
    expect(treatmentCost(card)).toBe(300)
  })

  it('changes how many friendlies are left in a day', () => {
    setTuning({ miniGameLimit: 3 })
    expect(miniGamesLeft(freshDaily('2026-09-02'))).toBe(3)
  })

  it('changes how much an out-of-position player loses', () => {
    const striker = PLAYERS.find((item) => item.position === 'ST')
    expect(striker).toBeDefined()
    if (!striker) return

    setTuning({ outOfPositionFactor: 1 })
    const kind = ratingInSlot(striker, 1, 'GK')
    setTuning({ outOfPositionFactor: 0.2 })
    const cruel = ratingInSlot(striker, 1, 'GK')

    expect(cruel).toBeLessThan(kind)
  })
})
