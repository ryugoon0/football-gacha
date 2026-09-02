import { isInjured } from './condition'
import { KNOBS, tune } from './tuning'
import { FORMATIONS } from './formations'
import { getPlayer } from './players'
import { lineupCapOf, ratingInSlot } from './squad'
import type { Card, Squad } from './types'

/** A starter this tired is pulled when auto substitution is on. */
export const TIRED_SUB_THRESHOLD = KNOBS.tiredSubThreshold.default
/** A substitute needs at least this much in the tank to come on. */
export const SUB_READY_CONDITION = 55

export interface SubEvent {
  slotId: string
  outUid: string
  inUid: string
  outName: string
  inName: string
  reason: 'injury' | 'fatigue' | 'manual'
}

/**
 * Swaps injured or exhausted starters for the best bench player who can cover
 * the position, without breaking the division's level budget.
 *
 * `conditionOf` lets the caller pass live match stamina instead of the stored
 * condition, and `tiredBelow` the point where a starter is worth pulling, so
 * the same rule works before kick off and during a match.
 */
export function applyAutoSubs(
  cards: Card[],
  squad: Squad,
  division: number,
  conditionOf: (card: Card) => number = (card) => card.condition,
  tiredBelow: number = tune('tiredSubThreshold'),
  /** How many changes are still allowed in this match. */
  allowance: number = Number.POSITIVE_INFINITY,
): { squad: Squad; subs: SubEvent[] } {
  if (allowance <= 0) return { squad, subs: [] }
  const formation = FORMATIONS[squad.formation] ?? FORMATIONS['4-3-3']
  const byUid = new Map(cards.map((card) => [card.uid, card]))
  const cap = lineupCapOf(division)

  const slots = { ...squad.slots }
  const bench = [...squad.bench]
  const subs: SubEvent[] = []

  let levelTotal = Object.values(slots).reduce(
    (sum, uid) => sum + (uid ? byUid.get(uid)?.level ?? 0 : 0),
    0,
  )

  for (const slot of formation.slots) {
    // A match allows only so many changes; the rest of the tired stay on.
    if (subs.length >= allowance) break
    const uid = slots[slot.id]
    const starter = uid ? byUid.get(uid) : undefined
    if (!starter) continue

    const injured = isInjured(starter)
    const tired = conditionOf(starter) < tiredBelow
    if (!injured && !tired) continue

    let bestIndex = -1
    let bestScore = -1
    bench.forEach((benchUid, index) => {
      if (!benchUid) return
      const candidate = byUid.get(benchUid)
      const player = candidate ? getPlayer(candidate.playerId) : undefined
      if (!candidate || !player) return
      // A replacement must be fresher than the bar we just pulled someone out
      // for, or the pair swap places again the moment the whistle goes. The
      // operator can raise the tired threshold, so this cannot be a constant.
      const readyAt = Math.max(SUB_READY_CONDITION, tiredBelow)
      if (isInjured(candidate) || conditionOf(candidate) < readyAt) return
      if (levelTotal - starter.level + candidate.level > cap) return

      // Out of position is a heavy penalty rather than a ban, so an injured
      // starter is always replaced when the bench has anyone fit to run.
      const score = ratingInSlot(player, candidate.level, slot.position)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    if (bestIndex < 0) continue

    const incomingUid = bench[bestIndex]!
    const incoming = byUid.get(incomingUid)!
    slots[slot.id] = incomingUid
    bench[bestIndex] = starter.uid
    levelTotal += incoming.level - starter.level

    subs.push({
      slotId: slot.id,
      outUid: starter.uid,
      inUid: incomingUid,
      outName: getPlayer(starter.playerId)?.name ?? '선수',
      inName: getPlayer(incoming.playerId)?.name ?? '선수',
      reason: injured ? 'injury' : 'fatigue',
    })
  }

  return { squad: { ...squad, slots, bench }, subs }
}
