import { describe, expect, it } from 'vitest'
import { FORMATIONS } from '../lib/formations'
import { PLAYERS, PLAYERS_BY_RARITY } from '../lib/players'
import { autoFill, evaluateSquad, positionFit, ratingInSlot } from '../lib/squad'
import { initialState } from '../lib/storage'
import type { Card } from '../lib/types'

describe('position fit', () => {
  it('rates a player highest in their own position', () => {
    const player = PLAYERS_BY_RARITY.Legend.find((item) => item.position === 'ST')!
    expect(positionFit(player, 'ST')).toBe('main')
    expect(ratingInSlot(player, 5, 'ST')).toBeGreaterThan(ratingInSlot(player, 5, 'GK'))
  })

  it('collapses the rating outside the listed positions', () => {
    const player = PLAYERS_BY_RARITY.Legend[0]
    const impossible = (['GK', 'CB', 'ST'] as const).find(
      (position) => !player.positions.includes(position),
    )!
    expect(positionFit(player, impossible)).toBe('out')
    expect(ratingInSlot(player, 5, impossible)).toBeLessThan(
      ratingInSlot(player, 5, player.position) * 0.7,
    )
  })

  it('only lightly penalises a listed alternative position', () => {
    const player = PLAYERS.find((item) => item.positions.length > 1)!
    const alt = player.positions[1]
    expect(positionFit(player, alt)).toBe('sub')
    expect(ratingInSlot(player, 4, alt)).toBeGreaterThan(ratingInSlot(player, 4, player.position) * 0.9)
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
      { uid: 'star', playerId: world.id, level: 5, limit: 6, condition: 100, injuredFor: 0, exp: 0 },
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

  it('never benches a second copy of a player already starting', () => {
    const state = initialState()
    const striker = PLAYERS.find((p) => p.position === 'ST')!
    // Five copies of the same player: only one can start, and none of the
    // other four should end up on the bench either.
    const copies: Card[] = Array.from({ length: 5 }, (_, i) => ({
      uid: `dup-${i}`,
      playerId: striker.id,
      level: 5,
      limit: 10,
      condition: 90,
      injuredFor: 0,
      exp: 0,
    }))
    const cards = [...state.cards, ...copies]
    const squad = autoFill(cards, state.squad)

    const everywhere = [...Object.values(squad.slots), ...squad.bench].filter(Boolean) as string[]
    const playerIds = everywhere.map((uid) => cards.find((c) => c.uid === uid)!.playerId)
    expect(playerIds.filter((id) => id === striker.id)).toHaveLength(1)
  })
})
