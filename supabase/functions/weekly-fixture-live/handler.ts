// 주간 리그 fixture를 실제 카드·전술 엔진으로 판정한다 — 1단계.
//
// 최소 한쪽이 실유저인 fixture만 여기로 온다(AI 대 AI는 SQL 포아송 정산이
// 계속 맡는다 — supabase/migrations/..._weekly_live_settlement.sql). 실유저
// 쪽은 그 사람의 saves(카드·스쿼드·전술)를 service_role로 읽고, AI 쪽은
// 그룹·슬롯으로 결정론적인 스쿼드를 만든다. 판정 자체는 lib/matchEngine.ts
// 의 opponentSquad 확장 — 캐주얼 모드·데일리 PvP와 같은 코드다.
//
// 대안 B(트래픽 캐치업): 화면을 연 사람의 그룹에서 시각이 지난 fixture를
// 즉시 판정해 응답하고, 응답을 막지 않는 백그라운드에서 안전망 큐(아무도
// 안 본 fixture)도 조금씩 비운다. 이 훅은 이 함수에만 있다 — 다른 Edge
// Function에는 절대 걸지 않는다.
//
// 이 단계는 개입 없는 한 번짜리 판정이다. 라이브 명령·부분 진행은 다음
// 단계다.
import {
  ENGINE_VERSION,
  KNOB_KEYS,
  buildWeeklyMatchSetup,
  runToEnd,
  setTuning,
  toResult,
  type SharedCard,
  type SharedMemberSummary,
  type SharedRealSquadInput,
  type SharedSquad,
} from './shared.js'

export interface Env {
  url: string
  anon: string
  service: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const refuse = (reason: string) => json({ ok: false, reason })

function serverRng(): { rng: () => number; seed: string } {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const seed = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return {
    seed,
    rng: () => {
      const buffer = new Uint32Array(1)
      crypto.getRandomValues(buffer)
      return buffer[0] / 4294967296
    },
  }
}

interface DueMember {
  slot: number
  kind: 'user' | 'ai'
  userId: string | null
  clubName: string
  rating: number
}

interface DueFixture {
  fixtureId: number
  groupId: number
  homeSlot: number
  awaySlot: number
  neutralVenue: boolean
  home: DueMember
  away: DueMember
}

interface SaveShape {
  cards?: unknown
  squad?: unknown
  season?: { division?: number }
  tactic?: unknown
  plan?: unknown
}

function isSquad(value: unknown): value is SharedSquad {
  if (!value || typeof value !== 'object') return false
  const squad = value as Partial<SharedSquad>
  return (
    typeof squad.formation === 'string' &&
    typeof squad.slots === 'object' &&
    squad.slots !== null &&
    Array.isArray(squad.bench)
  )
}

const QUEUE_DRAIN_PER_CALL = 5
const GROUP_CATCH_UP_LIMIT = 20

type ServerHeaders = { apikey: string; Authorization: string }

async function rpc<T>(url: string, server: ServerHeaders, name: string, body: unknown): Promise<T> {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...server, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name} failed: ${await res.text()}`)
  return (await res.json()) as T
}

/**
 * A real user's side, from their save. Returns null when the save has no
 * usable eleven — the caller then fields that side as an AI stand-in at the
 * member's seeded rating, so the fixture still settles rather than hanging
 * forever on a manager who never set a squad.
 */
async function realSideOf(
  url: string,
  server: ServerHeaders,
  userId: string,
): Promise<SharedRealSquadInput | null> {
  const res = await fetch(`${url}/rest/v1/saves?user_id=eq.${userId}&select=data`, { headers: server })
  if (!res.ok) return null
  const rows = (await res.json()) as { data?: SaveShape }[]
  const save = rows[0]?.data
  if (!save) return null
  const cards = Array.isArray(save.cards) ? (save.cards as SharedCard[]) : []
  if (!isSquad(save.squad)) return null
  const filled = Object.values(save.squad.slots).filter(Boolean).length
  if (filled < 11) return null
  const division = Number(save.season?.division)
  return {
    cards,
    squad: save.squad,
    division: Number.isFinite(division) && division >= 1 && division <= 5 ? division : 5,
    tactic: save.tactic && typeof save.tactic === 'object' ? save.tactic : undefined,
    plan: save.plan && typeof save.plan === 'object' ? save.plan : undefined,
  }
}

async function settleOne(url: string, server: ServerHeaders, fixture: DueFixture): Promise<boolean> {
  const summary = (m: DueMember): SharedMemberSummary => ({
    slot: m.slot,
    kind: m.kind,
    clubName: m.clubName,
    rating: m.rating,
  })
  const [homeInput, awayInput] = await Promise.all([
    fixture.home.kind === 'user' && fixture.home.userId ? realSideOf(url, server, fixture.home.userId) : null,
    fixture.away.kind === 'user' && fixture.away.userId ? realSideOf(url, server, fixture.away.userId) : null,
  ])

  const setup = buildWeeklyMatchSetup({
    groupId: fixture.groupId,
    home: summary(fixture.home),
    away: summary(fixture.away),
    homeInput: homeInput ?? undefined,
    awayInput: awayInput ?? undefined,
    neutralVenue: fixture.neutralVenue,
  })

  const { rng, seed } = serverRng()
  const state = runToEnd(setup, rng)
  const result = toResult(state, setup, { seed, engineVersion: ENGINE_VERSION })

  const settled = await rpc<{ ok?: boolean; alreadySettled?: boolean }>(url, server, 'commit_weekly_fixture_result', {
    p_fixture_id: fixture.fixtureId,
    p_score_home: result.scoreFor,
    p_score_away: result.scoreAgainst,
    p_events: result.events,
    p_seed: seed,
    p_engine_version: result.engineVersion,
  })
  return settled?.ok === true
}

async function loadTuning(url: string, server: ServerHeaders): Promise<void> {
  const res = await fetch(`${url}/rest/v1/game_config?select=key,value`, { headers: server })
  if (!res.ok) return
  const rows = (await res.json()) as { key: string; value: number }[]
  const known = new Set<string>(KNOB_KEYS)
  const values: Record<string, number> = {}
  for (const row of rows) if (known.has(row.key)) values[row.key] = row.value
  setTuning(values)
}

async function drainQueue(url: string, server: ServerHeaders): Promise<number> {
  const due = await rpc<DueFixture[]>(url, server, 'due_weekly_fixtures', {
    p_group_id: null,
    p_from_queue: true,
    p_limit: QUEUE_DRAIN_PER_CALL,
  })
  let count = 0
  for (const fixture of due) {
    try {
      if (await settleOne(url, server, fixture)) count += 1
    } catch {
      // One bad fixture must not stop the rest of the queue; it stays queued
      // and the next call tries again.
    }
  }
  return count
}

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405)

  const { url, anon, service } = env
  if (!url || !anon || !service) return json({ ok: false, reason: 'not configured' }, 500)

  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization) return refuse('not signed in')

  try {
    const whoami = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: anon },
    })
    if (!whoami.ok) return refuse('not signed in')
    const user = (await whoami.json()) as { id?: string }
    if (!user?.id) return refuse('not signed in')

    let body: { action?: string; groupId?: number } = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }
    if (body.action !== 'catch_up_group') return refuse('bad action')
    const groupId = Number(body.groupId)
    if (!Number.isInteger(groupId) || groupId <= 0) return refuse('bad group')

    const server: ServerHeaders = { apikey: service, Authorization: `Bearer ${service}` }
    await loadTuning(url, server)

    const due = await rpc<DueFixture[]>(url, server, 'due_weekly_fixtures', {
      p_group_id: groupId,
      p_from_queue: false,
      p_limit: GROUP_CATCH_UP_LIMIT,
    })

    let settled = 0
    for (const fixture of due) {
      if (await settleOne(url, server, fixture)) settled += 1
    }

    // The safety net, off the response path. Deno Deploy keeps the isolate
    // alive for this after the response has gone out.
    const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
    const drain = drainQueue(url, server).catch(() => 0)
    if (runtime?.waitUntil) runtime.waitUntil(drain)
    else await drain

    return json({ ok: true, settled })
  } catch (error) {
    return json(
      { ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
}
