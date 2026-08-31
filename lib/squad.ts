import { conditionFactor, isInjured } from './condition'
import { FORMATIONS, emptySlots } from './formations'
import { teamTraitEffects, type TraitEffects } from './traits'
import { POSITION_GROUP, effectiveOvr, getPlayer } from './players'
import type { Card, PlayerDef, Position, Squad } from './types'

/** Rating used for a slot nobody is assigned to — an academy stand-in. */
export const EMPTY_SLOT_RATING = 38

export interface SlotEvaluation {
  slotId: string
  slotPosition: Position
  card: Card | null
  player: PlayerDef | null
  /** Overall after training, before the position penalty. */
  baseOvr: number
  /** What the player is actually worth in this slot, after fitness. */
  rating: number
  fit: 'perfect' | 'ok' | 'poor' | 'empty'
  condition: number
  injured: boolean
}

export interface SquadRating {
  overall: number
  att: number
  mid: number
  def: number
  chemistry: number
  filled: number
  evaluations: SlotEvaluation[]
  /** What the starting eleven's traits add in a match. */
  traits: TraitEffects
}

export function positionPenalty(playerPosition: Position, slotPosition: Position): number {
  if (playerPosition === slotPosition) return 0
  const playerGroup = POSITION_GROUP[playerPosition]
  const slotGroup = POSITION_GROUP[slotPosition]
  if (playerGroup === 'GK' || slotGroup === 'GK') return 22
  if (playerGroup === slotGroup) return 4
  const distance = Math.abs(
    ['GK', 'DF', 'MF', 'FW'].indexOf(playerGroup) - ['GK', 'DF', 'MF', 'FW'].indexOf(slotGroup),
  )
  return distance === 1 ? 9 : 16
}

function fitOf(playerPosition: Position, slotPosition: Position): SlotEvaluation['fit'] {
  const penalty = positionPenalty(playerPosition, slotPosition)
  if (penalty === 0) return 'perfect'
  return penalty <= 9 ? 'ok' : 'poor'
}

export function evaluateSquad(cards: Card[], squad: Squad): SquadRating {
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
    const baseOvr = effectiveOvr(player, card.level)
    const injured = isInjured(card)
    // An injured player cannot take the pitch: a youth stand-in plays instead.
    const rating = injured
      ? EMPTY_SLOT_RATING
      : Math.max(
          20,
          Math.round(
            (baseOvr - positionPenalty(player.position, slot.position)) *
              conditionFactor(card.condition),
          ),
        )
    return {
      slotId: slot.id,
      slotPosition: slot.position,
      card,
      player,
      baseOvr,
      rating,
      fit: fitOf(player.position, slot.position),
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
  const chemistry = Math.min(100, chemistryOf(evaluations) + traits.chemistry)
  const boost = 0.92 + (chemistry / 100) * 0.14

  const att = Math.round((fw * 0.6 + mf * 0.3 + df * 0.1) * boost)
  const mid = Math.round((mf * 0.7 + fw * 0.15 + df * 0.15) * boost)
  const def = Math.round((df * 0.6 + gk * 0.3 + mf * 0.1) * boost)

  return {
    overall: Math.round((att + mid + def) / 3),
    att,
    mid,
    def,
    chemistry,
    filled: evaluations.filter((item) => item.card && !item.injured).length,
    evaluations,
    traits,
  }
}

function chemistryOf(evaluations: SlotEvaluation[]): number {
  if (evaluations.length === 0) return 0
  let points = 0
  const nations: Record<string, number> = {}
  for (const item of evaluations) {
    if (!item.player || item.injured) continue
    points += item.fit === 'perfect' ? 9 : item.fit === 'ok' ? 5 : 1
    nations[item.player.nation] = (nations[item.player.nation] ?? 0) + 1
  }
  const strongestNation = Math.max(0, ...Object.values(nations))
  const nationBonus = strongestNation >= 8 ? 15 : strongestNation >= 5 ? 8 : 0
  const base = (points / (evaluations.length * 9)) * 100
  return Math.max(0, Math.min(100, Math.round(base + nationBonus)))
}

/** Rebuilds the whole line-up, giving every slot the best card available for it. */
export function autoFill(cards: Card[], squad: Squad): Squad {
  const formation = FORMATIONS[squad.formation] ?? FORMATIONS['4-3-3']

  const pairs: { slotId: string; uid: string; score: number }[] = []
  for (const slot of formation.slots) {
    for (const card of cards) {
      const player = getPlayer(card.playerId)
      // Injured players are left out of the line-up entirely.
      if (!player || isInjured(card)) continue
      pairs.push({
        slotId: slot.id,
        uid: card.uid,
        score:
          (effectiveOvr(player, card.level) - positionPenalty(player.position, slot.position)) *
          conditionFactor(card.condition),
      })
    }
  }
  // Best pairing first, so the strongest cards claim the slots that suit them.
  pairs.sort((a, b) => b.score - a.score)

  const slots = emptySlots(formation.key)
  const takenSlots = new Set<string>()
  const takenCards = new Set<string>()
  for (const pair of pairs) {
    if (takenSlots.has(pair.slotId) || takenCards.has(pair.uid)) continue
    slots[pair.slotId] = pair.uid
    takenSlots.add(pair.slotId)
    takenCards.add(pair.uid)
  }

  return { ...squad, slots }
}
