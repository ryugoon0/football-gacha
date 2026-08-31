import { PLAYERS, PLAYERS_BY_RARITY, POSITION_GROUP, seededRandom } from './players'
import { RARITIES, RARITY_WEIGHTS } from './rarity'
import type { PlayerDef, PositionGroup, Rarity } from './types'

export const DRAW_COST = 300
export const DRAW_TEN_COST = 2700
export const DRAW_TEN_SIZE = 10

/** Pulls without a Legend or better before the next one is guaranteed. */
export const PITY_LIMIT = 30
export const PITY_RARITY: Rarity = 'Legend'

export type PackId = 'basic' | 'ten' | 'position' | 'rarePlus'

export interface PackDef {
  id: PackId
  name: string
  description: string
  cost: number
  count: number
  /** Restricts the pull to one part of the pitch. */
  group?: PositionGroup
  /** Nothing below this rarity can come out. */
  minRarity?: Rarity
  /** At least one card above Normal, the way the ten pull works. */
  guaranteeRare?: boolean
}

export const PACKS: PackDef[] = [
  {
    id: 'basic',
    name: '기본 팩',
    description: '카드 1장',
    cost: DRAW_COST,
    count: 1,
  },
  {
    id: 'position',
    name: '포지션 지정 팩',
    description: '고른 자리의 선수 1장',
    cost: 600,
    count: 1,
  },
  {
    id: 'rarePlus',
    name: '레어 확정 팩',
    description: '레어 이상 1장',
    cost: 1000,
    count: 1,
    minRarity: 'Rare',
  },
  {
    id: 'ten',
    name: '10연차',
    description: '10장 · 레어 이상 1장 보장',
    cost: DRAW_TEN_COST,
    count: DRAW_TEN_SIZE,
    guaranteeRare: true,
  },
]

export function packOf(id: PackId): PackDef {
  return PACKS.find((pack) => pack.id === id) ?? PACKS[0]
}

type Rng = () => number

const rarityIndex = (rarity: Rarity) => RARITIES.indexOf(rarity)

export function rollRarity(rng: Rng = Math.random, minRarity?: Rarity | null): Rarity {
  const roll = rng() * 100
  let cumulative = 0
  let rolled: Rarity = 'Normal'
  for (const rarity of RARITIES) {
    cumulative += RARITY_WEIGHTS[rarity]
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
  if (featured && featured.rarity === rarity && (!group || POSITION_GROUP[featured.position] === group)) {
    if (rng() < 0.5) return featured
  }
  const pool = poolFor(rarity, group)
  return pool[Math.floor(rng() * pool.length)]
}

/** The weekly pick-up, rotating through the strongest cards in the game. */
export function featuredPlayer(weekKey: string): PlayerDef {
  const pool = PLAYERS.filter((player) =>
    ['Legend', 'Live', 'World'].includes(player.rarity),
  )
  const seed = weekKey.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  return pool[Math.floor(seededRandom(seed)() * pool.length)]
}

export interface DrawOptions {
  count: number
  /** Pulls since the last Legend or better. */
  pity?: number
  featured?: PlayerDef | null
  group?: PositionGroup | null
  minRarity?: Rarity | null
  guaranteeRare?: boolean
  rng?: Rng
}

export interface DrawOutcome {
  players: PlayerDef[]
  /** Pity counter after the pull. */
  pity: number
  /** True when the counter forced a high rarity into this pull. */
  pityHit: boolean
}

/**
 * One trip to the shop. Applies the pity counter, the weekly pick-up and any
 * pack restrictions, and reports the counter back so it can be saved.
 */
export function drawSession({
  count,
  pity = 0,
  featured = null,
  group = null,
  minRarity = null,
  guaranteeRare = false,
  rng = Math.random,
}: DrawOptions): DrawOutcome {
  const players: PlayerDef[] = []
  let counter = pity
  let pityHit = false

  for (let i = 0; i < count; i++) {
    let rarity: Rarity
    if (counter + 1 >= PITY_LIMIT) {
      rarity = rollRarity(rng, PITY_RARITY)
      pityHit = true
    } else {
      rarity = rollRarity(rng, minRarity)
    }

    if (rarityIndex(rarity) >= rarityIndex(PITY_RARITY)) counter = 0
    else counter += 1

    players.push(pick(rarity, rng, group, featured))
  }

  if (guaranteeRare && players.every((player) => player.rarity === 'Normal')) {
    const index = Math.floor(rng() * players.length)
    players[index] = pick('Rare', rng, group, featured)
  }

  return { players, pity: counter, pityHit }
}

export function drawOne(rng: Rng = Math.random): PlayerDef {
  return drawSession({ count: 1, rng }).players[0]
}

export function drawMany(count: number, rng: Rng = Math.random): PlayerDef[] {
  return drawSession({ count, guaranteeRare: count >= DRAW_TEN_SIZE, rng }).players
}

export function drawCost(count: number): number {
  return count >= DRAW_TEN_SIZE ? DRAW_TEN_COST : DRAW_COST * count
}
