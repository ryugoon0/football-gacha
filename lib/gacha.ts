import { PLAYERS, PLAYERS_BY_RARITY, POSITION_GROUP, seededRandom } from './players'
import { RARITIES } from './rarity'
import { limitedOpen, limitedWindowOpen } from './limited'
import { tune } from './tuning'
import type { PlayerDef, PositionGroup, Rarity } from './types'

// The Edge Function bundle (draw-pack) is built from this file; it needs the
// tuning entry points to read game_config before it rolls, and the roster to
// check a 월드 fusion.
export { setTuning, KNOB_KEYS } from './tuning'
export { getPlayer } from './players'

export const DRAW_TEN_SIZE = 10

/** Pulls without a 골드 or better before the next one is guaranteed. */
export const PITY_LIMIT = 30
export const PITY_RARITY: Rarity = 'Legend'

/**
 * Three families (2026-09-07):
 *  - basic / premium — gold (premium also 프리미엄 티켓). 월드 never comes out
 *    of these; while a 리미티드 window is open the premium pack is sold as
 *    리미티드 스카우트 and gains a 리미티드 bucket.
 *  - world — 월드 스카우트: not sold. A pack is a server balance
 *    (world_packs) that a gift or fusing three 월드 cards credits; it rolls
 *    플래티넘 or 월드 only.
 */
export type PackFamily = 'basic' | 'premium' | 'world'
export type PackId = 'basic' | 'basicTen' | 'premium' | 'premiumTen' | 'world'

/** What a single roll lands on: a grade, or the 리미티드 bucket (Live-grade cards of the open window). */
export type RollKey = Rarity | 'Limited'
export const ROLL_KEYS: RollKey[] = [...RARITIES, 'Limited']
export type Rates = Record<Rarity, number> & { Limited?: number }

const round3 = (value: number) => Math.round(value * 1000) / 1000

/**
 * Odds, in percent per pull. 실버·골드·플래티넘 are operator knobs (lib/tuning.ts,
 * 스카우트 group); 일반 is whatever is left, so the table always sums to 100.
 * With a 리미티드 window open the premium table takes premiumRateLimited out of
 * 일반·실버·골드 in proportion — 플래티넘 keeps its odds. The server
 * (draw-pack) reads the same game_config and clock before it rolls, so the
 * odds shown and the odds rolled are one number.
 */
export function packRates(family: PackFamily, nowMs: number = Date.now()): Rates {
  if (family === 'world') {
    const world = Math.max(0, Math.min(100, tune('worldRateWorld')))
    return { Normal: 0, Rare: 0, Legend: 0, Live: round3(100 - world), World: round3(world) }
  }
  const rare = tune(family === 'basic' ? 'basicRateRare' : 'premiumRateRare')
  const gold = tune(family === 'basic' ? 'basicRateGold' : 'premiumRateGold')
  const live = tune(family === 'basic' ? 'basicRateLive' : 'premiumRateLive')
  const upper = rare + gold + live
  // Should the knobs ever be pushed past 100 together, scale them back rather than roll on a broken table.
  const scale = upper > 100 ? 100 / upper : 1
  const rates: Rates = { Normal: 0, Rare: round3(rare * scale), Legend: round3(gold * scale), Live: round3(live * scale), World: 0 }
  const limited = family === 'premium' && limitedWindowOpen(nowMs) ? Math.max(0, Math.min(100 - rates.Live, tune('premiumRateLimited'))) : 0
  if (limited > 0) {
    const room = 100 - rates.Live
    const factor = room > 0 ? (room - limited) / room : 0
    rates.Rare = round3(rates.Rare * factor)
    rates.Legend = round3(rates.Legend * factor)
    rates.Limited = round3(limited)
  }
  rates.Normal = Math.max(0, round3(100 - rates.Rare - rates.Legend - rates.Live - rates.World - (rates.Limited ?? 0)))
  return rates
}

/** Live view of every table — a getter per family, so callers keep reading `PACK_RATES[family]`. */
export const PACK_RATES: Record<PackFamily, Rates> = {
  get basic() {
    return packRates('basic')
  },
  get premium() {
    return packRates('premium')
  },
  get world() {
    return packRates('world')
  },
}

export interface PackDef {
  id: PackId
  family: PackFamily
  name: string
  description: string
  /** Gold. 0 for the 월드 pack, which is never bought. */
  cost: number
  count: number
  /** The odds in force now (a getter — follows the operator's knobs and the 리미티드 clock). */
  readonly rates: Rates
  /** A multi pull always contains at least one card of this grade or better. */
  guarantee?: Rarity
}

/**
 * The player-facing name for a pull is 스카우트 (2026-09-05; 뽑기 before). The
 * ids stay — the server (draw-pack) and pull_log know packs by id.
 */
const withRates = (pack: Omit<PackDef, 'rates'>): PackDef =>
  Object.defineProperty({ ...pack } as PackDef, 'rates', { enumerable: true, get: () => packRates(pack.family) })

export const PACKS: PackDef[] = [
  withRates({
    id: 'basic',
    family: 'basic',
    name: '일반 스카우트',
    description: '선수 1명 · 바로 공개',
    cost: 300,
    count: 1,
  }),
  withRates({
    id: 'basicTen',
    family: 'basic',
    name: '일반 스카우트 10연속',
    description: '10명 · 실버 이상 1명 보장',
    cost: 2700,
    count: DRAW_TEN_SIZE,
    guarantee: 'Rare',
  }),
  withRates({
    id: 'premium',
    family: 'premium',
    name: '프리미엄 스카우트',
    description: '룰렛 연출 · 고급 카드 확률이 크게 높습니다',
    cost: 1200,
    count: 1,
  }),
  withRates({
    id: 'premiumTen',
    family: 'premium',
    name: '프리미엄 스카우트 10연속',
    description: '한 명씩 10번 · 골드 이상 1명 보장',
    cost: 10800,
    count: DRAW_TEN_SIZE,
    guarantee: 'Legend',
  }),
  withRates({
    id: 'world',
    family: 'world',
    name: '월드 스카우트',
    description: '플래티넘 아니면 월드 · 선물이나 월드 카드 3장 합성으로만',
    cost: 0,
    count: 1,
  }),
]

export const DRAW_COST = PACKS[0].cost
export const DRAW_TEN_COST = PACKS[1].cost

export function packOf(id: PackId): PackDef {
  return PACKS.find((pack) => pack.id === id) ?? PACKS[0]
}

export function packsOfFamily(family: PackFamily): PackDef[] {
  return PACKS.filter((pack) => pack.family === family)
}

/** The premium family is sold as 리미티드 스카우트 while a window is open. */
export function familyLabel(family: PackFamily, nowMs: number = Date.now()): string {
  if (family === 'basic') return '일반 스카우트'
  if (family === 'world') return '월드 스카우트'
  return limitedWindowOpen(nowMs) ? '리미티드 스카우트' : '프리미엄 스카우트'
}

export function packDisplayName(pack: PackDef, nowMs: number = Date.now()): string {
  if (pack.family === 'premium' && limitedWindowOpen(nowMs)) return pack.name.replace('프리미엄', '리미티드')
  return pack.name
}

type Rng = () => number

const rarityIndex = (rarity: Rarity) => RARITIES.indexOf(rarity)
/** Where a roll key stands on the ladder — the 리미티드 bucket hands out Live-grade cards. */
const rankOf = (key: RollKey) => (key === 'Limited' ? rarityIndex('Live') : rarityIndex(key))

export function rollRarity(
  rng: Rng = Math.random,
  minRarity?: Rarity | null,
  rates: Rates = PACK_RATES.basic,
): RollKey {
  const total = ROLL_KEYS.reduce((sum, key) => sum + (rates[key] ?? 0), 0)
  const roll = rng() * total
  let cumulative = 0
  let rolled: RollKey = 'Normal'
  for (const key of ROLL_KEYS) {
    cumulative += rates[key] ?? 0
    if (roll < cumulative) {
      rolled = key
      break
    }
  }
  if (minRarity && rankOf(rolled) < rarityIndex(minRarity)) return minRarity
  return rolled
}

/**
 * The cards a grade can hand out right now. 리미티드 cards never sit in a
 * grade pool — they come only out of the 리미티드 bucket (limitedPool). A grade
 * with nothing released yet falls back to the grade below, so a roll never
 * comes up empty.
 */
export function releasedPoolFor(rarity: Rarity, nowMs: number = Date.now()): PlayerDef[] {
  void nowMs
  let index = rarityIndex(rarity)
  while (index >= 0) {
    const pool = PLAYERS_BY_RARITY[RARITIES[index]].filter((player) => !player.limited)
    if (pool.length > 0) return pool
    index -= 1
  }
  return PLAYERS
}

/** The 리미티드 cards whose window is open now. */
export function limitedPool(nowMs: number = Date.now()): PlayerDef[] {
  return PLAYERS.filter((player) => Boolean(player.limited) && !player.unreleased && limitedOpen(player, nowMs))
}

function poolFor(key: RollKey, group: PositionGroup | null | undefined, nowMs: number): PlayerDef[] {
  const pool = key === 'Limited' ? limitedPool(nowMs) : releasedPoolFor(key, nowMs)
  const base = pool.length > 0 ? pool : releasedPoolFor('Live', nowMs)
  if (!group) return base
  const filtered = base.filter((player) => POSITION_GROUP[player.position] === group)
  return filtered.length > 0 ? filtered : base
}

function pick(
  key: RollKey,
  rng: Rng,
  group: PositionGroup | null | undefined,
  featured: PlayerDef | null | undefined,
  nowMs: number,
): PlayerDef {
  // The featured player takes half of the pulls at their own grade — a
  // 리미티드 pick-up only inside the 리미티드 bucket.
  if (featured && (!group || POSITION_GROUP[featured.position] === group)) {
    const matches = featured.limited ? key === 'Limited' && limitedOpen(featured, nowMs) : key === featured.rarity
    if (matches && rng() < 0.5) return featured
  }
  const pool = poolFor(key, group, nowMs)
  return pool[Math.floor(rng() * pool.length)]
}

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

export function featuredPlayer(weekKey: string, nowMs: number = Date.now()): PlayerDef {
  // While a 리미티드 batch is open, the week's pick-up is one of its cards —
  // the half-odds boost is what makes the window worth waiting for. Otherwise
  // a 골드 or 플래티넘 card (월드 only comes out of the 월드 pack).
  const limited = limitedPool(nowMs)
  const pool = limited.length > 0 ? limited : PLAYERS.filter((player) => ['Legend', 'Live'].includes(player.rarity) && !player.limited && !player.unreleased && !player.retired)
  const seed = weekKey.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  return pool[Math.floor(seededRandom(seed)() * pool.length)]
}

export interface DrawOptions {
  count: number
  /** Pulls since the last 골드 or better. */
  pity?: number
  featured?: PlayerDef | null
  group?: PositionGroup | null
  minRarity?: Rarity | null
  guarantee?: Rarity | null
  rates?: Rates
  rng?: Rng
  /** The clock 리미티드 windows are judged by — the server passes its own. */
  nowMs?: number
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
  nowMs = Date.now(),
}: DrawOptions): DrawOutcome {
  const players: PlayerDef[] = []
  let counter = pity
  let pityHit = false

  for (let i = 0; i < count; i++) {
    let key: RollKey
    if (counter + 1 >= PITY_LIMIT) {
      key = rollRarity(rng, PITY_RARITY, rates)
      pityHit = true
    } else {
      key = rollRarity(rng, minRarity, rates)
    }

    if (rankOf(key) >= rarityIndex(PITY_RARITY)) counter = 0
    else counter += 1

    players.push(pick(key, rng, group, featured, nowMs))
  }

  if (guarantee && !players.some((player) => rarityIndex(player.rarity) >= rarityIndex(guarantee))) {
    const index = Math.floor(rng() * players.length)
    players[index] = pick(guarantee, rng, group, featured, nowMs)
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
