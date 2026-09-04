/**
 * 작전카드 — a one-off tactical push for a weekly fixture, chosen before
 * kick-off (docs/WEEKLY_LIVE_MATCH_DESIGN.md, "작전카드").
 *
 * Not a stat buff. A card moves the same tactical parameters a manager can
 * set by hand (lib/tactics/params.ts) — hard, briefly, and always with a
 * price attached: every effect ships with a tradeoff of the same duration,
 * so a card is a bet on how the opening minutes go, not free power. One card
 * per match, played in the pre-match window only; it wears off on its own.
 *
 * Cards are items (lib/items.ts): bought with gold or shards, or earned at
 * the end of a league week and in cup finals (weekly_rewards 'tactic_card').
 */
import { normalizeParams, type TacticalParams } from '../tactics/params'

export type TacticCardId = 'cardAllOutAttack' | 'cardCalmDefence' | 'cardQuickCounter'

export interface TacticCardDef {
  id: TacticCardId
  name: string
  /** What it does, for the manager — effect first, then the price. */
  note: string
  icon: string
  effect: Partial<TacticalParams>
  tradeoff: Partial<TacticalParams>
  /** Minutes from kick-off the card is live for. */
  durationMinutes: number
}

export const TACTIC_CARDS: Record<TacticCardId, TacticCardDef> = {
  cardAllOutAttack: {
    id: 'cardAllOutAttack',
    name: '총공격 지시',
    note: '킥오프부터 15분간 공격 가담과 크로스가 크게 늘고 마무리를 서두릅니다. 대가로 그 시간 동안 뒷공간이 열립니다.',
    icon: '🔥',
    effect: { forwardRunFrequency: 25, crossFrequency: 20, finalThirdPatience: -20 },
    tradeoff: { restDefence: -30, regroupPriority: -20 },
    durationMinutes: 15,
  },
  cardCalmDefence: {
    id: 'cardCalmDefence',
    name: '침착한 수비',
    note: '킥오프부터 15분간 라인을 내리고 압박 간격을 좁혀 실점 위험을 줄입니다. 대가로 역습과 템포가 무뎌집니다.',
    icon: '🛡️',
    effect: { defensiveLine: -15, pressingCompactness: 20 },
    tradeoff: { counterAttackIntensity: -25, tempo: -15 },
    durationMinutes: 15,
  },
  cardQuickCounter: {
    id: 'cardQuickCounter',
    name: '즉각 역습',
    note: '킥오프부터 10분간 공을 되찾는 즉시 빠르게 앞으로 나갑니다. 대가로 빌드업이 거칠어집니다.',
    icon: '⚡',
    effect: { counterAttackIntensity: 30, transitionSpeed: 20 },
    tradeoff: { buildUpShortness: -20 },
    durationMinutes: 10,
  },
}

export const TACTIC_CARD_IDS = Object.keys(TACTIC_CARDS) as TacticCardId[]

export function isTacticCardId(value: unknown): value is TacticCardId {
  return typeof value === 'string' && value in TACTIC_CARDS
}

/** The card's effect and its price laid over a side's parameters, kept inside 0–100. */
export function applyCardOverlay(base: TacticalParams, card: TacticCardDef): TacticalParams {
  const next: Record<string, number> = { ...base }
  for (const [key, delta] of Object.entries({ ...card.effect, ...card.tradeoff })) {
    if (typeof delta !== 'number') continue
    const effect = card.effect[key as keyof TacticalParams] ?? 0
    const tradeoff = card.tradeoff[key as keyof TacticalParams] ?? 0
    next[key] = base[key as keyof TacticalParams] + effect + tradeoff
  }
  return normalizeParams(next as Partial<TacticalParams>)
}
