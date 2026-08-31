import { getPlayer, levelCap, startLevel, POSITION_GROUP } from './players'
import { MAX_LEVEL, RARITY_STYLES } from './rarity'
import type { Card, PlayerDef, Rarity } from './types'

export { MAX_LEVEL }

/** Experience needed to go from `level` to the next one. */
export function expForLevel(level: number): number {
  return 120 + (level - 1) * 90
}

/** A fresh card starts at its rarity's level with one level of headroom. */
export function initialLimit(player: PlayerDef): number {
  return Math.min(levelCap(player), startLevel(player) + 1)
}

export function newCardLevel(player: PlayerDef): { level: number; limit: number } {
  return { level: startLevel(player), limit: initialLimit(player) }
}

/** Experience a card hands over when it is used as training material. */
export function materialExp(card: Card): number {
  const player = getPlayer(card.playerId)
  if (!player) return 0
  const base: Record<Rarity, number> = {
    Normal: 40,
    Rare: 90,
    Legend: 260,
    Live: 400,
    World: 600,
  }
  return Math.round(base[player.rarity] * (1 + (card.level - 1) * 0.15))
}

/** Gold charged for one training session, whatever the material. */
export function trainingFee(card: Card): number {
  const player = getPlayer(card.playerId)
  if (!player) return 0
  return Math.round(RARITY_STYLES[player.rarity].trainCost * 0.35)
}

export function canLevelUp(card: Card): boolean {
  return card.level < card.limit
}

export function atLimit(card: Card): boolean {
  const player = getPlayer(card.playerId)
  return Boolean(player) && card.level >= card.limit && card.limit < levelCap(player!)
}

export function isMaxed(card: Card): boolean {
  const player = getPlayer(card.playerId)
  return Boolean(player) && card.level >= levelCap(player!)
}

export interface TrainResult {
  card: Card
  /** Levels gained in this session. */
  gained: number
  /** Experience that could not be used because the limit was reached. */
  wasted: number
}

/**
 * Feeds experience into a card. Levels stop at the card's current limit, which
 * only a copy of the same player can raise.
 */
export function addExperience(card: Card, exp: number): TrainResult {
  const player = getPlayer(card.playerId)
  if (!player) return { card, gained: 0, wasted: exp }

  let level = card.level
  let pool = card.exp + exp
  let gained = 0

  while (level < card.limit && pool >= expForLevel(level)) {
    pool -= expForLevel(level)
    level += 1
    gained += 1
  }

  // Experience is capped once the limit is hit; nothing spills over.
  let wasted = 0
  if (level >= card.limit) {
    const carry = Math.min(pool, expForLevel(level) - 1)
    wasted = pool - carry
    pool = carry
  }

  return { card: { ...card, level, exp: pool }, gained, wasted }
}

/** A copy of the same player raises the ceiling by one. */
export function limitBreak(card: Card): { card: Card; raised: boolean } {
  const player = getPlayer(card.playerId)
  if (!player) return { card, raised: false }
  if (card.limit >= levelCap(player)) return { card, raised: false }
  return { card: { ...card, limit: card.limit + 1 }, raised: true }
}

export interface PlayerRating {
  uid: string
  name: string
  rating: number
  goals: number
  exp: number
  levelUp?: boolean
}

export interface RatingInput {
  uid: string
  player: PlayerDef
  position: string
}

/** Marks every starter out of ten. */
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

    // Consistent players swing less from game to game.
    const swing = 0.6 * (1 - starter.player.hidden.consistency / 24)
    const rating = Math.max(
      4,
      Math.min(
        10,
        6.4 + resultBonus + goals * 0.9 + (cleanSheet ? 0.5 : 0) + (rng() * swing - swing / 2),
      ),
    )
    return {
      uid: starter.uid,
      name: starter.player.name,
      rating: Math.round(rating * 10) / 10,
      goals,
      exp: Math.max(6, Math.round((rating - 5.5) * 18)),
    }
  })
}

export interface GrowthResult {
  cards: Card[]
  levelUps: { uid: string; name: string; level: number }[]
}

/** Match experience, applied the same way as training material. */
export function applyExperience(cards: Card[], ratings: PlayerRating[]): GrowthResult {
  const gained = new Map(ratings.map((rating) => [rating.uid, rating.exp]))
  const levelUps: GrowthResult['levelUps'] = []

  const next = cards.map((card) => {
    const exp = gained.get(card.uid)
    if (!exp) return card
    const player = getPlayer(card.playerId)
    if (!player) return card

    const result = addExperience(card, exp)
    if (result.gained > 0) {
      levelUps.push({ uid: card.uid, name: player.name, level: result.card.level })
    }
    return result.card
  })

  return { cards: next, levelUps }
}
