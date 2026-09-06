import { PACKS, PACK_RATES, PITY_LIMIT, PITY_RARITY, type PackFamily, type RollKey } from './gacha'
import { tune } from './tuning'
import { RARITIES, RARITY_STYLES } from './rarity'
import { SHARD_OFFERS, costOf, setExchangeCosts } from './shards'
import { getSupabase } from './supabase'
import { setTuning } from './tuning'
import type { Rarity } from './types'

/**
 * The published odds — what /odds shows and what the shop links to. The
 * numbers are the same knobs the pull server reads (draw-pack loads
 * game_config before rolling), fetched here through public_odds() so the page
 * works without a login. When the server cannot be reached the compiled
 * defaults stand, which is also what the server falls back to.
 */

export async function loadPublicOdds(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('public_odds')
  if (error || !data || typeof data !== 'object') return false
  const values: Record<string, number> = {}
  for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
    const value = typeof raw === 'string' ? Number(raw) : (raw as number)
    if (Number.isFinite(value)) values[key] = value
  }
  setTuning(values)
  setExchangeCosts(values)
  return true
}

export interface OddsRow {
  rarity: RollKey
  label: string
  basic: number
  premium: number
  /** The premium table while a 리미티드 window is open (리미티드 스카우트). */
  limitedPremium: number
  world: number
}

/** One row per grade, highest first, with every family's odds in force now — plus the 리미티드 bucket. */
export function oddsRows(): OddsRow[] {
  const open = PACK_RATES.premium
  // The 리미티드 table, whether or not a window is open right now: the same
  // knob taken out of 일반·실버·골드 in proportion, 플래티넘 unchanged.
  const limited = Math.max(0, Math.min(100 - open.Live, tune('premiumRateLimited')))
  const room = 100 - open.Live
  const factor = room > 0 ? (room - limited) / room : 0
  const base = { Rare: open.Limited ? open.Rare : open.Rare * factor, Legend: open.Limited ? open.Legend : open.Legend * factor }
  const limitedTable: Record<RollKey, number> = {
    Normal: 0,
    Rare: Math.round(base.Rare * 1000) / 1000,
    Legend: Math.round(base.Legend * 1000) / 1000,
    Live: open.Live,
    World: 0,
    Limited: Math.round(limited * 1000) / 1000,
  }
  limitedTable.Normal = Math.max(0, Math.round((100 - limitedTable.Rare - limitedTable.Legend - limitedTable.Live - limitedTable.Limited) * 1000) / 1000)
  const rows: OddsRow[] = [...RARITIES].reverse().map((rarity) => ({
    rarity,
    label: RARITY_STYLES[rarity].label,
    basic: PACK_RATES.basic[rarity],
    premium: open.Limited ? Math.round(((rarity === 'Rare' ? open.Rare / factor : rarity === 'Legend' ? open.Legend / factor : rarity === 'Normal' ? 100 - open.Live - (open.Rare + open.Legend) / factor : open[rarity])) * 1000) / 1000 : open[rarity],
    limitedPremium: limitedTable[rarity],
    world: PACK_RATES.world[rarity],
  }))
  rows.splice(1, 0, { rarity: 'Limited', label: '리미티드', basic: 0, premium: 0, limitedPremium: limitedTable.Limited, world: 0 })
  return rows
}

export interface PackSummary {
  id: string
  family: PackFamily
  name: string
  cost: number
  count: number
  guarantee: string | null
}

export function packSummaries(): PackSummary[] {
  return PACKS.filter((pack) => pack.family !== 'world').map((pack) => ({
    id: pack.id,
    family: pack.family,
    name: pack.name,
    cost: pack.cost,
    count: pack.count,
    guarantee: pack.guarantee ? RARITY_STYLES[pack.guarantee].label : null,
  }))
}

export function exchangeRows(): { rarity: Rarity; label: string; cost: number }[] {
  return SHARD_OFFERS.map((offer) => ({ rarity: offer.rarity, label: RARITY_STYLES[offer.rarity].label, cost: costOf(offer.rarity) }))
}

export const PITY = { limit: PITY_LIMIT, label: RARITY_STYLES[PITY_RARITY].label }
