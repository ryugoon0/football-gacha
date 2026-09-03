import { PLAYERS, PLAYERS_BY_RARITY, POSITION_GROUP, seededRandom } from './players'
import { RARITIES } from './rarity'
import type { PlayerDef, PositionGroup, Rarity } from './types'

export const DRAW_TEN_SIZE = 10

/** Pulls without a 월드 or better before the next one is guaranteed. */
export const PITY_LIMIT = 30
export const PITY_RARITY: Rarity = 'Legend'

export type PackFamily = 'basic' | 'premium'
export type PackId = 'basic' | 'basicTen' | 'premium' | 'premiumTen'

export type Rates = Record<Rarity, number>

/**
 * Odds are still being tuned — these are deliberately generous so the higher
 * grades show up often enough to test with. Final numbers live in ROADMAP.md.
 */
export const PACK_RATES: Record<PackFamily, Rates> = {
  basic: { Normal: 55, Rare: 30, Legend: 10, Live: 3.5, World: 1.5 },
  premium: { Normal: 12, Rare: 33, Legend: 33, Live: 15, World: 7 },
}

export interface PackDef {
  id: PackId
  family: PackFamily
  name: string
  description: string
  cost: number
  count: number
  rates: Rates
  /** A multi pull always contains at least one card of this grade or better. */
  guarantee?: Rarity
}

export const PACKS: PackDef[] = [
  {
    id: 'basic',
    family: 'basic',
    name: '일반팩',
    description: '카드 1장',
    cost: 300,
    count: 1,
    rates: PACK_RATES.basic,
  },
  {
    id: 'basicTen',
    family: 'basic',
    name: '일반팩 10연차',
    description: '10장 · 실버 이상 1장 보장',
    cost: 2700,
    count: DRAW_TEN_SIZE,
    rates: PACK_RATES.basic,
    guarantee: 'Rare',
  },
  {
    id: 'premium',
    family: 'premium',
    name: '프리미엄팩',
    description: '고급 카드 확률이 크게 높습니다',
    cost: 1200,
    count: 1,
    rates: PACK_RATES.premium,
  },
  {
    id: 'premiumTen',
    family: 'premium',
    name: '프리미엄팩 10연차',
    description: '10장 · 월드 이상 1장 보장',
    cost: 10800,
    count: DRAW_TEN_SIZE,
    rates: PACK_RATES.premium,
    guarantee: 'Legend',
  },
]

export const DRAW_COST = PACKS[0].cost
export const DRAW_TEN_COST = PACKS[1].cost

export function packOf(id: PackId): PackDef {
  return PACKS.find((pack) => pack.id === id) ?? PACKS[0]
}

export function packsOfFamily(family: PackFamily): PackDef[] {
  return PACKS.filter((pack) => pack.family === family)
}

type Rng = () => number

const rarityIndex = (rarity: Rarity) => RARITIES.indexOf(rarity)

export function rollRarity(
  rng: Rng = Math.random,
  minRarity?: Rarity | null,
  rates: Rates = PACK_RATES.basic,
): Rarity {
  const total = RARITIES.reduce((sum, rarity) => sum + (rates[rarity] ?? 0), 0)
  const roll = rng() * total
  let cumulative = 0
  let rolled: Rarity = 'Normal'
  for (const rarity of RARITIES) {
    cumulative += rates[rarity] ?? 0
    if (roll < cumulative) {
      rolled = rarity
      break
    }
  }
  if (minRarity && rarityIndex(rolled) < rarityIndex(minRarity)) return minRarity
  return rolled
}

function poolFor(rarity: Rarity, group?: PositionGroup | null): PlayerDef[] {
  const pool = PLAYERS_BY_RARITY[rarity]
  if (!group) return pool
  const filtered = pool.filter((player) => POSITION_GROUP[player.position] === group)
  return filtered.length > 0 ? filtered : pool
}

function pick(
  rarity: Rarity,
  rng: Rng,
  group?: PositionGroup | null,
  featured?: PlayerDef | null,
): PlayerDef {
  // The featured player takes half of the pulls at their own rarity.
  if (
    featured &&
    featured.rarity === rarity &&
    (!group || POSITION_GROUP[featured.position] === group)
  ) {
    if (rng() < 0.5) return featured
  }
  const pool = poolFor(rarity, group)
  return pool[Math.floor(rng() * pool.length)]
}

/** The weekly pick-up, rotating through the strongest cards in the game. */
/**
 * Which week's pick-up is running.
 *
 * The pick-up doubles a player's odds, so which week it is changes the odds —
 * which makes it the server's call, not the browser's. Local time would put
 * players in different weeks near the boundary and let a device clock choose a
 * favourable one, so the window is pinned to a fixed offset (KST, the market
 * this is built for) and both the shop and the Edge Function use this one
 * function.
 */
export const PICKUP_OFFSET_MINUTES = 9 * 60

export function pickupWeekKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + PICKUP_OFFSET_MINUTES * 60_000)
  const day = (shifted.getUTCDay() + 6) % 7
  shifted.setUTCDate(shifted.getUTCDate() - day)
  return shifted.toISOString().slice(0, 10)
}

export function featuredPlayer(weekKey: string): PlayerDef {
  const pool = PLAYERS.filter((player) => ['Legend', 'Live', 'World'].includes(player.rarity))
  const seed = weekKey.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  return pool[Math.floor(seededRandom(seed)() * pool.length)]
}

export interface DrawOptions {
  count: number
  /** Pulls since the last 월드 or better. */
  pity?: number
  featured?: PlayerDef | null
  group?: PositionGroup | null
  minRarity?: Rarity | null
  guarantee?: Rarity | null
  rates?: Rates
  rng?: Rng
}

export interface DrawOutcome {
  players: PlayerDef[]
  pity: number
  pityHit: boolean
}

/**
 * One trip to the shop. Applies the pity counter, the weekly pick-up, the
 * pack's own odds and its guarantee, and reports the counter back.
 */
export function drawSession({
  count,
  pity = 0,
  featured = null,
  group = null,
  minRarity = null,
  guarantee = null,
  rates = PACK_RATES.basic,
  rng = Math.random,
}: DrawOptions): DrawOutcome {
  const players: PlayerDef[] = []
  let counter = pity
  let pityHit = false

  for (let i = 0; i < count; i++) {
    let rarity: Rarity
    if (counter + 1 >= PITY_LIMIT) {
      rarity = rollRarity(rng, PITY_RARITY, rates)
      pityHit = true
    } else {
      rarity = rollRarity(rng, minRarity, rates)
    }

    if (rarityIndex(rarity) >= rarityIndex(PITY_RARITY)) counter = 0
    else counter += 1

    players.push(pick(rarity, rng, group, featured))
  }

  if (guarantee && !players.some((player) => rarityIndex(player.rarity) >= rarityIndex(guarantee))) {
    const index = Math.floor(rng() * players.length)
    players[index] = pick(guarantee, rng, group, featured)
  }

  return { players, pity: counter, pityHit }
}

export function drawOne(rng: Rng = Math.random): PlayerDef {
  return drawSession({ count: 1, rng }).players[0]
}

export function drawMany(count: number, rng: Rng = Math.random): PlayerDef[] {
  return drawSession({
    count,
    guarantee: count >= DRAW_TEN_SIZE ? 'Rare' : null,
    rng,
  }).players
}

export function drawCost(count: number): number {
  return count >= DRAW_TEN_SIZE ? DRAW_TEN_COST : DRAW_COST * count
}
