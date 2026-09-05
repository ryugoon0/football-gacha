import { getPlayer } from '../players'
import { evaluateSquad, type PositionFit } from '../squad'
import { colorName } from '../teamColor'
import type { TacticSetup } from '../tactics'
import type { Card, FormationKey, Squad } from '../types'

/**
 * What one club in a weekly group looks like from the stands: its formation,
 * the eleven with each player's level and rating in that slot, the bench,
 * the four tactic dials and the team colours in force. Built the same way
 * for a real manager's save and for an AI club's seeded eleven, so the
 * 순위표 shows every club alike. The detailed 21-dial plan stays private.
 */
export interface ClubSheetPlayer {
  slotId: string
  position: string
  playerId: string
  name: string
  level: number
  rating: number
  fit: PositionFit
}

export interface ClubSheet {
  formation: FormationKey
  overall: number
  att: number
  mid: number
  def: number
  starters: ClubSheetPlayer[]
  bench: { playerId: string; name: string; level: number }[]
  /** The four dials, when the club has a manager who set them; AI clubs play the default. */
  tactic: TacticSetup | null
  /** Team colours counting right now, by display name. */
  colors: string[]
}

export function clubSheetOf(cards: Card[], squad: Squad, division: number, tactic?: TacticSetup | null): ClubSheet {
  const rating = evaluateSquad(cards, squad, division)
  const byUid = new Map(cards.map((card) => [card.uid, card]))
  const starters = rating.evaluations.flatMap((item) => {
    if (!item.card || !item.player) return []
    return [
      {
        slotId: item.slotId,
        position: item.slotPosition as string,
        playerId: item.card.playerId,
        name: item.player.name,
        level: item.card.level,
        rating: Math.round(item.rating),
        fit: item.fit,
      },
    ]
  })
  const bench = squad.bench.flatMap((uid) => {
    const card = uid ? byUid.get(uid) : undefined
    if (!card) return []
    return [{ playerId: card.playerId, name: getPlayer(card.playerId)?.name ?? '선수', level: card.level }]
  })
  return {
    formation: squad.formation,
    overall: rating.overall,
    att: rating.att,
    mid: rating.mid,
    def: rating.def,
    starters,
    bench,
    tactic: tactic ?? null,
    colors: rating.colors.active.filter((color) => color.counted).map((color) => colorName(color)),
  }
}
