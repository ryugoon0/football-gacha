import { conditionFactor, isInjured } from './condition'
import { FORMATIONS, emptySlots } from './formations'
import { BOTTOM_DIVISION } from './league'
import { POSITION_GROUP, effectiveOvr, getPlayer, hiddenPower } from './players'
import { teamColors, type TeamColors } from './teamColor'
import { teamTraitEffects, type TraitEffects } from './traits'
import type { Card, PlayerDef, Position, Squad } from './types'

/** Rating used for a slot nobody is assigned to — an academy stand-in. */
export const EMPTY_SLOT_RATING = 38
/** Bench places available for substitutions. */
export const BENCH_SIZE = 7

/**
 * Total starting level a division allows. Registering a stronger line-up is
 * blocked, so promotion means rebuilding rather than steamrolling.
 */
export const LINEUP_LEVEL_CAPS: Record<number, number> = {
  5: 55,
  4: 66,
  3: 77,
  2: 89,
  1: 110,
}

export function lineupCapOf(division: number): number {
  return LINEUP_LEVEL_CAPS[division] ?? LINEUP_LEVEL_CAPS[BOTTOM_DIVISION]
}

export type PositionFit = 'main' | 'sub' | 'out' | 'empty'

/** Playing away from a listed position wrecks a player's rating. */
export const OUT_OF_POSITION_FACTOR = 0.55
const SUB_POSITION_PENALTY = 4

export function positionFit(player: PlayerDef, slotPosition: Position): PositionFit {
  if (player.position === slotPosition) return 'main'
  return player.positions.includes(slotPosition) ? 'sub' : 'out'
}

export function ratingInSlot(player: PlayerDef, level: number, slotPosition: Position): number {
  const base = effectiveOvr(player, level)
  const fit = positionFit(player, slotPosition)
  if (fit === 'main') return base
  if (fit === 'sub') return Math.max(20, base - SUB_POSITION_PENALTY)
  return Math.max(15, Math.round(base * OUT_OF_POSITION_FACTOR))
}

export interface SlotEvaluation {
  slotId: string
  slotPosition: Position
  card: Card | null
  player: PlayerDef | null
  baseOvr: number
  rating: number
  fit: PositionFit
  condition: number
  injured: boolean
}

/** Positions with nobody fit to play them — an empty slot or an injured starter. */
export function missingSlots(evaluations: SlotEvaluation[]): {
  empty: string[]
  injured: string[]
} {
  const empty: string[] = []
  const injured: string[] = []
  for (const item of evaluations) {
    if (!item.card) empty.push(item.slotPosition)
    else if (item.injured) injured.push(item.slotPosition)
  }
  return { empty, injured }
}

export interface SquadRating {
  overall: number
  att: number
  mid: number
  def: number
  chemistry: number
  filled: number
  evaluations: SlotEvaluation[]
  traits: TraitEffects
  colors: TeamColors
  /** Hidden attribute average of the eleven, 0-12. */
  hidden: number
  /** Sum of the starting levels. */
  levelTotal: number
  /** What this division allows. */
  levelCap: number
  overCap: boolean
}

export function evaluateSquad(
  cards: Card[],
  squad: Squad,
  division: number = BOTTOM_DIVISION,
): SquadRating {
  const byUid = new Map(cards.map((card) => [card.uid, card]))
  const formation = FORMATIONS[squad.formation] ?? FORMATIONS['4-3-3']

  const evaluations: SlotEvaluation[] = formation.slots.map((slot) => {
    const uid = squad.slots[slot.id]
    const card = uid ? byUid.get(uid) ?? null : null
    const player = card ? getPlayer(card.playerId) ?? null : null
    if (!card || !player) {
      return {
        slotId: slot.id,
        slotPosition: slot.position,
        card: null,
        player: null,
        baseOvr: 0,
        rating: EMPTY_SLOT_RATING,
        fit: 'empty',
        condition: 0,
        injured: false,
      }
    }

    const injured = isInjured(card)
    const baseOvr = effectiveOvr(player, card.level)
    const rating = injured
      ? EMPTY_SLOT_RATING
      : Math.round(ratingInSlot(player, card.level, slot.position) * conditionFactor(card.condition))

    return {
      slotId: slot.id,
      slotPosition: slot.position,
      card,
      player,
      baseOvr,
      rating,
      fit: positionFit(player, slot.position),
      condition: card.condition,
      injured,
    }
  })

  const groupAverage = (group: 'GK' | 'DF' | 'MF' | 'FW') => {
    const inGroup = evaluations.filter((item) => POSITION_GROUP[item.slotPosition] === group)
    if (inGroup.length === 0) return EMPTY_SLOT_RATING
    return inGroup.reduce((sum, item) => sum + item.rating, 0) / inGroup.length
  }

  const gk = groupAverage('GK')
  const df = groupAverage('DF')
  const mf = groupAverage('MF')
  const fw = groupAverage('FW')

  const onPitch = evaluations
    .filter((item) => item.player && !item.injured)
    .map((item) => item.player!)
  const traits = teamTraitEffects(onPitch)
  const colors = teamColors(onPitch)
  const chemistry = Math.min(
    100,
    chemistryOf(evaluations) + traits.chemistry + colors.bonus.chemistry,
  )
  // Chemistry swings the squad hard, the way the original game does.
  const boost = 0.86 + (chemistry / 100) * 0.28
  const colorBonus = colors.bonus.rating
  const hidden =
    onPitch.length > 0
      ? onPitch.reduce((sum, player) => sum + hiddenPower(player), 0) / onPitch.length
      : 0

  const att = Math.round((fw * 0.6 + mf * 0.3 + df * 0.1) * boost) + colorBonus
  const mid = Math.round((mf * 0.7 + fw * 0.15 + df * 0.15) * boost) + colorBonus
  const def = Math.round((df * 0.6 + gk * 0.3 + mf * 0.1) * boost) + colorBonus

  const levelTotal = evaluations.reduce((sum, item) => sum + (item.card?.level ?? 0), 0)
  const levelCap = lineupCapOf(division)

  return {
    overall: Math.round((att + mid + def) / 3),
    att,
    mid,
    def,
    chemistry,
    filled: evaluations.filter((item) => item.card && !item.injured).length,
    evaluations,
    traits,
    colors,
    hidden,
    levelTotal,
    levelCap,
    overCap: levelTotal > levelCap,
  }
}

function chemistryOf(evaluations: SlotEvaluation[]): number {
  if (evaluations.length === 0) return 0
  let points = 0
  for (const item of evaluations) {
    if (!item.player || item.injured) continue
    points += item.fit === 'main' ? 9 : item.fit === 'sub' ? 6 : 0
  }
  const base = (points / (evaluations.length * 9)) * 100
  return Math.max(0, Math.min(100, Math.round(base)))
}

function usableCards(cards: Card[]): Card[] {
  return cards.filter((card) => !isInjured(card) && getPlayer(card.playerId))
}

/**
 * Rebuilds the whole line-up, giving every slot the best card available for it
 * while staying inside the division's level budget.
 */
export function autoFill(cards: Card[], squad: Squad, division: number = BOTTOM_DIVISION): Squad {
  const formation = FORMATIONS[squad.formation] ?? FORMATIONS['4-3-3']
  const pool = usableCards(cards)
  const cap = lineupCapOf(division)

  // Out of position is a penalty, not a ban: a full eleven beats an empty slot.
  const pairs: { slotId: string; uid: string; level: number; score: number; out: boolean }[] = []
  for (const slot of formation.slots) {
    for (const card of pool) {
      const player = getPlayer(card.playerId)!
      pairs.push({
        slotId: slot.id,
        uid: card.uid,
        level: card.level,
        score: ratingInSlot(player, card.level, slot.position) * conditionFactor(card.condition),
        out: positionFit(player, slot.position) === 'out',
      })
    }
  }
  // Every proper fit is placed before anyone is asked to play out of position.
  pairs.sort((a, b) => Number(a.out) - Number(b.out) || b.score - a.score)

  const slots = emptySlots(formation.key)
  const takenSlots = new Set<string>()
  const takenCards = new Set<string>()
  let total = 0

  for (const pair of pairs) {
    if (takenSlots.has(pair.slotId) || takenCards.has(pair.uid)) continue
    if (total + pair.level > cap) continue
    slots[pair.slotId] = pair.uid
    takenSlots.add(pair.slotId)
    takenCards.add(pair.uid)
    total += pair.level
  }

  // Anything still empty gets the cheapest body that fits the budget, and if
  // nobody fits, the cheapest body full stop — an over budget eleven is at
  // least playable once the manager swaps someone down, an empty slot is not.
  for (const slot of formation.slots) {
    if (slots[slot.id]) continue
    const free = pairs
      .filter((pair) => pair.slotId === slot.id && !takenCards.has(pair.uid))
      .sort((a, b) => a.level - b.level || b.score - a.score)
    const candidate = free.find((pair) => total + pair.level <= cap) ?? free[0]
    if (candidate) {
      slots[slot.id] = candidate.uid
      takenCards.add(candidate.uid)
      total += candidate.level
    }
  }

  const bench = pool
    .filter((card) => !takenCards.has(card.uid))
    .sort((a, b) => b.level - a.level)
    .slice(0, BENCH_SIZE)
    .map((card) => card.uid)

  return {
    ...squad,
    slots,
    bench: [...bench, ...Array(Math.max(0, BENCH_SIZE - bench.length)).fill(null)],
  }
}
