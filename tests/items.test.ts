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
  priceBounds,
  priceKey,
  resetItemPrices,
  resetItemVisibility,
  setItemPrices,
  setItemVisibility,
  isItemVisible,
  visibleItemIds,
  visibleKey,
} from '../lib/items'
import {
  SHARD_OFFERS,
  costOf,
  exchangeBounds,
  offerKey,
  resetExchangeCosts,
  setExchangeCosts,
  shardOffers,
} from '../lib/shards'
import { reducer } from '../lib/gameReducer'
import { PLAYERS_BY_RARITY } from '../lib/players'
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
      expect(['card', 'club', 'match']).toContain(item.target)
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
    // 조각 전용 상품이 남아 있어야 이 검사가 의미를 가진다.
    const shardOnly = ITEM_IDS.map((id) => ITEMS[id]).find((item) => item.gold === null)
    if (shardOnly) {
      expect(
        purchaseProblem({ item: shardOnly, currency: 'gold', count: 1, gold: 1e9, shards: 0, buys: {} }),
      ).toContain('골드로는')
    }
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

describe('the operator moving a price', () => {
  it('uses the operator price when one is set, and the list price otherwise', () => {
    resetItemPrices()
    expect(priceOf(ITEMS.drink, 'gold')).toBe(ITEMS.drink.gold)

    setItemPrices({ [priceKey('drink', 'gold')]: 50 })
    expect(priceOf(ITEMS.drink, 'gold')).toBe(50)
    // Untouched items keep their list price.
    expect(priceOf(ITEMS.medkit, 'gold')).toBe(ITEMS.medkit.gold)
    resetItemPrices()
  })

  it('cannot open a currency the item does not take', () => {
    // 회복 음료 has no shard price; naming one must not create a way to buy it.
    setItemPrices({ [priceKey('drink', 'shards')]: 10 })
    expect(priceOf(ITEMS.drink, 'shards')).toBeNull()
    resetItemPrices()
  })

  it('ignores values that are not usable prices', () => {
    setItemPrices({ [priceKey('drink', 'gold')]: -5 })
    expect(priceOf(ITEMS.drink, 'gold')).toBe(ITEMS.drink.gold)
    setItemPrices({ [priceKey('drink', 'gold')]: Number.NaN })
    expect(priceOf(ITEMS.drink, 'gold')).toBe(ITEMS.drink.gold)
    resetItemPrices()
  })

  it('charges the operator price at the till', () => {
    setItemPrices({ [priceKey('drink', 'gold')]: 1000 })
    const next = reducer(rich(), { type: 'buyItem', id: 'drink', currency: 'gold', count: 1 })
    expect(next.gold).toBe(rich().gold - 1000)
    resetItemPrices()
  })

  it('bounds a price so one keystroke cannot make an item free forever', () => {
    const bounds = priceBounds(200)
    expect(bounds.min).toBe(0)
    expect(bounds.max).toBe(200 * 50)
    // A cheap item still gets room to move.
    expect(priceBounds(1).max).toBeGreaterThanOrEqual(100)
  })
})

describe('상점 진열 — 운영자가 물건을 내리는 것', () => {
  it('기본은 전부 판매 중이다', () => {
    resetItemVisibility()
    expect(visibleItemIds()).toEqual(ITEM_IDS)
    for (const id of ITEM_IDS) expect(isItemVisible(id)).toBe(true)
  })

  it('내린 물건은 진열에서 빠진다', () => {
    setItemVisibility({ [visibleKey('medkit')]: 0 })
    expect(isItemVisible('medkit')).toBe(false)
    expect(visibleItemIds()).not.toContain('medkit')
    expect(visibleItemIds()).toContain('drink')
    resetItemVisibility()
  })

  it('내린 물건은 살 수도 없다', () => {
    // 진열만 막으면 열어 둔 화면에서 그대로 팔린다.
    setItemVisibility({ [visibleKey('medkit')]: 0 })
    const problem = purchaseProblem({
      item: ITEMS.medkit,
      currency: 'gold',
      count: 1,
      gold: 999_999,
      shards: 999_999,
      buys: undefined,
    })
    expect(problem).toBe('지금은 팔지 않는 물건입니다.')
    resetItemVisibility()
    expect(
      purchaseProblem({
        item: ITEMS.medkit,
        currency: 'gold',
        count: 1,
        gold: 999_999,
        shards: 999_999,
        buys: undefined,
      }),
    ).toBeNull()
  })

  it('이미 산 물건은 내려도 그대로 쓴다', () => {
    // 내리는 것은 선반이지 가방이 아니다.
    setItemVisibility({ [visibleKey('medkit')]: 0 })
    const hurt = card({ injuredFor: 3 })
    expect(applyToCard('medkit', hurt)?.injuredFor).toBe(0)
    resetItemVisibility()
  })

  it('절반 미만만 숨김으로 본다', () => {
    setItemVisibility({ [visibleKey('drink')]: 1, [visibleKey('medkit')]: 0 })
    expect(isItemVisible('drink')).toBe(true)
    expect(isItemVisible('medkit')).toBe(false)
    resetItemVisibility()
  })
})

describe('조각 교환소 비용', () => {
  it('기본값은 코드에 적힌 표 그대로다', () => {
    resetExchangeCosts()
    for (const offer of SHARD_OFFERS) expect(costOf(offer.rarity)).toBe(offer.cost)
    expect(shardOffers()).toEqual(SHARD_OFFERS)
  })

  it('운영자가 바꾼 값이 화면과 결제 양쪽에 쓰인다', () => {
    setExchangeCosts({ [offerKey('Legend')]: 120 })
    expect(costOf('Legend')).toBe(120)
    expect(shardOffers().find((offer) => offer.rarity === 'Legend')?.cost).toBe(120)
    // 건드리지 않은 등급은 그대로다.
    expect(costOf('World')).toBe(800)
    resetExchangeCosts()
  })

  it('공짜는 만들 수 없다', () => {
    // 0은 싼 값이 아니라 카드 무제한이다. 서버 범위도 1부터다.
    for (const offer of SHARD_OFFERS) expect(exchangeBounds(offer.cost).min).toBe(1)
    setExchangeCosts({ [offerKey('World')]: 0 })
    expect(costOf('World')).toBe(800)
    resetExchangeCosts()
  })

  it('교환은 화면에 적혀 있던 값이 아니라 지금 값으로 결제한다', () => {
    // 탭을 열어 둔 채 운영자가 값을 올리면 옛 가격으로 팔리면 안 된다.
    setExchangeCosts({ [offerKey('Rare')]: 200 })
    const state: GameState = { ...initialState(), shards: 210 }
    const stale = { rarity: 'Rare' as const, cost: 60 }
    const next = reducer(state, {
      type: 'exchangeShards',
      offer: stale,
      player: PLAYERS_BY_RARITY.Rare[0],
    })
    expect(next.shards).toBe(10)
    expect(next.cards.length).toBe(state.cards.length + 1)
    resetExchangeCosts()
  })

  it('조각이 모자라면 아무것도 일어나지 않는다', () => {
    setExchangeCosts({ [offerKey('Rare')]: 200 })
    const state: GameState = { ...initialState(), shards: 199 }
    const next = reducer(state, {
      type: 'exchangeShards',
      offer: { rarity: 'Rare', cost: 60 },
      player: PLAYERS_BY_RARITY.Rare[0],
    })
    expect(next).toBe(state)
    resetExchangeCosts()
  })
})
