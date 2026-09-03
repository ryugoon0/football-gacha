import { getSupabase, isSupabaseConfigured } from './supabase'
import type { PublicSquadMember } from './publicClub'
import type { MatchResult, Squad } from './types'
import type { PhasedTactics } from './tactics/phases'
import type { TacticSetup } from './tactics'

/**
 * Daily PvP — search, view, and challenge a real manager's current squad.
 * Same "server decides, client only asks" shape as lib/onlineMatch.ts, but
 * this reads two saves (challenger and opponent) instead of one, and the
 * opponent's lineup is always visible regardless of their scout opt-in —
 * see docs/DAILY_PVP_DESIGN.md.
 */

export interface PvpOpponentSummary {
  userId: string
  clubName: string
  division: number | null
}

export async function searchPvpOpponents(query: string): Promise<PvpOpponentSummary[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const term = query.trim()
  if (!term) return []
  const { data, error } = await supabase.rpc('search_pvp_opponents', { p_query: term })
  if (error || !Array.isArray(data)) return []
  return (data as { userId?: string; clubName?: string; division?: number | null }[])
    .filter((row): row is { userId: string; clubName: string; division: number | null } =>
      typeof row.userId === 'string' && typeof row.clubName === 'string',
    )
    .map((row) => ({ userId: row.userId, clubName: row.clubName, division: row.division ?? null }))
}

export interface PvpOpponentSquad {
  userId: string
  clubName: string
  division: number | null
  formation: string
  lineup: PublicSquadMember[]
}

type OpponentSquadOutcome =
  | { ok: true; squad: PvpOpponentSquad }
  | { ok: false; reason: 'offline' | 'not signed in' | 'not found' | 'unavailable' }

export async function fetchPvpOpponentSquad(userId: string): Promise<OpponentSquadOutcome> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  try {
    const { data, error } = await supabase.functions.invoke('pvp-opponent-squad', { body: { userId } })
    if (error) return { ok: false, reason: 'unavailable' }
    const body = data as
      | { ok: true; userId: string; clubName: string; division: number | null; formation: string; lineup: PublicSquadMember[] }
      | { ok: false; reason?: string }
      | null
    if (!body?.ok) {
      const reason = !body?.ok ? body?.reason : undefined
      if (reason === 'not signed in' || reason === 'not found') return { ok: false, reason }
      return { ok: false, reason: 'unavailable' }
    }
    return {
      ok: true,
      squad: {
        userId: body.userId,
        clubName: body.clubName,
        division: body.division,
        formation: body.formation,
        lineup: body.lineup,
      },
    }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export interface PvpMatchRequest {
  opponentUserId: string
  squad: Squad
  tactic: TacticSetup
  phased?: PhasedTactics
}

export type PvpMatchFailure =
  | 'offline'
  | 'not signed in'
  | 'bad opponent'
  | 'cannot challenge yourself'
  | 'lineup not ready'
  | 'lineup over level cap'
  | 'opponent lineup not ready'
  | 'opponent not found'
  | 'pvp limit reached'
  | 'unavailable'

type PvpMatchOutcome =
  | { ok: true; result: MatchResult; opponentClubName: string; balance: number }
  | { ok: false; reason: PvpMatchFailure; empty?: string[]; injured?: string[] }

export function pvpMatchAvailable(): boolean {
  return isSupabaseConfigured()
}

const KNOWN: PvpMatchFailure[] = [
  'not signed in',
  'bad opponent',
  'cannot challenge yourself',
  'lineup not ready',
  'lineup over level cap',
  'opponent lineup not ready',
  'opponent not found',
  'pvp limit reached',
]

function known(reason: unknown): PvpMatchFailure | null {
  return KNOWN.find((item) => item === reason) ?? null
}

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

export let lastPvpMatchDetail = ''

export async function playPvpMatchOnServer(request: PvpMatchRequest): Promise<PvpMatchOutcome> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('simulate-pvp-match', { body: request })

    if (error) {
      const dug = await reasonFromError(error)
      lastPvpMatchDetail = dug.detail
      return { ok: false, reason: known(dug.reason) ?? 'unavailable', empty: dug.empty, injured: dug.injured }
    }

    const body = data as
      | { ok?: boolean; reason?: string; result?: MatchResult; opponentClubName?: string; balance?: number; empty?: string[]; injured?: string[] }
      | null
    if (!body?.ok || !body.result) {
      lastPvpMatchDetail = body?.reason ?? '알 수 없는 응답'
      return { ok: false, reason: known(body?.reason) ?? 'unavailable', empty: body?.empty, injured: body?.injured }
    }
    lastPvpMatchDetail = ''
    return {
      ok: true,
      result: body.result,
      opponentClubName: body.opponentClubName ?? body.result.opponent,
      balance: body.balance ?? 0,
    }
  } catch (error) {
    lastPvpMatchDetail = error instanceof Error ? error.message : String(error)
    return { ok: false, reason: 'unavailable' }
  }
}

export const PVP_MATCH_FAILURE_MESSAGE: Record<PvpMatchFailure, string> = {
  offline: '서버에 연결되지 않아 도전할 수 없습니다.',
  'not signed in': '로그인이 풀렸습니다. 다시 로그인한 뒤 도전해 주세요.',
  'bad opponent': '상대를 찾을 수 없습니다.',
  'cannot challenge yourself': '자기 자신에게는 도전할 수 없습니다.',
  'lineup not ready': '내 선발 명단을 서버가 확인하지 못했습니다. 스쿼드를 다시 확인해 주세요.',
  'lineup over level cap': '내 선발 레벨 합계가 리그 상한을 넘었습니다.',
  'opponent lineup not ready': '상대의 라인업이 아직 준비되지 않았습니다.',
  'opponent not found': '상대 계정을 찾을 수 없습니다.',
  'pvp limit reached': '오늘의 PvP 도전 횟수를 모두 썼습니다.',
  unavailable: 'PvP 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}
