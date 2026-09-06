import { MAX_CONDITION } from './condition'
import { getSupabase } from './supabase'
import { tune, type KnobKey } from './tuning'
import type { Card } from './types'

/**
 * 경쟁 리그 체력 — the fitness cost of the matches the server settled while
 * the manager was away. Each settled fixture of mine leaves a line saying who
 * kicked off and who came on (weekly_wear); on the next load the client
 * drains those cards and rests everyone else, the way a casual match does,
 * then acknowledges the lines so they never apply twice. The numbers are
 * operator knobs (체력 group).
 */

export interface WearRow {
  id: number
  fixture_id: number
  starters: string[]
  subs: string[]
  created_at: string
}

export interface WearSummary {
  fixtures: number
  drained: number
  rested: number
}

export function wearRates(rates: Partial<Record<KnobKey, number>> = {}): { starter: number; sub: number; rest: number } {
  const read = (key: KnobKey) => Math.round(rates[key] ?? tune(key))
  return { starter: read('weeklyDrainStarter'), sub: read('weeklyDrainSub'), rest: read('weeklyRestRecover') }
}

/**
 * Applies a batch of settled fixtures to the collection, fixture by fixture:
 * starters lose the starter drain, substitutes the sub drain, everyone else
 * (bench and vault) recovers the rest amount. Cards named in a line but no
 * longer owned are ignored. Pure — the reducer calls it.
 */
export function applyWear(cards: Card[], rows: WearRow[], rates = wearRates()): { cards: Card[]; summary: WearSummary } {
  let next = cards
  let drained = 0
  let rested = 0
  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    const starters = new Set(row.starters)
    const subs = new Set(row.subs)
    next = next.map((card) => {
      if (starters.has(card.uid)) {
        drained += 1
        return { ...card, condition: Math.max(0, card.condition - rates.starter) }
      }
      if (subs.has(card.uid)) {
        drained += 1
        return { ...card, condition: Math.max(0, card.condition - rates.sub) }
      }
      rested += 1
      return { ...card, condition: Math.min(MAX_CONDITION, card.condition + rates.rest) }
    })
  }
  return { cards: next, summary: { fixtures: rows.length, drained, rested } }
}

export async function fetchUnappliedWear(): Promise<WearRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('weekly_wear')
    .select('id, fixture_id, starters, subs, created_at')
    .is('applied_at', null)
    .order('id', { ascending: true })
    .limit(200)
  if (error || !data) return []
  return (data as WearRow[]).map((row) => ({
    ...row,
    starters: Array.isArray(row.starters) ? row.starters.map(String) : [],
    subs: Array.isArray(row.subs) ? row.subs.map(String) : [],
  }))
}

export async function ackWear(ids: number[]): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || ids.length === 0) return false
  const { data, error } = await supabase.rpc('ack_weekly_wear', { p_ids: ids })
  if (error) return false
  return (data as { ok?: boolean } | null)?.ok === true
}

/** Fetch → apply through `apply` → acknowledge. Returns what was applied, or null when nothing was pending. */
export async function syncWeeklyWear(apply: (rows: WearRow[]) => void): Promise<WearSummary | null> {
  const rows = await fetchUnappliedWear()
  if (rows.length === 0) return null
  apply(rows)
  await ackWear(rows.map((row) => row.id))
  const rates = wearRates()
  return { fixtures: rows.length, drained: rows.reduce((n, row) => n + row.starters.length + row.subs.length, 0), rested: rates.rest }
}
