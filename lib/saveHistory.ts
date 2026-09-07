import { getSupabase } from './supabase'

/**
 * 저장본 이력 — the server keeps earlier versions of a save (save_history,
 * written by a trigger on every put_save at most once per ten minutes) so an
 * operator can roll a manager back after an irreversible mistake. Operator
 * RPCs only; players never see these rows.
 */

export type SaveHistoryReason = 'auto' | 'daily' | 'pre-restore' | 'manual'

export interface SaveHistoryRow {
  id: number
  saved_at: string
  reason: SaveHistoryReason
  revision: number | null
  gold: number | null
  cards: number | null
  played: number | null
  season: number | null
  club: string | null
}

export const SAVE_HISTORY_REASON_LABEL: Record<SaveHistoryReason, string> = {
  auto: '자동',
  daily: '그날 첫 판',
  'pre-restore': '복원 직전',
  manual: '운영자 저장',
}

export async function fetchSaveHistory(userId: string): Promise<SaveHistoryRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_save_history', { p_user: userId })
  if (error || !Array.isArray(data)) return []
  return data as SaveHistoryRow[]
}

export async function snapshotSave(userId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('admin_snapshot_save', { p_user: userId })
  if (error) return { ok: false, reason: error.message }
  const body = data as { ok?: boolean; reason?: string } | null
  return body?.ok ? { ok: true } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

export async function restoreSave(historyId: number): Promise<{ ok: true; revision: number; restoredFrom: string } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('admin_restore_save', { p_history_id: historyId })
  if (error) return { ok: false, reason: error.message }
  const body = data as { ok?: boolean; reason?: string; revision?: number; restoredFrom?: string } | null
  return body?.ok ? { ok: true, revision: Number(body.revision ?? 0), restoredFrom: String(body.restoredFrom ?? '') } : { ok: false, reason: body?.reason ?? 'unavailable' }
}
