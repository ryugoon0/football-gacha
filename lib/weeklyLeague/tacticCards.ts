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

export type TacticCardId =
  | 'cardAllOutAttack'
  | 'cardCalmDefence'
  | 'cardQuickCounter'
  | 'cardHighPress'
  | 'cardWingOverload'
  | 'cardMidfieldControl'
  | 'cardLongBall'
  | 'cardParkTheBus'

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
  cardHighPress: {
    id: 'cardHighPress',
    name: '전방 압박',
    note: '킥오프부터 12분간 첫 라인부터 강하게 압박하고 공을 잃으면 즉시 되찾으러 갑니다. 대가로 최종 라인이 올라가 뒷공간이 넓어집니다.',
    icon: '🏃',
    effect: { pressingIntensity: 25, blockHeight: 20, counterPressIntensity: 20 },
    tradeoff: { defensiveLine: 15, restDefence: -15 },
    durationMinutes: 12,
  },
  cardWingOverload: {
    id: 'cardWingOverload',
    name: '측면 폭격',
    note: '킥오프부터 15분간 넓게 벌려 풀백이 오버래핑하고 크로스를 쏟아 넣습니다. 대가로 수비 폭이 좁아지고 빌드업이 급해집니다.',
    icon: '🎯',
    effect: { attackingWidth: 25, overlapFrequency: 25, crossFrequency: 15 },
    tradeoff: { defensiveWidth: -15, buildUpShortness: -15 },
    durationMinutes: 15,
  },
  cardMidfieldControl: {
    id: 'cardMidfieldControl',
    name: '중원 장악',
    note: '킥오프부터 20분간 짧게 안전하게 돌리며 기회를 기다립니다. 대가로 직선적인 공격·역습·전진이 줄어듭니다.',
    icon: '🧠',
    effect: { buildUpShortness: 20, passingRisk: -20, finalThirdPatience: 20 },
    tradeoff: { directness: -20, counterAttackIntensity: -20, forwardRunFrequency: -15 },
    durationMinutes: 20,
  },
  cardLongBall: {
    id: 'cardLongBall',
    name: '롱볼 전환',
    note: '킥오프부터 15분간 길게, 뒷공간으로 찔러 넣습니다. 대가로 패스 성공률이 떨어지고 빌드업이 거칠어집니다.',
    icon: '🚀',
    effect: { directness: 30, throughBallFrequency: 20 },
    tradeoff: { passingRisk: 20, buildUpShortness: -25 },
    durationMinutes: 15,
  },
  cardParkTheBus: {
    id: 'cardParkTheBus',
    name: '수비 잠금',
    note: '킥오프부터 20분간 라인을 깊게 내리고 뒤에 사람을 남겨 잠급니다. 대가로 공격 가담과 템포가 크게 줄어듭니다.',
    icon: '🚌',
    effect: { defensiveLine: -25, blockHeight: -20, restDefence: 25 },
    tradeoff: { forwardRunFrequency: -25, tempo: -15 },
    durationMinutes: 20,
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
