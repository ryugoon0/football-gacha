import { getSupabase, isSupabaseConfigured } from './supabase'
import type { MatchResult, Squad } from './types'
import type { PhasedTactics } from './tactics/phases'
import type { TacticSetup } from './tactics'

/**
 * Playing a league or cup match on the server.
 *
 * Matches the shape of lib/serverDraw.ts: no fallback. The client submits
 * what it wants to do (squad, tactic, which opponent, home or away); the
 * server reads the actual save to check the squad is real and legal, then
 * decides what happened. If the call fails, the match does not start on its
 * own — a quiet local simulation would be exactly the way around the server
 * this exists to close (SECURITY_ARCHITECTURE.md, "폴백을 두지 않는다").
 */

export interface OnlineMatchRequest {
  competition: 'league' | 'cup' | 'friendly'
  squad: Squad
  tactic: TacticSetup
  phased?: PhasedTactics
  opponent: { name: string; rating: number }
  venue: 'home' | 'away' | 'neutral'
}

export type OnlineMatchFailure =
  | 'offline'
  | 'not signed in'
  | 'lineup not ready'
  | 'lineup over level cap'
  | 'unavailable'

type OnlineMatchOutcome =
  | { ok: true; result: MatchResult; balance: number }
  | { ok: false; reason: OnlineMatchFailure; empty?: string[]; injured?: string[] }

export function onlineMatchAvailable(): boolean {
  return isSupabaseConfigured()
}

const KNOWN: OnlineMatchFailure[] = [
  'not signed in',
  'lineup not ready',
  'lineup over level cap',
]

function known(reason: unknown): OnlineMatchFailure | null {
  return KNOWN.find((item) => item === reason) ?? null
}

/** Same digging-out as lib/serverDraw.ts — supabase-js drops the body of a non-2xx. */
async function reasonFromError(error: unknown): Promise<{
  reason: string | null
  detail: string
  empty?: string[]
  injured?: string[]
}> {
  const response = (error as { context?: Response })?.context
  const message = error instanceof Error ? error.message : String(error)
  if (!response || typeof response.json !== 'function') return { reason: null, detail: message }
  try {
    const body = (await response.clone().json()) as {
      reason?: string
      detail?: string
      empty?: string[]
      injured?: string[]
    }
    return {
      reason: body?.reason ?? null,
      detail: body?.detail ?? body?.reason ?? message,
      empty: body?.empty,
      injured: body?.injured,
    }
  } catch {
    return { reason: null, detail: `${response.status} ${message}` }
  }
}

/** Set when a match request fails for a reason worth reporting. */
export let lastMatchDetail = ''

export async function playMatchOnServer(request: OnlineMatchRequest): Promise<OnlineMatchOutcome> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('simulate-match', { body: request })

    if (error) {
      const dug = await reasonFromError(error)
      lastMatchDetail = dug.detail
      return { ok: false, reason: known(dug.reason) ?? 'unavailable', empty: dug.empty, injured: dug.injured }
    }

    const body = data as { ok?: boolean; reason?: string; result?: MatchResult; balance?: number; empty?: string[]; injured?: string[] } | null
    if (!body?.ok || !body.result) {
      lastMatchDetail = body?.reason ?? '알 수 없는 응답'
      return { ok: false, reason: known(body?.reason) ?? 'unavailable', empty: body?.empty, injured: body?.injured }
    }
    lastMatchDetail = ''
    return { ok: true, result: body.result, balance: body.balance ?? 0 }
  } catch (error) {
    lastMatchDetail = error instanceof Error ? error.message : String(error)
    return { ok: false, reason: 'unavailable' }
  }
}

export const ONLINE_MATCH_FAILURE_MESSAGE: Record<OnlineMatchFailure, string> = {
  offline: '서버에 연결되지 않아 경기를 진행할 수 없습니다.',
  'not signed in': '로그인이 풀렸습니다. 다시 로그인한 뒤 경기를 시작해 주세요.',
  'lineup not ready': '선발 명단을 서버가 확인하지 못했습니다. 스쿼드를 다시 확인해 주세요.',
  'lineup over level cap': '선발 레벨 합계가 리그 상한을 넘었습니다. 스쿼드를 조정해 주세요.',
  unavailable: '경기 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}
