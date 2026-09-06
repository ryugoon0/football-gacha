import { PACKS, PACK_RATES, PITY_LIMIT, PITY_RARITY, type PackFamily } from './gacha'
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
  rarity: Rarity
  label: string
  basic: number
  premium: number
}

/** One row per grade, highest first, with both families' odds in force now. */
export function oddsRows(): OddsRow[] {
  return [...RARITIES].reverse().map((rarity) => ({
    rarity,
    label: RARITY_STYLES[rarity].label,
    basic: PACK_RATES.basic[rarity],
    premium: PACK_RATES.premium[rarity],
  }))
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
  return PACKS.map((pack) => ({
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
