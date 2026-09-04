import { getPlayer } from './players'
import { KNOBS, tune } from './tuning'
import { playerTraitFactors } from './traits'
import type { Card } from './types'

export const MAX_CONDITION = 100
/** Condition below this is flagged in the UI. */
export const TIRED_CONDITION = KNOBS.tiredCondition.default
/** Gold per condition point when paying for recovery. */
export const RECOVERY_COST_PER_POINT = KNOBS.recoveryCostPerPoint.default
/** Gold per remaining match when treating an injury. */
export const TREATMENT_COST_PER_MATCH = KNOBS.treatmentCostPerMatch.default

export function isInjured(card: Card): boolean {
  return card.injuredFor > 0
}

export function isSuspended(card: Card): boolean {
  return (card.suspendedFor ?? 0) > 0
}

/** Cannot take the field this match — hurt or banned. */
export function isSidelined(card: Card): boolean {
  return isInjured(card) || isSuspended(card)
}

/** Yellows in one season before a one-match ban (docs spec default). */
export const YELLOW_BAN_THRESHOLD = 4

/**
 * Bans and yellow tallies from a finished match. A red is a ban of one match
 * for two yellows, one to three for a straight red; the fourth yellow of the
 * season is a one-match ban and the count starts again.
 */
export function applyDiscipline(
  cards: Card[],
  result: { yellowUids?: string[]; redUids?: string[] },
  rng: () => number = Math.random,
): Card[] {
  const yellows = result.yellowUids ?? []
  const reds = new Set(result.redUids ?? [])
  if (yellows.length === 0 && reds.size === 0) return cards
  return cards.map((card) => {
    if (!reds.has(card.uid) && !yellows.includes(card.uid)) return card
    let suspendedFor = card.suspendedFor ?? 0
    let tally = card.yellows ?? 0
    if (reds.has(card.uid)) {
      const secondYellow = yellows.filter((uid) => uid === card.uid).length >= 2
      suspendedFor = Math.max(suspendedFor, secondYellow ? 1 : 1 + Math.floor(rng() * 3))
    } else {
      tally += 1
      if (tally >= YELLOW_BAN_THRESHOLD) {
        suspendedFor = Math.max(suspendedFor, 1)
        tally = 0
      }
    }
    return { ...card, suspendedFor, yellows: tally }
  })
}

export function isAvailable(card: Card): boolean {
  return !isInjured(card)
}

/** Tired players play worse: 100 condition = full rating, 0 = 85%. */
export function conditionFactor(condition: number): number {
  // Cards from an older save may not carry fitness yet.
  if (!Number.isFinite(condition)) return 1
  const clamped = Math.max(0, Math.min(MAX_CONDITION, condition))
  return 0.85 + (clamped / MAX_CONDITION) * 0.15
}

export function recoveryCost(card: Card): number {
  return Math.round((MAX_CONDITION - card.condition) * tune('recoveryCostPerPoint'))
}

export function treatmentCost(card: Card): number {
  return card.injuredFor * tune('treatmentCostPerMatch')
}

export interface MatchWear {
  cards: Card[]
  /** Players who picked up a knock in this match. */
  injuries: { uid: string; matches: number }[]
}

/**
 * Applies the wear of one match: starters tire and can get injured, everyone
 * else rests and works off an existing injury.
 */
export function applyMatchWear(
  cards: Card[],
  startingUids: string[],
  rng: () => number = Math.random,
  /** Friendlies tire the legs but never break anyone. */
  allowInjuries = true,
): MatchWear {
  const starters = new Set(startingUids)
  const injuries: { uid: string; matches: number }[] = []

  const next = cards.map((card) => {
    if (!starters.has(card.uid)) {
      return {
        ...card,
        condition: Math.min(MAX_CONDITION, card.condition + 15),
        injuredFor: Math.max(0, card.injuredFor - 1),
        // A banned player serves the match by sitting it out.
        suspendedFor: Math.max(0, (card.suspendedFor ?? 0) - 1),
      }
    }

    const factors = playerTraitFactors(getPlayer(card.playerId))
    const drain = Math.round((5 + Math.floor(rng() * 7)) * factors.conditionDrain)
    const condition = Math.max(0, card.condition - drain)
    // A tired player is likelier to break down.
    const risk =
      (0.02 + ((MAX_CONDITION - card.condition) / MAX_CONDITION) * 0.05) * factors.injuryRisk
    let injuredFor = Math.max(0, card.injuredFor - 1)
    if (allowInjuries && rng() < risk) {
      injuredFor = 1 + Math.floor(rng() * 3)
      injuries.push({ uid: card.uid, matches: injuredFor })
    }
    return { ...card, condition, injuredFor }
  })

  return { cards: next, injuries }
}
