import { getSupabase } from './supabase'
import {
  ITEMS,
  ITEM_IDS,
  VISIBLE_BOUNDS,
  priceBounds,
  priceKey,
  setItemPrices,
  setItemVisibility,
  visibleKey,
  type Currency,
} from './items'
import { SHARD_OFFERS, exchangeBounds, offerKey, setExchangeCosts } from './shards'
import { KNOBS, KNOB_KEYS, setTuning, type KnobKey } from './tuning'

/**
 * Bringing the operator's settings down to the browser.
 *
 * Read once while the game starts, before any match is played. If the server
 * cannot be reached the game runs on the defaults compiled into the bundle —
 * a tuning value is not worth refusing to start over.
 */
export async function loadTuning(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.from('game_config').select('key, value')
  if (error || !data) return false

  const values: Record<string, number> = {}
  for (const row of data as { key: string; value: number | string }[]) {
    const value = typeof row.value === 'string' ? Number(row.value) : row.value
    if (Number.isFinite(value)) values[row.key] = value
  }
  setTuning(values)
  setItemPrices(values)
  setItemVisibility(values)
  setExchangeCosts(values)
  return true
}

/** Registers every knob so a new one appears in the tool on first run. */
export async function registerKnobs(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  const knobs = KNOB_KEYS.map((key) => ({
    p_key: key as string,
    p_default: KNOBS[key].default,
    p_min: KNOBS[key].min,
    p_max: KNOBS[key].max,
  }))

  // Two per item, generated from the list, so a new item brings its own dials.
  const prices = ITEM_IDS.flatMap((id) =>
    (['gold', 'shards'] as Currency[]).flatMap((currency) => {
      const base = ITEMS[id][currency]
      if (base === null) return []
      const bounds = priceBounds(base)
      return [{ p_key: priceKey(id, currency), p_default: base, p_min: bounds.min, p_max: bounds.max }]
    }),
  )

  // One switch per item. Default 1 — a new item is on the shelf unless the
  // operator takes it down, never the other way round.
  const shelf = ITEM_IDS.map((id) => ({
    p_key: visibleKey(id),
    p_default: 1,
    p_min: VISIBLE_BOUNDS.min,
    p_max: VISIBLE_BOUNDS.max,
  }))

  const exchange = SHARD_OFFERS.map((offer) => {
    const bounds = exchangeBounds(offer.cost)
    return {
      p_key: offerKey(offer.rarity),
      p_default: offer.cost,
      p_min: bounds.min,
      p_max: bounds.max,
    }
  })

  await Promise.all(
    [...knobs, ...prices, ...shelf, ...exchange].map((args) => supabase.rpc('register_knob', args)),
  )
}

export async function saveKnob(
  key: KnobKey,
  value: number,
): Promise<{ ok: boolean; value?: number; clamped?: boolean; reason?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('set_game_config', { p_key: key, p_value: value })
  if (error) return { ok: false, reason: error.message }
  return (data ?? { ok: false }) as { ok: boolean; value?: number; clamped?: boolean; reason?: string }
}

export interface ConfigChange {
  key: string
  before: number | null
  after: number
  email: string | null
  at: string
}

export async function configHistory(): Promise<ConfigChange[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('config_history')
  if (error || !data) return []
  return data as ConfigChange[]
}
