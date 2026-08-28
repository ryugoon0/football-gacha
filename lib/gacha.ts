import { PLAYERS_BY_RARITY } from './players'
import { RARITIES, RARITY_WEIGHTS } from './rarity'
import type { PlayerDef, Rarity } from './types'

export const DRAW_COST = 300
export const DRAW_TEN_COST = 2700
export const DRAW_TEN_SIZE = 10

type Rng = () => number

export function rollRarity(rng: Rng = Math.random): Rarity {
  const roll = rng() * 100
  let cumulative = 0
  for (const rarity of RARITIES) {
    cumulative += RARITY_WEIGHTS[rarity]
    if (roll < cumulative) return rarity
  }
  return 'Normal'
}

function pickFromRarity(rarity: Rarity, rng: Rng): PlayerDef {
  const pool = PLAYERS_BY_RARITY[rarity]
  return pool[Math.floor(rng() * pool.length)]
}

export function drawOne(rng: Rng = Math.random): PlayerDef {
  return pickFromRarity(rollRarity(rng), rng)
}

/**
 * A multi draw of {@link DRAW_TEN_SIZE} or more guarantees at least one Rare
 * or better, the way the in-game ten pull does.
 */
export function drawMany(count: number, rng: Rng = Math.random): PlayerDef[] {
  const results: PlayerDef[] = []
  for (let i = 0; i < count; i++) results.push(drawOne(rng))

  if (count >= DRAW_TEN_SIZE && results.every((player) => player.rarity === 'Normal')) {
    const index = Math.floor(rng() * results.length)
    results[index] = pickFromRarity('Rare', rng)
  }
  return results
}

export function drawCost(count: number): number {
  return count >= DRAW_TEN_SIZE ? DRAW_TEN_COST : DRAW_COST * count
}
