import { describe, expect, it } from 'vitest'
import { reducer } from '../lib/gameReducer'
import { PLAYERS_BY_RARITY } from '../lib/players'
import { initialState, newCard } from '../lib/storage'
import {
  BASE_CAPACITY,
  CAPACITY_STEP,
  MAX_CAPACITY,
  canExpand,
  expandCost,
  freeSlots,
  hasRoomFor,
  normalizeCapacity,
} from '../lib/vault'

const fill = (count: number) => {
  const state = initialState()
  const player = PLAYERS_BY_RARITY.Normal[0]
  const cards = [...state.cards]
  while (cards.length < count) cards.push(newCard(player.id))
  return { ...state, cards: cards.slice(0, count) }
}

describe('card vault', () => {
  it('starts at the base size and never exceeds the ceiling', () => {
    expect(initialState().capacity).toBe(BASE_CAPACITY)
    expect(canExpand(MAX_CAPACITY)).toBe(false)
    expect(canExpand(MAX_CAPACITY - CAPACITY_STEP)).toBe(true)
  })

  it('charges more for each expansion', () => {
    expect(expandCost(BASE_CAPACITY)).toBeLessThan(expandCost(BASE_CAPACITY + CAPACITY_STEP))
    expect(expandCost(MAX_CAPACITY - CAPACITY_STEP)).toBeGreaterThan(expandCost(BASE_CAPACITY))
  })

  it('buys ten slots for gold', () => {
    const state = { ...initialState(), gold: 10_000 }
    const next = reducer(state, { type: 'expandVault' })
    expect(next.capacity).toBe(BASE_CAPACITY + CAPACITY_STEP)
    expect(next.gold).toBe(10_000 - expandCost(BASE_CAPACITY))
  })

  it('refuses to expand without the gold or past the ceiling', () => {
    const broke = { ...initialState(), gold: 0 }
    expect(reducer(broke, { type: 'expandVault' }).capacity).toBe(BASE_CAPACITY)

    const maxed = { ...initialState(), gold: 999_999, capacity: MAX_CAPACITY }
    expect(reducer(maxed, { type: 'expandVault' }).capacity).toBe(MAX_CAPACITY)
  })

  it('blocks pulls, market buys and shard swaps once the vault is full', () => {
    const full = { ...fill(BASE_CAPACITY), gold: 99_999, shards: 9_999 }
    const player = PLAYERS_BY_RARITY.Normal[1]

    const pulled = reducer(full, { type: 'addCards', cards: [newCard(player.id)], cost: 300 })
    expect(pulled.cards).toHaveLength(BASE_CAPACITY)
    expect(pulled.gold).toBe(full.gold)

    const listing = { id: 'l1', playerId: player.id, price: 100 }
    expect(reducer(full, { type: 'buy', listing }).cards).toHaveLength(BASE_CAPACITY)

    const offer = { rarity: 'Rare' as const, cost: 60 }
    expect(reducer(full, { type: 'exchangeShards', offer, player }).cards).toHaveLength(
      BASE_CAPACITY,
    )
  })

  it('lets a ten pull through only when all ten fit', () => {
    const state = { ...fill(BASE_CAPACITY - 5), gold: 99_999 }
    const ten = Array.from({ length: 10 }, () => newCard(PLAYERS_BY_RARITY.Normal[2].id))
    expect(reducer(state, { type: 'addCards', cards: ten, cost: 2700 }).cards).toHaveLength(
      BASE_CAPACITY - 5,
    )

    const roomy = reducer({ ...state, capacity: BASE_CAPACITY + CAPACITY_STEP }, {
      type: 'addCards',
      cards: ten,
      cost: 2700,
    })
    expect(roomy.cards).toHaveLength(BASE_CAPACITY + 5)
  })

  it('counts free slots and repairs odd saved values', () => {
    expect(freeSlots(BASE_CAPACITY - 2, BASE_CAPACITY)).toBe(2)
    expect(freeSlots(BASE_CAPACITY + 20, BASE_CAPACITY)).toBe(0)
    expect(hasRoomFor(BASE_CAPACITY - 2, BASE_CAPACITY, 3)).toBe(false)
    expect(normalizeCapacity(undefined)).toBe(BASE_CAPACITY)
    expect(normalizeCapacity(10)).toBe(BASE_CAPACITY)
    expect(normalizeCapacity(999)).toBe(MAX_CAPACITY)
    expect(normalizeCapacity(93)).toBe(90)
  })
})
