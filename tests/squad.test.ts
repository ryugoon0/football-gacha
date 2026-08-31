import { describe, expect, it } from 'vitest'
import { FORMATIONS } from '../lib/formations'
import { PLAYERS_BY_RARITY } from '../lib/players'
import { autoFill, evaluateSquad, positionPenalty } from '../lib/squad'
import { initialState } from '../lib/storage'
import type { Card } from '../lib/types'

describe('position fit', () => {
  it('has no penalty for an exact match', () => {
    expect(positionPenalty('ST', 'ST')).toBe(0)
  })

  it('punishes an outfielder in goal hardest', () => {
    expect(positionPenalty('ST', 'GK')).toBeGreaterThan(positionPenalty('ST', 'CM'))
    expect(positionPenalty('CB', 'CDM')).toBeLessThan(positionPenalty('CB', 'ST'))
  })
})

describe('squad rating', () => {
  it('rates the starter squad and counts eleven players', () => {
    const state = initialState()
    const rating = evaluateSquad(state.cards, state.squad)
    expect(rating.filled).toBe(11)
    expect(rating.overall).toBeGreaterThan(40)
    expect(rating.chemistry).toBeGreaterThan(80)
  })

  it('drops when a slot is empty', () => {
    const state = initialState()
    const full = evaluateSquad(state.cards, state.squad)
    const gutted = {
      ...state.squad,
      slots: { ...state.squad.slots, f2: null, m1: null },
    }
    expect(evaluateSquad(state.cards, gutted).overall).toBeLessThan(full.overall)
  })
})

describe('auto fill', () => {
  it('fills every slot with a different card and prefers stronger players', () => {
    const state = initialState()
    const world = PLAYERS_BY_RARITY.World[0]
    const cards: Card[] = [...state.cards, { uid: 'star', playerId: world.id, level: 1 }]
    const squad = autoFill(cards, state.squad)

    const used = Object.values(squad.slots).filter(Boolean) as string[]
    expect(used).toHaveLength(FORMATIONS[state.squad.formation].slots.length)
    expect(new Set(used).size).toBe(used.length)
    expect(used).toContain('star')
    expect(evaluateSquad(cards, squad).overall).toBeGreaterThan(
      evaluateSquad(state.cards, state.squad).overall,
    )
  })
})
