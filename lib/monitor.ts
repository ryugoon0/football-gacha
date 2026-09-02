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
