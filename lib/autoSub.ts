import { isSidelined } from './condition'
import { KNOBS, tune } from './tuning'
import { FORMATIONS } from './formations'
import { getPlayer } from './players'
import { lineupCapOf, ratingInSlot } from './squad'
import type { Card, PlayerDef, Squad } from './types'

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

    const injured = isSidelined(starter)
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
      if (isSidelined(candidate) || conditionOf(candidate) < readyAt) return
      if (levelTotal - starter.level + candidate.level > cap) return
      // Everywhere else, out of position is a penalty, not a ban — a full
      // eleven beats an empty slot. The goalkeeper is the one real exception:
      // nobody puts their keeper up front or a striker in goal, so this pair
      // is skipped outright rather than merely penalised.
      if (player.positions.includes('GK') !== (slot.position === 'GK')) return

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

export interface SidelinedFill {
  slotId: string | null
  /** Bench place refilled, when `slotId` is null. */
  benchIndex: number | null
  outUid: string
  inUid: string | null
  outName: string
  inName: string | null
}

const personOf = (player: PlayerDef | undefined, playerId: string) => player?.person ?? playerId

/** The club with most of the eleven — ties go to the club whose starters rate higher. */
export function majorityClubOf(cards: Card[], squad: Squad): string | null {
  const byUid = new Map(cards.map((card) => [card.uid, card]))
  const tally = new Map<string, { count: number; rating: number }>()
  for (const uid of Object.values(squad.slots)) {
    const card = uid ? byUid.get(uid) : undefined
    const player = card ? getPlayer(card.playerId) : undefined
    if (!card || !player) continue
    const entry = tally.get(player.club) ?? { count: 0, rating: 0 }
    entry.count += 1
    entry.rating += ratingInSlot(player, card.level, player.position)
    tally.set(player.club, entry)
  }
  let best: string | null = null
  let bestKey = -1
  for (const [club, entry] of tally) {
    const key = entry.count * 10000 + entry.rating
    if (key > bestKey) {
      bestKey = key
      best = club
    }
  }
  return best
}

/**
 * Nobody injured or suspended kicks off, on the pitch or on the bench. Runs
 * after applyAutoSubs, which already lifts a fit bench player into an injured
 * starter's place: what is left is a starter no bench player could cover and
 * the injured now sitting on the bench. Both are replaced from the rest of
 * the collection — a starter by the best fit for the slot, a bench place by
 * the best card of the club that has most of the eleven (so the 팀 컬러
 * holds), keeper for keeper. A person already in the eighteen is never
 * fielded twice. With nobody fit to come in, the place stays empty — an
 * academy stand-in beats an injured player limping through ninety minutes.
 */
export function clearSidelined(cards: Card[], squad: Squad, division: number): { squad: Squad; fills: SidelinedFill[] } {
  const formation = FORMATIONS[squad.formation] ?? FORMATIONS['4-3-3']
  const byUid = new Map(cards.map((card) => [card.uid, card]))
  const cap = lineupCapOf(division)
  const slots = { ...squad.slots }
  const bench = [...squad.bench]
  const fills: SidelinedFill[] = []

  const inLineup = () => new Set([...Object.values(slots), ...bench].filter((uid): uid is string => Boolean(uid)))
  const personsInLineup = () => {
    const persons = new Set<string>()
    for (const uid of inLineup()) {
      const card = byUid.get(uid)
      if (card) persons.add(personOf(getPlayer(card.playerId), card.playerId))
    }
    return persons
  }
  const nameOf = (card: Card | undefined) => (card ? getPlayer(card.playerId)?.name ?? '선수' : '선수')

  /** Fit cards outside the eighteen whose person is not already in it. */
  const pool = (): { card: Card; player: PlayerDef }[] => {
    const taken = inLineup()
    const persons = personsInLineup()
    const out: { card: Card; player: PlayerDef }[] = []
    for (const card of cards) {
      if (taken.has(card.uid) || isSidelined(card)) continue
      const player = getPlayer(card.playerId)
      if (!player || persons.has(personOf(player, card.playerId))) continue
      out.push({ card, player })
    }
    return out
  }

  // 1. Starters nobody on the bench could cover.
  let levelTotal = Object.values(slots).reduce((sum, uid) => sum + (uid ? byUid.get(uid)?.level ?? 0 : 0), 0)
  for (const slot of formation.slots) {
    const uid = slots[slot.id]
    const starter = uid ? byUid.get(uid) : undefined
    if (!starter || !isSidelined(starter)) continue
    slots[slot.id] = null
    levelTotal -= starter.level
    const club = majorityClubOf(cards, { ...squad, slots })
    let best: { card: Card; player: PlayerDef } | null = null
    let bestKey = -1
    for (const candidate of pool()) {
      if (candidate.player.positions.includes('GK') !== (slot.position === 'GK')) continue
      if (levelTotal + candidate.card.level > cap) continue
      const key =
        (candidate.card.condition >= SUB_READY_CONDITION ? 1_000_000 : 0) +
        (candidate.player.club === club ? 10_000 : 0) +
        ratingInSlot(candidate.player, candidate.card.level, slot.position)
      if (key > bestKey) {
        bestKey = key
        best = candidate
      }
    }
    if (best) {
      slots[slot.id] = best.card.uid
      levelTotal += best.card.level
    }
    fills.push({
      slotId: slot.id,
      benchIndex: null,
      outUid: starter.uid,
      inUid: best?.card.uid ?? null,
      outName: nameOf(starter),
      inName: best ? nameOf(best.card) : null,
    })
  }

  // 2. Bench places holding someone who cannot play.
  const club = majorityClubOf(cards, { ...squad, slots })
  bench.forEach((uid, index) => {
    const sitter = uid ? byUid.get(uid) : undefined
    if (!sitter || !isSidelined(sitter)) return
    bench[index] = null
    const wantsKeeper = getPlayer(sitter.playerId)?.positions.includes('GK') ?? false
    let best: { card: Card; player: PlayerDef } | null = null
    let bestKey = -1
    for (const candidate of pool()) {
      const isKeeper = candidate.player.positions.includes('GK')
      const key =
        (isKeeper === wantsKeeper ? 10_000_000 : 0) +
        (candidate.player.club === club ? 1_000_000 : 0) +
        (candidate.card.condition >= SUB_READY_CONDITION ? 100_000 : 0) +
        ratingInSlot(candidate.player, candidate.card.level, candidate.player.position)
      if (key > bestKey) {
        bestKey = key
        best = candidate
      }
    }
    if (best) bench[index] = best.card.uid
    fills.push({
      slotId: null,
      benchIndex: index,
      outUid: sitter.uid,
      inUid: best?.card.uid ?? null,
      outName: nameOf(sitter),
      inName: best ? nameOf(best.card) : null,
    })
  })

  return { squad: { ...squad, slots, bench }, fills }
}
