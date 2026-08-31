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

describe('fitness', () => {
  it('rates a tired player below a fresh one', () => {
    const state = initialState()
    const fresh = evaluateSquad(state.cards, state.squad)
    const tired = evaluateSquad(
      state.cards.map((card) => ({ ...card, condition: 30 })),
      state.squad,
    )
    expect(tired.overall).toBeLessThan(fresh.overall)
  })

  it('treats an injured player as unavailable', () => {
    const state = initialState()
    const gk = state.squad.slots.gk!
    const injured = state.cards.map((card) =>
      card.uid === gk ? { ...card, injuredFor: 2 } : card,
    )
    const rating = evaluateSquad(injured, state.squad)

    expect(rating.filled).toBe(10)
    expect(rating.evaluations.find((item) => item.slotId === 'gk')!.injured).toBe(true)
    expect(rating.def).toBeLessThan(evaluateSquad(state.cards, state.squad).def)
  })

  it('leaves injured players out of the auto line-up', () => {
    const state = initialState()
    const cards = state.cards.map((card, index) => (index < 3 ? { ...card, injuredFor: 1 } : card))
    const squad = autoFill(cards, state.squad)
    const picked = Object.values(squad.slots).filter(Boolean) as string[]
    for (const card of cards.filter((item) => item.injuredFor > 0)) {
      expect(picked).not.toContain(card.uid)
    }
  })
})

describe('auto fill', () => {
  it('fills every slot with a different card and prefers stronger players', () => {
    const state = initialState()
    const world = PLAYERS_BY_RARITY.World[0]
    const cards: Card[] = [
      ...state.cards,
      { uid: 'star', playerId: world.id, level: 1, condition: 100, injuredFor: 0 },
    ]
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
