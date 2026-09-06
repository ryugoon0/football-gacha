import { getPlayer } from './players'
import { releasedPoolFor } from './gacha'
import { KNOBS, tune } from './tuning'
import { RARITIES } from './rarity'
import type { Card, PlayerDef, Rarity, Squad } from './types'

/** Cards needed for one upgrade when the operator has not set a grade's own count. */
export const FUSION_SIZE = 3
/** 월드 cards fused into one 월드 스카우트팩 (a server balance — lib/serverDraw.ts fuseWorldOnServer). */
export const WORLD_FUSION_SIZE = 3
/** Gold charged on top of the cards. */
export const FUSION_FEE = KNOBS.fusionFee.default

/** Cards of grade `from` needed to make one of the next grade — an operator knob per grade. */
export function fusionSizeFor(from: Rarity): number {
  switch (from) {
    case 'Normal':
      return tune('fusionSizeNormal')
    case 'Rare':
      return tune('fusionSizeRare')
    case 'Legend':
      return tune('fusionSizeGold')
    case 'Live':
      return tune('fusionSizeLive')
    case 'World':
      return WORLD_FUSION_SIZE
    default:
      return FUSION_SIZE
  }
}

/** The largest count any grade needs — how many picks the screen should allow. */
export function fusionSizeMax(): number {
  return Math.max(...RARITIES.filter((rarity) => nextRarity(rarity)).map((rarity) => fusionSizeFor(rarity)))
}

export function nextRarity(rarity: Rarity): Rarity | null {
  const index = RARITIES.indexOf(rarity)
  return index >= 0 && index < RARITIES.length - 1 ? RARITIES[index + 1] : null
}

export interface FusionCheck {
  ok: boolean
  reason?: string
  from?: Rarity
  to?: Rarity
  /** 월드 × 3: the result is a 월드 스카우트팩, not a card. */
  worldPack?: boolean
}

export function checkFusion(
  cards: Card[],
  uids: string[],
  squad: Squad,
  gold: number,
): FusionCheck {
  if (uids.length === 0) {
    return { ok: false, reason: `같은 등급 카드를 ${FUSION_SIZE}장 이상 선택하세요.` }
  }
  const selected = uids.map((uid) => cards.find((card) => card.uid === uid))
  if (selected.some((card) => !card)) return { ok: false, reason: '선택한 카드를 찾을 수 없습니다.' }

  const onPitch = new Set(Object.values(squad.slots).filter(Boolean) as string[])
  if (uids.some((uid) => onPitch.has(uid))) {
    return { ok: false, reason: '선발 명단에 있는 카드는 합성할 수 없습니다.' }
  }

  const rarities = selected.map((card) => getPlayer(card!.playerId)?.rarity)
  const from = rarities[0]
  if (!from || rarities.some((rarity) => rarity !== from)) {
    return { ok: false, reason: '같은 등급끼리만 합성할 수 있습니다.' }
  }
  const size = fusionSizeFor(from)
  if (from === 'World') {
    // Three 월드 cards make one 월드 스카우트팩; no gold on top — the cards are the price.
    if (uids.length !== size) {
      return { ok: false, reason: `월드 카드 ${size}장을 선택하세요 (지금 ${uids.length}장).`, from, worldPack: true }
    }
    return { ok: true, from, worldPack: true }
  }
  const to = nextRarity(from)
  if (!to) return { ok: false, reason: '월드 등급은 더 올라갈 곳이 없습니다.', from }
  if (uids.length !== size) {
    return { ok: false, reason: `같은 등급 카드 ${size}장을 선택하세요 (지금 ${uids.length}장).`, from, to }
  }
  const fee = tune('fusionFee')
  if (gold < fee) return { ok: false, reason: `합성 비용 ${fee}G가 부족합니다.`, from, to }

  return { ok: true, from, to }
}

export function fusionResult(to: Rarity, rng: () => number = Math.random): PlayerDef {
  const pool = releasedPoolFor(to)
  return pool[Math.floor(rng() * pool.length)]
}

export interface BulkFusionGroup {
  from: Rarity
  to: Rarity
  /** Cards one upgrade of this grade costs. */
  size: number
  /** Unlocked, out-of-squad cards of this grade the manager let the plan touch. */
  eligible: number
  batches: string[][]
  /** Eligible cards left over after whole batches — never fused. */
  leftover: number
}

export interface BulkFusionPlan {
  groups: BulkFusionGroup[]
  fusions: number
  fee: number
  feeTotal: number
  /** Batches gold covers, in group order — the rest are dropped before dispatch. */
  affordableFusions: number
}

/**
 * Everything the manager did not protect, fused a grade at a time: locked
 * cards and the eighteen never move, and by default neither does anything
 * that has been trained (level 2+ or any exp) — those are the cards people
 * regret losing. Within a grade the cheapest cards go first (lowest level,
 * then exp), whole batches only, one pass — the cards a batch produces are
 * not fused again in the same run.
 */
export function planBulkFusion(
  cards: Card[],
  squad: Squad,
  gold: number,
  options: { rarities?: Rarity[]; keepGrown?: boolean } = {},
): BulkFusionPlan {
  const keepGrown = options.keepGrown ?? true
  const wanted = new Set(options.rarities ?? RARITIES)
  const inUse = new Set([...Object.values(squad.slots), ...squad.bench].filter(Boolean) as string[])
  const fee = tune('fusionFee')
  const groups: BulkFusionGroup[] = []
  for (const from of RARITIES) {
    const to = nextRarity(from)
    if (!to || !wanted.has(from)) continue
    const size = fusionSizeFor(from)
    const pool = cards
      .filter((card) => {
        if (card.locked || inUse.has(card.uid)) return false
        if (keepGrown && (card.level > 1 || card.exp > 0)) return false
        return getPlayer(card.playerId)?.rarity === from
      })
      .sort((a, b) => a.level - b.level || a.exp - b.exp || a.uid.localeCompare(b.uid))
    const batches: string[][] = []
    for (let index = 0; index + size <= pool.length; index += size) {
      batches.push(pool.slice(index, index + size).map((card) => card.uid))
    }
    groups.push({ from, to, size, eligible: pool.length, batches, leftover: pool.length - batches.length * size })
  }
  const fusions = groups.reduce((total, group) => total + group.batches.length, 0)
  const affordableFusions = fee > 0 ? Math.min(fusions, Math.floor(gold / fee)) : fusions
  return { groups, fusions, fee, feeTotal: fusions * fee, affordableFusions }
}

/** The batches gold actually covers, in plan order. */
export function affordableBatches(plan: BulkFusionPlan): { uids: string[]; to: Rarity }[] {
  const out: { uids: string[]; to: Rarity }[] = []
  for (const group of plan.groups) {
    for (const uids of group.batches) {
      if (out.length >= plan.affordableFusions) return out
      out.push({ uids, to: group.to })
    }
  }
  return out
}
