import { expForLevel } from './growth'
import { getPlayer, levelCap } from './players'
import { RARITY_STYLES, trainCost } from './rarity'
import type { Card, SaveNotice } from './types'

/**
 * 등급 재편 (2026-09-07): level caps came down to 일반 7 · 실버 8 · 골드 9 and
 * many cards changed grade, so a save can hold cards above their new cap.
 * Every save read (local or cloud) passes through here: a card over the cap
 * is pulled down to it, its limit-break count likewise, and the manager is
 * paid back — three times the training fee for each lost level, five times
 * for each lost limit step (the duplicate card that bought it is gone).
 * Idempotent: a second pass finds nothing above the cap and pays nothing.
 */
export interface CapAdjustment {
  uid: string
  name: string
  grade: string
  from: number
  to: number
  limitFrom: number
  limitTo: number
  refund: number
}

export const LEVEL_REFUND_MULTIPLIER = 3
export const LIMIT_REFUND_MULTIPLIER = 5

export function applyLevelCaps(cards: readonly Card[]): { cards: Card[]; refund: number; adjusted: CapAdjustment[] } {
  const adjusted: CapAdjustment[] = []
  let refund = 0
  const next = cards.map((card) => {
    const player = getPlayer(card.playerId)
    if (!player) return card
    const cap = levelCap(player)
    if (card.level <= cap && card.limit <= cap) return card
    const level = Math.min(card.level, cap)
    const limit = Math.max(level, Math.min(card.limit, cap))
    let paid = 0
    for (let lost = level + 1; lost <= card.level; lost += 1) paid += trainCost(player.rarity, lost) * LEVEL_REFUND_MULTIPLIER
    paid += Math.max(0, card.limit - limit) * trainCost(player.rarity, cap) * LIMIT_REFUND_MULTIPLIER
    refund += paid
    adjusted.push({
      uid: card.uid,
      name: player.name,
      grade: RARITY_STYLES[player.rarity].label,
      from: card.level,
      to: level,
      limitFrom: card.limit,
      limitTo: limit,
      refund: paid,
    })
    // Exp banked past the next level would be lost anyway at the cap; keep what fits.
    const exp = Math.min(card.exp, Math.max(0, expForLevel(level) - 1))
    return { ...card, level, limit, exp }
  })
  return { cards: next, refund, adjusted }
}

/** The one-time popup for a save that was adjusted (components/SaveNoticePopup.tsx). */
export function levelCapNotice(result: { refund: number; adjusted: CapAdjustment[] }): SaveNotice {
  const shown = result.adjusted.slice(0, 12).map((item) => {
    const level = item.from !== item.to ? `Lv.${item.from}→${item.to}` : ''
    const limit = item.limitFrom !== item.limitTo ? `한계 ${item.limitFrom}→${item.limitTo}` : ''
    return `${item.name} (${item.grade}) ${[level, limit].filter(Boolean).join(' · ')} — +${item.refund.toLocaleString('ko-KR')}G`
  })
  if (result.adjusted.length > shown.length) shown.push(`외 ${result.adjusted.length - shown.length}장`)
  return {
    id: `level-cap:${Date.now()}`,
    title: '등급 재편에 따른 레벨 조정과 보상',
    lines: [
      '레벨 한계가 일반 7 · 실버 8 · 골드 9 · 플래티넘 10으로 바뀌었고, 등급이 바뀐 카드도 있습니다. 새 한계를 넘던 카드는 한계로 맞추고, 잃은 레벨은 훈련비의 3배, 잃은 한계 돌파는 5배를 골드로 돌려드렸습니다.',
      ...shown,
    ],
    gold: result.refund,
  }
}
