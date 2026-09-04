import type { Dot, LiveMatchState } from './matchEngine'
import { getSupabase } from './supabase'
import type { TacticSetup } from './tactics'
import { emptyMetrics } from './tactics/metrics'
import type { MatchEvent } from './types'

/**
 * Client side of the live weekly fixture — docs/WEEKLY_LIVE_MATCH_DESIGN.md.
 * Everything here is a thin call into the weekly-fixture-live Edge Function;
 * the match itself is replayed on the server from the kick-off snapshot, so
 * this never simulates anything locally.
 */

/**
 * Asks the server to settle any of this group's fixtures whose live window has
 * closed but that are still pending. Called when the weekly screen opens.
 * Failure is quiet: the 5-minute safety-net cron and the next visitor will
 * get to it.
 */
export async function catchUpWeeklyGroup(groupId: number): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0
  try {
    const { data, error } = await supabase.functions.invoke('weekly-fixture-live', {
      body: { action: 'catch_up_group', groupId },
    })
    if (error) return 0
    const body = data as { ok?: boolean; settled?: number } | null
    return body?.ok ? body.settled ?? 0 : 0
  } catch {
    return 0
  }
}

export type LiveSide = 'home' | 'away'

export interface LivePublicState {
  minute: number
  finished: boolean
  phase: string
  stoppage: string | null
  scoreHome: number
  scoreAway: number
  shotsHome: number
  shotsAway: number
  possessionHome: number
  events: MatchEvent[]
  ball?: { x: number; y: number }
  home?: Dot[]
  away?: Dot[]
}

/**
 * PitchView takes the engine's own LiveMatchState; the server sends only the
 * parts it draws, so this fills the rest with placeholders. Nothing here is
 * simulated — the positions are the server's.
 */
export function pitchStateOf(state: LivePublicState): LiveMatchState {
  return {
    minute: state.minute,
    phase: state.phase as LiveMatchState['phase'],
    stoppage: state.stoppage ? { kind: 'out', ticksLeft: 0, text: state.stoppage } : null,
    possession: 'home',
    ball: state.ball ?? { x: 50, y: 50 },
    home: state.home ?? [],
    away: state.away ?? [],
    scoreFor: state.scoreHome,
    scoreAgainst: state.scoreAway,
    shotsFor: state.shotsHome,
    shotsAgainst: state.shotsAway,
    possessionTicks: { home: state.possessionHome, away: 100 - state.possessionHome },
    events: state.events,
    scorerUids: [],
    opponentScorerUids: [],
    stamina: {},
    opponentStamina: {},
    metrics: emptyMetrics(),
    finished: state.finished,
  }
}

export interface LiveLineupView {
  slots: { slotId: string; position: string; uid: string | null; name: string; stamina: number | null }[]
  bench: { uid: string; name: string; condition: number }[]
  subsLeft: number
}

export interface LiveApplied {
  id: number
  side: LiveSide
  appliedMinute: number
  text: string
}

export interface LiveRejected {
  id: number
  side: LiveSide
  reason: string
}

export type WeeklyLiveView =
  | { status: 'upcoming'; side: LiveSide | null; home: string; away: string; kickoffAt: string; secondsToKickoff: number }
  | {
      /** Inside the three minutes before kick-off: the eleven is locked and orders may be queued. */
      status: 'pre'
      side: LiveSide | null
      home: string
      away: string
      kickoffAt: string
      secondsToKickoff: number
      lineup: LiveLineupView | null
      pending: number
    }
  | {
      status: 'live'
      side: LiveSide | null
      home: string
      away: string
      kickoffAt: string
      state: LivePublicState
      applied: LiveApplied[]
      rejected: LiveRejected[]
      lineup: LiveLineupView | null
      pending: number
    }
  | { status: 'played'; side: LiveSide | null; home: string; away: string; state: LivePublicState; applied?: LiveApplied[]; rejected?: LiveRejected[] }

export async function getWeeklyLiveState(
  fixtureId: number,
): Promise<{ ok: true; view: WeeklyLiveView } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  try {
    const { data, error } = await supabase.functions.invoke('weekly-fixture-live', {
      body: { action: 'get_state', fixtureId },
    })
    if (error) return { ok: false, reason: 'unavailable' }
    const body = data as ({ ok: true } & WeeklyLiveView) | { ok: false; reason?: string } | null
    if (!body?.ok) return { ok: false, reason: (body && 'reason' in body && body.reason) || 'unavailable' }
    return { ok: true, view: body }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export type LiveCommandInput =
  | { kind: 'tactic'; tactic: TacticSetup }
  | { kind: 'substitution'; slotId: string; inUid: string }
  /** Server decides who is tired from live legs — same rule as casual mode's button. */
  | { kind: 'autosub' }

export async function submitWeeklyCommand(
  fixtureId: number,
  command: LiveCommandInput,
): Promise<{ ok: true; minute: number; duplicate: boolean } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const idempotencyKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const { kind, ...payload } = command
  try {
    const { data, error } = await supabase.functions.invoke('weekly-fixture-live', {
      body: { action: 'submit_command', fixtureId, kind, payload, idempotencyKey },
    })
    if (error) return { ok: false, reason: 'unavailable' }
    const body = data as { ok?: boolean; reason?: string; minute?: number; duplicate?: boolean } | null
    if (!body?.ok) return { ok: false, reason: body?.reason ?? 'unavailable' }
    return { ok: true, minute: body.minute ?? 0, duplicate: Boolean(body.duplicate) }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export const LIVE_COMMAND_FAILURE_MESSAGE: Record<string, string> = {
  offline: '서버에 연결되지 않았습니다.',
  unavailable: '경기 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'not signed in': '로그인이 풀렸습니다.',
  'not a participant': '이 경기의 감독만 지시를 내릴 수 있습니다.',
  'not started': '아직 킥오프 전입니다.',
  'live window over': '경기가 끝나 지시를 낼 수 없습니다.',
  'already settled': '이미 끝난 경기입니다.',
  'bad command': '지시 내용이 올바르지 않습니다.',
}
