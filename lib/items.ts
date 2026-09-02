import { MAX_CONDITION } from './condition'
import { CAPACITY_STEP, MAX_CAPACITY } from './vault'
import type { Card } from './types'

/**
 * Items: things a manager buys once and spends later.
 *
 * Everything here plugs into a system the game already has — condition,
 * injuries, experience, the limit on a card, the vault, the shard exchange.
 * An item is a different way to pay for something the game already does, not a
 * new rule bolted on the side, so nothing here can put a squad into a state
 * ordinary play could not reach.
 */

export type ItemId =
  | 'drink'
  | 'energyFull'
  | 'medkit'
  | 'marketTicket'
  | 'friendlyTicket'
  | 'vaultPermit'
  | 'shardPouch'

/** What an item is used on. */
export type ItemTarget = 'card' | 'club'

export interface ItemDef {
  id: ItemId
  name: string
  /** What it does, for the player. */
  note: string
  target: ItemTarget
  icon: string
  /** Gold price. Null when it cannot be bought with gold. */
  gold: number | null
  /** Shard price. Null when it cannot be bought with shards. */
  shards: number | null
  /** How many may be bought in one day. Null for no limit. */
  dailyLimit: number | null
}

export const ITEMS: Record<ItemId, ItemDef> = {
  drink: {
    id: 'drink',
    name: '회복 음료',
    note: '선수 한 명의 컨디션을 30 올립니다.',
    target: 'card',
    icon: '🥤',
    gold: 200,
    shards: null,
    dailyLimit: null,
  },
  energyFull: {
    id: 'energyFull',
    name: '완전 회복제',
    note: '선수 한 명의 컨디션을 가득 채웁니다.',
    target: 'card',
    icon: '💧',
    gold: 700,
    shards: 40,
    dailyLimit: 5,
  },
  medkit: {
    id: 'medkit',
    name: '치료 키트',
    note: '부상을 즉시 낫게 합니다. 남은 결장 경기 수와 상관없습니다.',
    target: 'card',
    icon: '🩹',
    gold: 1500,
    shards: 80,
    dailyLimit: 3,
  },
  marketTicket: {
    id: 'marketTicket',
    name: '이적시장 갱신권',
    note: '매물 목록을 공짜로 새로 뽑습니다.',
    target: 'club',
    icon: '🎟️',
    gold: 250,
    shards: null,
    dailyLimit: null,
  },
  friendlyTicket: {
    id: 'friendlyTicket',
    name: '친선 경기권',
    note: '오늘 칠 수 있는 친선 경기를 한 판 늘립니다.',
    target: 'club',
    icon: '⚽',
    gold: 600,
    shards: 30,
    dailyLimit: 5,
  },
  vaultPermit: {
    id: 'vaultPermit',
    name: '보관함 확장권',
    note: `보관함을 ${CAPACITY_STEP}칸 늘립니다. 최대 ${MAX_CAPACITY}칸까지.`,
    target: 'club',
    icon: '🗄️',
    gold: 3000,
    shards: 200,
    dailyLimit: 2,
  },
  shardPouch: {
    id: 'shardPouch',
    name: '조각 주머니',
    note: '카드 조각 120개를 얻습니다.',
    target: 'club',
    icon: '🧧',
    gold: 2000,
    shards: null,
    dailyLimit: 3,
  },
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]

export type Inventory = Partial<Record<ItemId, number>>

export function itemCount(inventory: Inventory, id: ItemId): number {
  return Math.max(0, Math.floor(inventory[id] ?? 0))
}

/** Drops anything unknown or nonsensical, so a hand-edited save cannot invent items. */
export function normalizeInventory(value: unknown): Inventory {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const clean: Inventory = {}
  for (const id of ITEM_IDS) {
    const held = Number(source[id])
    if (Number.isFinite(held) && held > 0) clean[id] = Math.min(Math.floor(held), 999)
  }
  return clean
}

export type Currency = 'gold' | 'shards'

/**
 * Prices the operator has changed.
 *
 * Kept apart from the fixed knobs because there are two per item and they are
 * generated from the list — adding an item should not mean hand-writing two
 * more dials. An item with no price in a currency stays unbuyable in it: a
 * price cannot be invented from the operator screen, only moved.
 */
export function priceKey(id: ItemId, currency: Currency): string {
  return `price:${id}:${currency}`
}

let priceOverrides: Record<string, number> = {}

export function setItemPrices(next: Record<string, number>): void {
  const clean: Record<string, number> = {}
  for (const id of ITEM_IDS) {
    for (const currency of ['gold', 'shards'] as Currency[]) {
      if (ITEMS[id][currency] === null) continue
      const key = priceKey(id, currency)
      const value = next[key]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        clean[key] = Math.round(value)
      }
    }
  }
  priceOverrides = clean
}

export function resetItemPrices(): void {
  priceOverrides = {}
}

export function priceOf(item: ItemDef, currency: Currency): number | null {
  const base = currency === 'gold' ? item.gold : item.shards
  if (base === null) return null
  return priceOverrides[priceKey(item.id, currency)] ?? base
}

/** The bounds the server enforces: never free, never more than fifty times list. */
export function priceBounds(base: number): { min: number; max: number } {
  return { min: 0, max: Math.max(100, base * 50) }
}

/**
 * Whether an item is on the shelf.
 *
 * Stored as a knob like everything else — 1 shown, 0 hidden — so taking an
 * item down needs no deploy. Pulling something that turned out broken should
 * take a switch, not a release.
 *
 * Hiding is not the same as deleting: items already bought stay in the bag and
 * still work. Only the shelf changes.
 */
export function visibleKey(id: ItemId): string {
  return `show:${id}`
}

export const VISIBLE_BOUNDS = { min: 0, max: 1 }

let hidden = new Set<ItemId>()

export function setItemVisibility(next: Record<string, number>): void {
  const off = new Set<ItemId>()
  for (const id of ITEM_IDS) {
    const value = next[visibleKey(id)]
    if (typeof value === 'number' && Number.isFinite(value) && value < 0.5) off.add(id)
  }
  hidden = off
}

export function resetItemVisibility(): void {
  hidden = new Set()
}

export function isItemVisible(id: ItemId): boolean {
  return !hidden.has(id)
}

/** What the shop should show, in the catalogue's order. */
export function visibleItemIds(): ItemId[] {
  return ITEM_IDS.filter(isItemVisible)
}

export function boughtToday(buys: Record<string, number> | undefined, id: ItemId): number {
  return Math.max(0, Math.floor(buys?.[id] ?? 0))
}

export function remainingToday(
  item: ItemDef,
  buys: Record<string, number> | undefined,
): number | null {
  if (item.dailyLimit === null) return null
  return Math.max(0, item.dailyLimit - boughtToday(buys, item.id))
}

/** Why a purchase cannot go through, or null when it can. */
export function purchaseProblem({
  item,
  currency,
  count,
  gold,
  shards,
  buys,
}: {
  item: ItemDef
  currency: Currency
  count: number
  gold: number
  shards: number
  buys: Record<string, number> | undefined
}): string | null {
  if (!Number.isInteger(count) || count < 1) return '수량을 확인해 주세요.'
  // Checked here and not only on the shelf: a screen left open while an item
  // was taken down would otherwise still sell it.
  if (!isItemVisible(item.id)) return '지금은 팔지 않는 물건입니다.'
  const unit = priceOf(item, currency)
  if (unit === null) return currency === 'gold' ? '골드로는 살 수 없습니다.' : '조각으로는 살 수 없습니다.'

  const left = remainingToday(item, buys)
  if (left !== null && count > left) {
    return left === 0
      ? '오늘 구매 한도를 다 썼습니다. 내일 다시 오세요.'
      : `오늘은 ${left}개까지만 살 수 있습니다.`
  }

  const total = unit * count
  if (currency === 'gold' && gold < total) return `골드가 ${total - gold} 부족합니다.`
  if (currency === 'shards' && shards < total) return `조각이 ${total - shards} 부족합니다.`
  return null
}

/** What using an item on a card produces, or null when it would do nothing. */
export function applyToCard(id: ItemId, card: Card): Card | null {
  switch (id) {
    case 'drink': {
      if (card.condition >= MAX_CONDITION) return null
      return { ...card, condition: Math.min(MAX_CONDITION, card.condition + 30) }
    }
    case 'energyFull': {
      if (card.condition >= MAX_CONDITION) return null
      return { ...card, condition: MAX_CONDITION }
    }
    case 'medkit': {
      if (card.injuredFor <= 0) return null
      return { ...card, injuredFor: 0 }
    }
    default:
      return null
  }
}

/** Why an item cannot be used on this card, in words a player can act on. */
export function cardUseProblem(id: ItemId, card: Card): string | null {
  switch (id) {
    case 'drink':
    case 'energyFull':
      return card.condition >= MAX_CONDITION ? '이미 컨디션이 가득 찼습니다.' : null
    case 'medkit':
      return card.injuredFor > 0 ? null : '부상이 아닙니다.'
    default:
      return '이 선수에게는 쓸 수 없습니다.'
  }
}
