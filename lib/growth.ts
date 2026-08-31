import { POSITION_GROUP, getPlayer, seededRandom } from './players'
import type { Card, PlayerDef, Rarity } from './types'

export const HARD_MAX_LEVEL = 10

/** How far a card can be trained. Not every player can reach the ceiling. */
const POTENTIAL_RANGE: Record<Rarity, [min: number, max: number]> = {
  Normal: [5, 8],
  Rare: [6, 9],
  Legend: [8, 10],
  Live: [9, 10],
  World: [10, 10],
}

export function maxLevelOf(player: PlayerDef): number {
  const [min, max] = POTENTIAL_RANGE[player.rarity]
  const rng = seededRandom(
    player.id.split('').reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) >>> 0, 91),
  )
  return Math.min(HARD_MAX_LEVEL, min + Math.floor(rng() * (max - min + 1)))
}

/** Experience needed to go from `level` to the next one. */
export function expForLevel(level: number): number {
  return 60 + level * 40
}

export function canTrain(card: Card): boolean {
  const player = getPlayer(card.playerId)
  return Boolean(player) && card.level < maxLevelOf(player!)
}

export interface PlayerRating {
  uid: string
  name: string
  rating: number
  goals: number
  exp: number
  /** Set when this match pushed the card up a level. */
  levelUp?: boolean
}

export interface RatingInput {
  uid: string
  player: PlayerDef
  /** Slot the player filled, used to reward keepers for a clean sheet. */
  position: string
}

/**
 * Marks every starter out of ten. Goals and the result carry most of the
 * weight, with a little noise so two identical squads do not score the same.
 */
export function matchRatings(
  starters: RatingInput[],
  outcome: { result: 'W' | 'D' | 'L'; scoreAgainst: number },
  scorerUids: string[],
  rng: () => number = Math.random,
): PlayerRating[] {
  const resultBonus = outcome.result === 'W' ? 0.6 : outcome.result === 'D' ? 0.2 : -0.25

  return starters.map((starter) => {
    const goals = scorerUids.filter((uid) => uid === starter.uid).length
    const cleanSheet =
      outcome.scoreAgainst === 0 &&
      (POSITION_GROUP[starter.player.position] === 'GK' || starter.position === 'GK')

    const rating = Math.max(
      4,
      Math.min(
        10,
        6.4 + resultBonus + goals * 0.9 + (cleanSheet ? 0.5 : 0) + (rng() * 0.6 - 0.3),
      ),
    )
    return {
      uid: starter.uid,
      name: starter.player.name,
      rating: Math.round(rating * 10) / 10,
      goals,
      exp: Math.max(4, Math.round((rating - 5.5) * 14)),
    }
  })
}

export interface GrowthResult {
  cards: Card[]
  /** Cards that gained at least one level. */
  levelUps: { uid: string; name: string; level: number }[]
}

export function applyExperience(cards: Card[], ratings: PlayerRating[]): GrowthResult {
  const gained = new Map(ratings.map((rating) => [rating.uid, rating.exp]))
  const levelUps: GrowthResult['levelUps'] = []

  const next = cards.map((card) => {
    const exp = gained.get(card.uid)
    if (!exp) return card
    const player = getPlayer(card.playerId)
    if (!player) return card

    const ceiling = maxLevelOf(player)
    let level = card.level
    let pool = (card.exp ?? 0) + exp
    let levelled = false

    while (level < ceiling && pool >= expForLevel(level)) {
      pool -= expForLevel(level)
      level += 1
      levelled = true
    }
    if (level >= ceiling) pool = 0

    if (levelled) levelUps.push({ uid: card.uid, name: player.name, level })
    return { ...card, level, exp: pool }
  })

  return { cards: next, levelUps }
}
