import { isInjured } from './condition'
import { FORMATIONS } from './formations'
import { getPlayer } from './players'
import { lineupCapOf, positionFit, ratingInSlot } from './squad'
import type { Card, Squad } from './types'

/** A starter this tired is pulled when auto substitution is on. */
export const TIRED_SUB_THRESHOLD = 45
/** A substitute needs at least this much in the tank to come on. */
export const SUB_READY_CONDITION = 55

export interface SubEvent {
  slotId: string
  outUid: string
  inUid: string
  outName: string
  inName: string
  reason: 'injury' | 'fatigue'
}

/**
 * Swaps injured or exhausted starters for the best bench player who can cover
 * the position, without breaking the division's level budget.
 */
export function applyAutoSubs(
  cards: Card[],
  squad: Squad,
  division: number,
): { squad: Squad; subs: SubEvent[] } {
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
    const uid = slots[slot.id]
    const starter = uid ? byUid.get(uid) : undefined
    if (!starter) continue

    const injured = isInjured(starter)
    const tired = starter.condition < TIRED_SUB_THRESHOLD
    if (!injured && !tired) continue

    let bestIndex = -1
    let bestScore = -1
    bench.forEach((benchUid, index) => {
      if (!benchUid) return
      const candidate = byUid.get(benchUid)
      const player = candidate ? getPlayer(candidate.playerId) : undefined
      if (!candidate || !player) return
      if (isInjured(candidate) || candidate.condition < SUB_READY_CONDITION) return
      if (positionFit(player, slot.position) === 'out') return
      if (levelTotal - starter.level + candidate.level > cap) return

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
