import { getSupabase } from './supabase'
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
  return true
}

/** Registers every knob so a new one appears in the tool on first run. */
export async function registerKnobs(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await Promise.all(
    KNOB_KEYS.map((key) =>
      supabase.rpc('register_knob', {
        p_key: key,
        p_default: KNOBS[key].default,
        p_min: KNOBS[key].min,
        p_max: KNOBS[key].max,
      }),
    ),
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
