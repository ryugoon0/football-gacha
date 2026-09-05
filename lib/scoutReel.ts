import { RARITIES } from './rarity'
import type { PlayerDef, Rarity } from './types'

/**
 * The premium 스카우트 reel: seven cards slide past horizontally and stop on
 * the one the server already decided. Nothing here changes what a player
 * gets — the result comes in fixed, and this only chooses the six cards that
 * ride alongside it and where in the strip it stops.
 *
 * Two moods. A plain reel carries only 일반·실버·골드 company and stops
 * quietly. A *special* reel — always when the result is 라이브 or better, and
 * one time in four when it is not — turns the board gold and puts 라이브+
 * cards into the strip, so the stop might be the big one or might be the
 * 실버 next to it. That near-miss is the point.
 */
export const REEL_SIZE = 7
/** How often a 실버·골드 result still gets the special reel, for the tease. */
export const TEASE_CHANCE = 0.25

const HIGH: Rarity[] = ['Live', 'World']
const LOW_WEIGHTS: Partial<Record<Rarity, number>> = { Normal: 40, Rare: 35, Legend: 25 }

/**
 * How the strip comes to rest. `plain` eases straight in; `long` runs two or
 * three extra laps first; `overshoot` slides past the result and rocks back;
 * `crawl` stops one card short, hangs there, then ticks over. The result is
 * the same in every case — only the wait differs.
 */
export type ReelStop = 'plain' | 'long' | 'overshoot' | 'crawl'

export interface ReelPlan {
  cards: PlayerDef[]
  /** Index in `cards` the reel stops on — the result. */
  stopIndex: number
  special: boolean
  stop: ReelStop
}

/** Weights per mood: a special reel leans on the two teasing stops. */
const STOP_WEIGHTS: Record<'plain' | 'special', Record<ReelStop, number>> = {
  plain: { plain: 50, long: 20, overshoot: 18, crawl: 12 },
  special: { plain: 15, long: 20, overshoot: 30, crawl: 35 },
}

export function pickStop(special: boolean, rng: () => number = Math.random): ReelStop {
  const weights = STOP_WEIGHTS[special ? 'special' : 'plain']
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  let roll = rng() * total
  for (const [stop, weight] of Object.entries(weights) as [ReelStop, number][]) {
    roll -= weight
    if (roll <= 0) return stop
  }
  return 'plain'
}

export type ReelPool = Partial<Record<Rarity, PlayerDef[]>>

export const isHighRarity = (rarity: Rarity): boolean => HIGH.includes(rarity)

function pickFrom(list: PlayerDef[] | undefined, rng: () => number, exclude: Set<string>): PlayerDef | null {
  if (!list || list.length === 0) return null
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = list[Math.floor(rng() * list.length)]
    if (candidate && !exclude.has(candidate.id)) return candidate
  }
  return list.find((player) => !exclude.has(player.id)) ?? null
}

function pickWeighted(pool: ReelPool, weights: Partial<Record<Rarity, number>>, rng: () => number, exclude: Set<string>): PlayerDef | null {
  const options = RARITIES.filter((rarity) => (weights[rarity] ?? 0) > 0 && (pool[rarity]?.length ?? 0) > 0)
  if (options.length === 0) return null
  const total = options.reduce((sum, rarity) => sum + (weights[rarity] ?? 0), 0)
  let roll = rng() * total
  for (const rarity of options) {
    roll -= weights[rarity] ?? 0
    if (roll <= 0) {
      const picked = pickFrom(pool[rarity], rng, exclude)
      if (picked) return picked
    }
  }
  for (const rarity of options) {
    const picked = pickFrom(pool[rarity], rng, exclude)
    if (picked) return picked
  }
  return null
}

function pickHigh(pool: ReelPool, rng: () => number, exclude: Set<string>): PlayerDef | null {
  return pickWeighted(pool, { Live: 70, World: 30 }, rng, exclude)
}

export function planReel(result: PlayerDef, pool: ReelPool, rng: () => number = Math.random, teaseChance = TEASE_CHANCE): ReelPlan {
  const special = isHighRarity(result.rarity) || rng() < teaseChance
  const exclude = new Set<string>([result.id])
  const decoys: PlayerDef[] = []

  // A special reel always shows at least one 라이브+ card that is *not* the
  // result — when the result is high too, there are two to pick between; when
  // it is not, the high card is the one that gets away.
  const highCount = special ? 1 + (rng() < 0.4 ? 1 : 0) : 0
  for (let i = 0; i < highCount; i += 1) {
    const picked = pickHigh(pool, rng, exclude)
    if (!picked) break
    decoys.push(picked)
    exclude.add(picked.id)
  }
  while (decoys.length < REEL_SIZE - 1) {
    const picked = pickWeighted(pool, LOW_WEIGHTS, rng, exclude) ?? pickWeighted(pool, { Live: 1, World: 1 }, rng, exclude)
    if (!picked) break
    decoys.push(picked)
    exclude.add(picked.id)
  }

  // Shuffle the company, then seat the result somewhere past the first card
  // so there is always a run-up before the stop.
  for (let i = decoys.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[decoys[i], decoys[j]] = [decoys[j], decoys[i]]
  }
  const stopIndex = decoys.length === 0 ? 0 : 1 + Math.floor(rng() * decoys.length)
  const cards = [...decoys]
  cards.splice(stopIndex, 0, result)
  return { cards, stopIndex, special, stop: pickStop(special, rng) }
}
