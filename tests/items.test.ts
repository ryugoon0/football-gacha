import { describe, expect, it } from 'vitest'
import {
  ITEMS,
  ITEM_IDS,
  applyToCard,
  cardUseProblem,
  itemCount,
  normalizeInventory,
  priceOf,
  purchaseProblem,
  remainingToday,
} from '../lib/items'
import { reducer } from '../lib/gameReducer'
import { initialState } from '../lib/storage'
import { MAX_CONDITION } from '../lib/condition'
import { MAX_CAPACITY } from '../lib/vault'
import type { Card, GameState } from '../lib/types'

const card = (over: Partial<Card> = {}): Card => ({
  uid: 'a',
  playerId: 'n01',
  level: 1,
  limit: 5,
  condition: MAX_CONDITION,
  injuredFor: 0,
  exp: 0,
  ...over,
})

const rich = (): GameState => ({ ...initialState(), gold: 1_000_000, shards: 100_000 })

describe('the item list', () => {
  it('gives every item a way to be bought and something to say about it', () => {
    for (const id of ITEM_IDS) {
      const item = ITEMS[id]
      expect(item.gold !== null || item.shards !== null).toBe(true)
      expect(item.note.length).toBeGreaterThan(5)
      expect(['card', 'club']).toContain(item.target)
    }
  })

  it('drops anything a hand-edited save tries to invent', () => {
    expect(normalizeInventory({ drink: 3, nonsense: 99, medkit: -2, manual: 'lots' })).toEqual({
      drink: 3,
    })
    expect(normalizeInventory(null)).toEqual({})
    expect(normalizeInventory({ drink: 1e9 }).drink).toBe(999)
  })
})

describe('buying', () => {
  it('refuses what the manager cannot afford, and says how short they are', () => {
    const problem = purchaseProblem({
      item: ITEMS.drink,
      currency: 'gold',
      count: 10,
      gold: 500,
      shards: 0,
      buys: {},
    })
    expect(problem).toContain('부족')
  })

  it('refuses a currency the item does not take', () => {
    expect(
      purchaseProblem({ item: ITEMS.drink, currency: 'shards', count: 1, gold: 0, shards: 999, buys: {} }),
    ).toContain('조각으로는')
    expect(
      purchaseProblem({ item: ITEMS.breaker, currency: 'gold', count: 1, gold: 1e9, shards: 0, buys: {} }),
    ).toContain('골드로는')
  })

  it('holds the daily limit and counts what was already bought', () => {
    const item = ITEMS.medkit
    expect(remainingToday(item, { medkit: 1 })).toBe((item.dailyLimit ?? 0) - 1)
    expect(
      purchaseProblem({ item, currency: 'gold', count: 3, gold: 1e9, shards: 0, buys: { medkit: 3 } }),
    ).toContain('다 썼습니다')
  })

  it('takes the gold, hands over the item, and remembers the limit', () => {
    const next = reducer(rich(), { type: 'buyItem', id: 'medkit', currency: 'gold', count: 2 })
    expect(itemCount(next.items, 'medkit')).toBe(2)
    expect(next.gold).toBe(rich().gold - (priceOf(ITEMS.medkit, 'gold') ?? 0) * 2)
    expect(next.daily.shopBuys.medkit).toBe(2)
  })

  it('never lets a refused purchase change anything', () => {
    const broke: GameState = { ...initialState(), gold: 0, shards: 0 }
    expect(reducer(broke, { type: 'buyItem', id: 'drink', currency: 'gold', count: 1 })).toBe(broke)
  })
})

describe('using an item on a player', () => {
  it('tops up condition without going over the maximum', () => {
    expect(applyToCard('drink', card({ condition: 80 }))?.condition).toBe(MAX_CONDITION)
    expect(applyToCard('drink', card({ condition: 40 }))?.condition).toBe(70)
    expect(applyToCard('energyFull', card({ condition: 1 }))?.condition).toBe(MAX_CONDITION)
  })

  it('heals an injury outright', () => {
    expect(applyToCard('medkit', card({ injuredFor: 4 }))?.injuredFor).toBe(0)
  })

  it('does nothing — and says why — when there is nothing to do', () => {
    expect(applyToCard('drink', card())).toBeNull()
    expect(cardUseProblem('drink', card())).toContain('가득')
    expect(applyToCard('medkit', card())).toBeNull()
    expect(cardUseProblem('medkit', card())).toContain('부상이 아닙니다')
  })

  it('never spends an item that would do nothing', () => {
    const state: GameState = { ...rich(), items: { drink: 1 }, cards: [card()] }
    const next = reducer(state, { type: 'spendItemOnCard', id: 'drink', uid: 'a' })
    expect(next).toBe(state)
    expect(itemCount(next.items, 'drink')).toBe(1)
  })

  it('spends exactly one when it works', () => {
    const state: GameState = { ...rich(), items: { drink: 3 }, cards: [card({ condition: 50 })] }
    const next = reducer(state, { type: 'spendItemOnCard', id: 'drink', uid: 'a' })
    expect(itemCount(next.items, 'drink')).toBe(2)
    expect(next.cards[0].condition).toBe(80)
  })

  it('cannot be used at all without holding one', () => {
    const state: GameState = { ...rich(), items: {}, cards: [card({ condition: 50 })] }
    expect(reducer(state, { type: 'spendItemOnCard', id: 'drink', uid: 'a' })).toBe(state)
  })
})

describe('using an item on the club', () => {
  it('adds a friendly to today, which the daily count then reflects', () => {
    const state: GameState = { ...rich(), items: { friendlyTicket: 1 } }
    const next = reducer(state, { type: 'spendItemOnClub', id: 'friendlyTicket' })
    expect(next.daily.extraFriendlies).toBe(1)
    expect(itemCount(next.items, 'friendlyTicket')).toBe(0)
  })

  it('expands the vault, but never past the maximum', () => {
    const state: GameState = { ...rich(), items: { vaultPermit: 2 }, capacity: MAX_CAPACITY }
    expect(reducer(state, { type: 'spendItemOnClub', id: 'vaultPermit' })).toBe(state)

    const room: GameState = { ...rich(), items: { vaultPermit: 1 }, capacity: 60 }
    expect(reducer(room, { type: 'spendItemOnClub', id: 'vaultPermit' }).capacity).toBe(70)
  })

  it('hands over shards', () => {
    const state: GameState = { ...rich(), items: { shardPouch: 1 } }
    expect(reducer(state, { type: 'spendItemOnClub', id: 'shardPouch' }).shards).toBe(
      state.shards + 120,
    )
  })
})
