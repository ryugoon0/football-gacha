import { PLAYERS_BY_RARITY } from './players'
import { RARITY_STYLES } from './rarity'
import type { Card, PlayerDef, Rarity } from './types'
import { getPlayer } from './players'

/** Shards handed over when a card is released. */
export const SHARD_VALUES: Record<Rarity, number> = {
  Normal: 1,
  Rare: 4,
  Legend: 15,
  Live: 30,
  World: 60,
}

export interface ShardOffer {
  rarity: Rarity
  cost: number
}

/** The exchange counter: shards in, a guaranteed rarity out. */
export const SHARD_OFFERS: ShardOffer[] = [
  { rarity: 'Rare', cost: 60 },
  { rarity: 'Legend', cost: 220 },
  { rarity: 'Live', cost: 450 },
  { rarity: 'World', cost: 800 },
]

export function shardsFor(card: Card): number {
  const player = getPlayer(card.playerId)
  if (!player) return 0
  // A trained card is worth a little more.
  return SHARD_VALUES[player.rarity] + Math.floor((card.level - 1) / 2)
}

/** Gold a released card pays out; trained cards are worth more. */
export function sellPrice(card: Card): number {
  const player = getPlayer(card.playerId)
  if (!player) return 0
  const style = RARITY_STYLES[player.rarity]
  return style.sell + (card.level - 1) * Math.round(style.sell * 0.3)
}

export function releaseValue(cards: Card[]): { gold: number; shards: number } {
  return cards.reduce(
    (total, card) => ({
      gold: total.gold + sellPrice(card),
      shards: total.shards + shardsFor(card),
    }),
    { gold: 0, shards: 0 },
  )
}

export function offerLabel(offer: ShardOffer): string {
  return `${RARITY_STYLES[offer.rarity].label} 확정`
}

export function exchangeResult(rarity: Rarity, rng: () => number = Math.random): PlayerDef {
  const pool = PLAYERS_BY_RARITY[rarity]
  return pool[Math.floor(rng() * pool.length)]
}
