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
  | 'teamCondition'
  | 'friendlyTicket'
  | 'vaultPermit'
  | 'shardPouch'
  // 스카우트 지정권 — 원하는 카드 한 장을 골라 받는다 (lib/pickTicket.ts). 상점에서 팔지 않고 선물·이벤트로만.
  | 'platinumPick'
  | 'livePick'
  // 히든 카드 — 경쟁 리그 경기 시작 전에 고르는 한 판짜리 조건부 능력치 카드 (lib/weeklyLeague/tacticCards.ts).
  | 'cardUnderdog'
  | 'cardEvenMatch'
  | 'cardHomeCrowd'
  | 'cardAwayGrit'
  | 'cardBigStage'
  | 'cardHotTime'
  | 'cardChaser'
  | 'cardLockdown'
  | 'cardFastStart'
  | 'cardSecondHalf'
  | 'cardLateLegs'
  | 'cardGoalmouth'

/** What an item is used on. 'match' is played from the live screen before a weekly kick-off; 'pick' opens a card chooser. */
export type ItemTarget = 'card' | 'club' | 'match' | 'pick'

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
  teamCondition: {
    id: 'teamCondition',
    name: '팀 컨디션 회복권',
    note: '선수단 전원의 컨디션을 한 번에 가득 채웁니다. 경쟁 리그 킥오프 전에 쓰면 그 경기에 온전한 체력으로 나섭니다.',
    target: 'club',
    icon: '🔋',
    gold: 2500,
    shards: 150,
    dailyLimit: 2,
  },
  // 이적시장 갱신권 (marketTicket) was retired with the market tab (2026-09-05);
  // normalizeInventory drops it from old saves.
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
    note: '카드 조각 120개를 얻습니다. 상점에서 내렸고(2026-09-07) 갖고 있던 것은 그대로 쓸 수 있습니다.',
    target: 'club',
    icon: '🧧',
    gold: null,
    shards: null,
    dailyLimit: null,
  },
  platinumPick: {
    id: 'platinumPick',
    name: '플래티넘 스카우트 지정권',
    note: '출시된 플래티넘 카드 가운데 원하는 선수 한 장을 골라 받습니다. 보관함이 가득 차도 들어옵니다. 상점에서는 팔지 않습니다.',
    target: 'pick',
    icon: '🎯',
    gold: null,
    shards: null,
    dailyLimit: null,
  },
  livePick: {
    id: 'livePick',
    name: '라이브 스카우트 지정권',
    note: '리미티드(라이브) 카드 가운데 원하는 선수 한 장을 골라 받습니다. 한 번 열렸던 주의 카드는 기간이 지나도 고를 수 있습니다. 상점에서는 팔지 않습니다.',
    target: 'pick',
    icon: '🎫',
    gold: null,
    shards: null,
    dailyLimit: null,
  },
  cardUnderdog: {
    id: 'cardUnderdog',
    name: '히든 카드 · 공은 원래 둥글다',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 상대 종합이 우리보다 5 이상 높은 경기에서 경기 내내 전원 모든 능력치 +5. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '⚽',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardEvenMatch: {
    id: 'cardEvenMatch',
    name: '히든 카드 · 중원이 가른다',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 두 팀 종합 차이가 5 미만인 경기에서 경기 내내 미드필더의 패스·드리블 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '⚖️',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardHomeCrowd: {
    id: 'cardHomeCrowd',
    name: '히든 카드 · 열두 번째 선수',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 홈 경기에서 경기 내내 전원 피지컬·속력 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '📣',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardAwayGrit: {
    id: 'cardAwayGrit',
    name: '히든 카드 · 원정 투혼',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 원정 경기에서 경기 내내 수비·골키퍼의 수비·피지컬 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🚩',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardBigStage: {
    id: 'cardBigStage',
    name: '히든 카드 · 큰 경기에 강하다',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 중립 구장 경기(컵 결승·Masters Final)에서 경기 내내 공격진의 슈팅·드리블 +7. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🏟️',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardHotTime: {
    id: 'cardHotTime',
    name: '히든 카드 · 핫타임 집중',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 핫타임(15시·21시) 킥오프 경기에서 경기 내내 전원 모든 능력치 +4. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🔥',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardChaser: {
    id: 'cardChaser',
    name: '히든 카드 · 추격자 본능',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 우리가 뒤지고 있는 동안 공격·미드필더의 슈팅·패스·드리블 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🏃',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardLockdown: {
    id: 'cardLockdown',
    name: '히든 카드 · 리드는 지킨다',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 우리가 앞서고 있는 동안 수비·골키퍼의 수비·피지컬 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🔒',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardFastStart: {
    id: 'cardFastStart',
    name: '히든 카드 · 초반 러시',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 킥오프부터 20분까지 전원 속력 +8. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🚀',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardSecondHalf: {
    id: 'cardSecondHalf',
    name: '히든 카드 · 후반의 사나이',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 후반전(45분 이후) 내내 공격진의 슈팅 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🌙',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardLateLegs: {
    id: 'cardLateLegs',
    name: '히든 카드 · 지지 않는 다리',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 70분 이후 경기 끝까지 전원 피지컬·속력 +6. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🦵',
    gold: 1200,
    shards: 60,
    dailyLimit: 3,
  },
  cardGoalmouth: {
    id: 'cardGoalmouth',
    name: '히든 카드 · 골문 앞 집중',
    note: '경쟁 리그 경기 시작 전에 고릅니다. 상대 슈팅이 8개를 넘은 뒤부터 골키퍼·수비의 수비 +7. 한 경기 한 장, 조건이 맞는 동안만 발동합니다.',
    target: 'match',
    icon: '🧤',
    gold: 1200,
    shards: 60,
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

/** What the shop should show, in the catalogue's order — gift-only items (no price at all) never sit on the shelf. */
export function visibleItemIds(): ItemId[] {
  return ITEM_IDS.filter((id) => isItemVisible(id) && (ITEMS[id].gold !== null || ITEMS[id].shards !== null))
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
