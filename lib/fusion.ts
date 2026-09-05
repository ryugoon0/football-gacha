import { PLAYERS_BY_RARITY, getPlayer } from './players'
import { KNOBS, tune } from './tuning'
import { RARITIES } from './rarity'
import type { Card, PlayerDef, Rarity, Squad } from './types'

/** Cards needed for one upgrade when the operator has not set a grade's own count. */
export const FUSION_SIZE = 3
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
  const to = nextRarity(from)
  if (!to) return { ok: false, reason: '레전드 등급은 더 올라갈 곳이 없습니다.', from }
  const size = fusionSizeFor(from)
  if (uids.length !== size) {
    return { ok: false, reason: `같은 등급 카드 ${size}장을 선택하세요 (지금 ${uids.length}장).`, from, to }
  }
  const fee = tune('fusionFee')
  if (gold < fee) return { ok: false, reason: `합성 비용 ${fee}G가 부족합니다.`, from, to }

  return { ok: true, from, to }
}

export function fusionResult(to: Rarity, rng: () => number = Math.random): PlayerDef {
  const pool = PLAYERS_BY_RARITY[to]
  return pool[Math.floor(rng() * pool.length)]
}
