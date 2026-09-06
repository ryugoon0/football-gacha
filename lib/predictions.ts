import { getSupabase } from './supabase'

/**
 * 빅매치 예측 — the minigame where the operator posts a round of big matches
 * and every manager who calls all of them right is paid in gold through the
 * 선물함. Rounds, matches and results live on the server
 * (supabase/migrations/20260906060000_match_predictions.sql); this file is
 * the thin client.
 */

export type PredictionOutcome = 'H' | 'D' | 'A'
export const OUTCOMES: PredictionOutcome[] = ['H', 'D', 'A']
export const OUTCOME_LABEL: Record<PredictionOutcome, string> = { H: '홈 승', D: '무', A: '원정 승' }
export const OUTCOME_SHORT: Record<PredictionOutcome, string> = { H: '1', D: 'X', A: '2' }

export interface PredictionMatch {
  id: number
  round_id: number
  idx: number
  league: string
  home: string
  away: string
  kickoff_at: string | null
  result: PredictionOutcome | null
}

export interface PredictionRound {
  id: number
  title: string
  note: string
  closes_at: string
  reward_gold: number
  status: 'open' | 'settled'
  created_at: string
  settled_at: string | null
  entrants: number
  winners: number
}

export interface PredictionPick {
  round_id: number
  picks: Record<string, PredictionOutcome>
  submitted_at: string
  correct: number | null
}

export interface RoundView {
  round: PredictionRound
  matches: PredictionMatch[]
  mine: PredictionPick | null
}

/** A round takes picks while it is open and its deadline has not passed. */
export function roundAcceptsPicks(round: PredictionRound, nowMs: number = Date.now()): boolean {
  return round.status === 'open' && Date.parse(round.closes_at) > nowMs
}

/** True when every match in the round has a pick. */
export function picksComplete(matches: PredictionMatch[], picks: Record<string, PredictionOutcome | undefined>): boolean {
  return matches.length > 0 && matches.every((match) => OUTCOMES.includes(picks[String(match.id)] as PredictionOutcome))
}

/** How many of the entered results a pick sheet got right — the same count the server stores. */
export function countCorrect(matches: PredictionMatch[], picks: Record<string, PredictionOutcome | undefined>): number {
  return matches.filter((match) => match.result !== null && picks[String(match.id)] === match.result).length
}

/** Recent rounds (open first, then the latest settled), with my picks where I have any. */
export async function fetchPredictionRounds(limit = 8): Promise<RoundView[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const roundsRes = await supabase
    .from('prediction_rounds')
    .select('id, title, note, closes_at, reward_gold, status, created_at, settled_at, entrants, winners')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (roundsRes.error || !roundsRes.data) return []
  const rounds = roundsRes.data as PredictionRound[]
  if (rounds.length === 0) return []
  const ids = rounds.map((round) => round.id)
  const [matchesRes, picksRes] = await Promise.all([
    supabase
      .from('prediction_matches')
      .select('id, round_id, idx, league, home, away, kickoff_at, result')
      .in('round_id', ids)
      .order('idx', { ascending: true }),
    supabase.from('prediction_picks').select('round_id, picks, submitted_at, correct').in('round_id', ids),
  ])
  const matches = (matchesRes.data ?? []) as PredictionMatch[]
  const picks = (picksRes.data ?? []) as PredictionPick[]
  const open = rounds.filter((round) => roundAcceptsPicks(round))
  const rest = rounds.filter((round) => !roundAcceptsPicks(round))
  return [...open, ...rest].map((round) => ({
    round,
    matches: matches.filter((match) => match.round_id === round.id),
    mine: picks.find((pick) => pick.round_id === round.id) ?? null,
  }))
}

export async function submitPrediction(
  roundId: number,
  picks: Record<string, PredictionOutcome>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('submit_prediction', { p_round_id: roundId, p_picks: picks })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string } | null
  return body?.ok ? { ok: true } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

export const PREDICTION_FAILURE_MESSAGE: Record<string, string> = {
  offline: '서버에 연결되지 않았습니다.',
  unavailable: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'not signed in': '로그인이 풀렸습니다.',
  'no such round': '이 라운드를 찾을 수 없습니다.',
  closed: '마감된 라운드입니다.',
  incomplete: '모든 경기를 골라야 제출할 수 있습니다.',
  'bad picks': '선택 내용이 올바르지 않습니다.',
  'not an operator': '운영자만 할 수 있습니다.',
  'no matches': '경기를 한 개 이상 넣어야 합니다.',
  'too many matches': '경기는 16개까지입니다.',
  'closes in the past': '마감 시각이 지금보다 뒤여야 합니다.',
  'already settled': '이미 정산된 라운드입니다.',
}

// ---------------------------------------------------------------------------
// 운영자
// ---------------------------------------------------------------------------

export interface NewPredictionMatch {
  league: string
  home: string
  away: string
  kickoffAt: string | null
}

export async function createPredictionRound(input: {
  title: string
  note: string
  closesAt: string
  rewardGold: number
  matches: NewPredictionMatch[]
}): Promise<{ ok: true; roundId: number } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('admin_create_prediction_round', {
    p_title: input.title,
    p_note: input.note,
    p_closes_at: input.closesAt,
    p_reward: input.rewardGold,
    p_matches: input.matches,
  })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string; roundId?: number } | null
  return body?.ok ? { ok: true, roundId: Number(body.roundId) } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

export async function setPredictionResults(
  roundId: number,
  results: Record<string, PredictionOutcome | ''>,
): Promise<{ ok: true; settled: boolean; winners: number; missing: number } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('admin_set_prediction_results', { p_round_id: roundId, p_results: results })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string; settled?: boolean; winners?: number; missing?: number } | null
  if (!body?.ok) return { ok: false, reason: body?.reason ?? 'unavailable' }
  return { ok: true, settled: body.settled === true, winners: Number(body.winners ?? 0), missing: Number(body.missing ?? 0) }
}

export interface PredictionStats {
  entrants: number
  perfect: number
  matches: { matchId: number; H: number; D: number; A: number }[]
}

export async function fetchPredictionStats(roundId: number): Promise<PredictionStats | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('admin_prediction_stats', { p_round_id: roundId })
  if (error || !data) return null
  const body = data as Partial<PredictionStats>
  return { entrants: Number(body.entrants ?? 0), perfect: Number(body.perfect ?? 0), matches: body.matches ?? [] }
}
