import { BOTTOM_DIVISION } from './league'
import { KNOBS } from './tuning'
import { PLAYERS_BY_RARITY, effectiveOvr, seededRandom } from './players'
import { RARITY_STYLES } from './rarity'
import type { PlayerDef, Rarity } from './types'

export const MARKET_SIZE = 5
export const REFRESH_COST = KNOBS.refreshCost.default

export interface Listing {
  id: string
  playerId: string
  price: number
}

export interface MarketState {
  /** Day the free listing roll belongs to. */
  date: string
  listings: Listing[]
}

export function transferPrice(player: PlayerDef, level = 1): number {
  const ovr = effectiveOvr(player, level)
  return Math.round(RARITY_STYLES[player.rarity].sell * 2.2 + (ovr * ovr) / 8)
}

/**
 * Only 일반 and 실버 players are ever transfer listed — 골드 이상은 카드팩과
 * 합성으로만 손에 넣습니다. Higher divisions see more 실버 listings.
 */
export const MARKET_RARITIES: Rarity[] = ['Normal', 'Rare']

function rarityOdds(division: number): [Rarity, number][] {
  const tier = BOTTOM_DIVISION - division // 0 at the bottom, 4 at the top
  return [
    ['Normal', Math.max(25, 70 - tier * 10)],
    ['Rare', 30 + tier * 10],
  ]
}

function pickRarity(division: number, rng: () => number): Rarity {
  const odds = rarityOdds(division)
  const total = odds.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [rarity, weight] of odds) {
    roll -= weight
    if (roll <= 0) return rarity
  }
  return 'Normal'
}

export function rollListings(division: number, rng: () => number = Math.random): Listing[] {
  const listings: Listing[] = []
  const used = new Set<string>()
  let guard = 0

  while (listings.length < MARKET_SIZE && guard++ < 100) {
    const pool = PLAYERS_BY_RARITY[pickRarity(division, rng)]
    const player = pool[Math.floor(rng() * pool.length)]
    if (used.has(player.id)) continue
    used.add(player.id)
    listings.push({
      id: `${player.id}-${listings.length}`,
      playerId: player.id,
      price: transferPrice(player),
    })
  }
  return listings
}

function seedOf(date: string, division: number): number {
  let hash = 7
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) >>> 0
  return (hash + division * 977) >>> 0
}

/** The daily shop: same list all day, new list tomorrow. */
export function dailyMarket(date: string, division: number): MarketState {
  return { date, listings: rollListings(division, seededRandom(seedOf(date, division))) }
}

export function emptyMarket(): MarketState {
  return { date: '', listings: [] }
}
