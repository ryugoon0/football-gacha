import { getSupabase } from './supabase'

/**
 * Reading the watchlist.
 *
 * The rule that matters: no single signal condemns an account. A player can
 * trip one by accident — a flaky connection retries a save, a device clock is
 * wrong. Several unrelated signals at once is what stops being a coincidence.
 */

export interface WatchRow {
  user_id: string
  email: string | null
  signals: number
  score: number
  kinds: string[] | null
  detail: string
  last_at: string | null
}

export const SIGNAL_LABELS: Record<string, string> = {
  reject: '저장 거부',
  write_rate: '저장 폭주',
  gold_rate: '골드 급증',
  match_rate: '경기 폭주',
  rollback: '진행 되감기',
  spam: '게시판 도배',
}

export type Risk = 'low' | 'medium' | 'high'

/**
 * A rejected save is the server saying "this state is impossible", so one is
 * already worth a look. Otherwise it takes more than one kind of signal.
 */
export function riskOf(row: Pick<WatchRow, 'signals' | 'score' | 'kinds'>): Risk {
  const kinds = row.kinds ?? []
  const rejected = kinds.includes('reject')
  if (row.signals >= 3 || (rejected && row.signals >= 2)) return 'high'
  if (row.signals >= 2 || rejected) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// 1시간 점검 (watch_alerts) — the hourly batch's findings, kept until acknowledged.
// ---------------------------------------------------------------------------

export interface WatchAlert {
  user_id: string
  email: string | null
  club: string | null
  risk: Risk
  signals: number
  score: number
  kinds: string[] | null
  detail: string
  first_seen: string
  last_seen: string
  acknowledged_at: string | null
  last_run: string | null
  last_run_total: number | null
  last_run_fresh: number | null
}

export async function fetchWatchAlerts(): Promise<WatchAlert[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_watch_alerts')
  if (error || !Array.isArray(data)) return []
  return data as WatchAlert[]
}

export async function fetchWatchLastRun(): Promise<{ ranAt: string; total: number; fresh: number } | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('admin_watch_last_run')
  if (error || !data || typeof data !== 'object') return null
  const body = data as { ranAt?: string; total?: number; fresh?: number }
  return body.ranAt ? { ranAt: body.ranAt, total: Number(body.total ?? 0), fresh: Number(body.fresh ?? 0) } : null
}

export async function ackWatchAlert(userId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_ack_watch_alert', { p_user: userId })
  return !error && Boolean((data as { ok?: boolean } | null)?.ok)
}

export async function runWatchCheckNow(): Promise<{ total: number; fresh: number } | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('admin_run_watch_check')
  if (error) return null
  const body = data as { ok?: boolean; total?: number; fresh?: number } | null
  return body?.ok ? { total: Number(body.total ?? 0), fresh: Number(body.fresh ?? 0) } : null
}
