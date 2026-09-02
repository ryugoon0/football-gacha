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

/**
 * What the exchange counter charges, when the operator has moved it.
 *
 * The same mechanism the shop prices use: the table above is the default, the
 * database holds only what has been changed, and a browser that cannot reach
 * the server runs on the defaults. Kept out of the Edge Function on purpose —
 * the exchange is not a pull, so the published odds are not involved.
 */
export function offerKey(rarity: Rarity): string {
  return `exchange:${rarity}`
}

/**
 * Never free. Zero would not be a cheap exchange, it would be an unlimited
 * supply of any card in the game — the one setting on this screen that could
 * end the economy in an afternoon.
 */
export function exchangeBounds(base: number): { min: number; max: number } {
  return { min: 1, max: Math.max(100, base * 50) }
}

let costOverrides: Record<string, number> = {}

export function setExchangeCosts(next: Record<string, number>): void {
  const clean: Record<string, number> = {}
  for (const offer of SHARD_OFFERS) {
    const key = offerKey(offer.rarity)
    const value = next[key]
    if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
      clean[key] = Math.round(value)
    }
  }
  costOverrides = clean
}

export function resetExchangeCosts(): void {
  costOverrides = {}
}

export function costOf(rarity: Rarity): number {
  const base = SHARD_OFFERS.find((offer) => offer.rarity === rarity)
  if (!base) return 0
  return costOverrides[offerKey(rarity)] ?? base.cost
}

/** The counter as it stands right now, for the screen and for the charge. */
export function shardOffers(): ShardOffer[] {
  return SHARD_OFFERS.map((offer) => ({ rarity: offer.rarity, cost: costOf(offer.rarity) }))
}

export function exchangeResult(rarity: Rarity, rng: () => number = Math.random): PlayerDef {
  const pool = PLAYERS_BY_RARITY[rarity]
  return pool[Math.floor(rng() * pool.length)]
}
