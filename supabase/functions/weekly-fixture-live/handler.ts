// 주간 리그 fixture — 실제 카드·전술 엔진으로 진행·판정한다.
//
// 최소 한쪽이 실유저인 fixture만 여기로 온다(AI 대 AI는 SQL 포아송 정산이
// 계속 맡는다). 판정 자체는 lib/matchEngine.ts — 캐주얼 모드·데일리 PvP와
// 같은 코드다.
//
// 2단계(라이브 개입): 킥오프부터 15분(경기 1분 = 실제 10초) 동안 경기가
// "진행 중"이다. 경기 상태는 저장하지 않는다 — (킥오프 스냅샷, 시드, 명령
// 목록, 지금 분)의 순수 함수라 볼 때마다 킥오프부터 재생한다(90틱 ≈ 1ms).
// 그래서 lease·CAS 없이도 두 감독이 동시에 봐도 같은 경기를 본다. 공유
// 쓰기는 명령 추가(멱등 키)와 최종 확정(advisory lock)뿐이다.
//
// 액션
// - get_state {fixtureId}: 스냅샷을 (없으면 만들어 저장하고) 지금 분까지
//   재생해 공개 상태를 돌려준다. 요청자가 참가자면 자기 쪽 라인업·교체
//   가능 인원도 준다. 라이브 창이 끝났으면 90분까지 재생해 확정한다.
// - submit_command {fixtureId, kind, payload, idempotencyKey}: 전술·교체
//   명령 접수. 참가자·창 안·멱등은 DB 함수가 지킨다.
// - catch_up_group {groupId}: 창이 끝났는데 pending인 그 그룹 fixture를
//   확정하고, 백그라운드에서 안전망 큐도 조금 비운다(대안 B).
import {
  ENGINE_VERSION,
  KNOB_KEYS,
  TIERS,
  buildWeeklyMatchSetup,
  evaluateSquad,
  getPlayer,
  kickoffSquadOf,
  starterAverageOf,
  weeklyAiAnchor,
  lineupViewOf,
  liveWindowEnded,
  matchMinuteAt,
  isTacticCardId,
  publicStateOf,
  replayFixture,
  rewardsForFixture,
  setTuning,
  toResult,
  type SharedCard,
  type SharedCommand,
  type SharedMemberSummary,
  type SharedRealSquadInput,
  type SharedSnapshot,
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

const refuse = (reason: string, extra: Record<string, unknown> = {}) => json({ ok: false, reason, ...extra })

function newSeed(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface DueMember {
  slot: number
  kind: 'user' | 'ai'
  userId: string | null
  clubName: string
  rating: number
}

interface FixtureInfo {
  fixtureId: number
  groupId: number
  homeSlot: number
  awaySlot: number
  neutralVenue: boolean
  scheduledAtUtc?: string
  status?: string
  scoreHome?: number | null
  scoreAway?: number | null
  events?: unknown
  home: DueMember
  away: DueMember
}

interface EngineRow {
  seed: string
  engineVersion: string
  snapshot: SharedSnapshot
}

interface Context {
  fixture: FixtureInfo | null
  engine: EngineRow | null
  commands: SharedCommand[]
}

interface SaveShape {
  cards?: unknown
  squad?: unknown
  season?: { division?: number }
  tactic?: unknown
  plan?: unknown
  autoSub?: unknown
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
const PUBLIC_EVENT_LIMIT = 60

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
 * A real user's side, from their save. Null when there is no usable eleven —
 * the caller then fields that side as an AI stand-in at the member's seeded
 * rating, so the fixture still settles rather than hanging on a manager who
 * never set a squad.
 */
async function realSideOf(url: string, server: ServerHeaders, userId: string): Promise<SharedRealSquadInput | null> {
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
    autoSub: save.autoSub !== false,
  }
}

const summaryOf = (m: DueMember): SharedMemberSummary => ({
  slot: m.slot,
  kind: m.kind,
  clubName: m.clubName,
  rating: m.rating,
})

/**
 * The squad overall an AI club in this group should play at: the median of
 * the real managers' current squads, scaled by the tier's AI gradient
 * (lib/weeklyLeague/liveMatch.ts weeklyAiAnchor). Without it the picked AI
 * eleven stalls near 88 while real squads run 80–125, and the first real
 * settlements came out 9:0. Reads every real member's save — at most 16,
 * once per fixture kick-off.
 */
async function aiAnchorFor(url: string, server: ServerHeaders, groupId: number): Promise<number | undefined> {
  const [groupRes, membersRes] = await Promise.all([
    fetch(`${url}/rest/v1/weekly_league_groups?id=eq.${groupId}&select=tier`, { headers: server }),
    fetch(`${url}/rest/v1/weekly_league_members?group_id=eq.${groupId}&kind=eq.user&select=user_id`, { headers: server }),
  ])
  if (!groupRes.ok || !membersRes.ok) return undefined
  const group = ((await groupRes.json()) as { tier?: number }[])[0]
  const ids = ((await membersRes.json()) as { user_id: string | null }[]).map((m) => m.user_id).filter((id): id is string => Boolean(id))
  if (ids.length === 0) return undefined
  const savesRes = await fetch(`${url}/rest/v1/saves?user_id=in.(${ids.join(',')})&select=data`, { headers: server })
  if (!savesRes.ok) return undefined
  const rows = (await savesRes.json()) as { data?: SaveShape }[]
  const averages: number[] = []
  for (const row of rows) {
    const save = row.data
    if (!save || !isSquad(save.squad) || !Array.isArray(save.cards)) continue
    const division = Number(save.season?.division)
    const rating = evaluateSquad(save.cards as SharedCard[], save.squad, Number.isFinite(division) ? division : 5)
    const average = starterAverageOf(rating)
    if (average > 0) averages.push(average)
  }
  const tier = Math.max(0, Math.min(TIERS.length - 1, Number(group?.tier ?? 0)))
  return weeklyAiAnchor(averages, TIERS[tier].aiBaseRating, TIERS[0].aiBaseRating)
}

/** Managers may enter, see their eleven and queue orders this long before kick-off. */
const PRE_WINDOW_MS = 3 * 60 * 1000

/** Kick-off snapshot: both sides' material plus the setup built from it. */
async function buildSnapshot(url: string, server: ServerHeaders, fixture: FixtureInfo): Promise<SharedSnapshot> {
  const hasAi = fixture.home.kind !== 'user' || fixture.away.kind !== 'user'
  const [homeInput, awayInput, aiAnchor] = await Promise.all([
    fixture.home.kind === 'user' && fixture.home.userId ? realSideOf(url, server, fixture.home.userId) : null,
    fixture.away.kind === 'user' && fixture.away.userId ? realSideOf(url, server, fixture.away.userId) : null,
    hasAi ? aiAnchorFor(url, server, fixture.groupId) : Promise.resolve(undefined),
  ])
  const setup = buildWeeklyMatchSetup({
    groupId: fixture.groupId,
    home: summaryOf(fixture.home),
    away: summaryOf(fixture.away),
    homeInput: homeInput ?? undefined,
    awayInput: awayInput ?? undefined,
    neutralVenue: fixture.neutralVenue,
    aiAnchor,
  })
  // The AI side's material is inside the setup already (weeklyAiSquad); the
  // replay only needs cards/squad for sides that can be substituted, which is
  // real users. An AI side gets an empty material and never issues commands.
  const empty = { cards: [] as SharedCard[], squad: { formation: '4-3-3', slots: {}, bench: [] }, division: 5 }
  // The material carries the eleven that actually kicked off (pre-match auto
  // substitutions applied), the same squad the setup was rated from.
  const material = (input: SharedRealSquadInput) => ({
    cards: input.cards,
    squad: kickoffSquadOf(input),
    division: input.division,
    autoSub: input.autoSub !== false,
  })
  return {
    setup,
    home: homeInput ? material(homeInput) : empty,
    away: awayInput ? material(awayInput) : empty,
  }
}

/** The stored snapshot, or a fresh one saved now — whichever one the database ends up holding. */
async function ensureEngine(url: string, server: ServerHeaders, fixture: FixtureInfo, engine: EngineRow | null): Promise<EngineRow> {
  if (engine) return engine
  const snapshot = await buildSnapshot(url, server, fixture)
  const saved = await rpc<EngineRow>(url, server, 'save_weekly_fixture_engine_state', {
    p_fixture_id: fixture.fixtureId,
    p_seed: newSeed(),
    p_engine_version: ENGINE_VERSION,
    p_snapshot: snapshot,
  })
  return saved
}

async function tierOf(url: string, server: ServerHeaders, groupId: number): Promise<number> {
  const res = await fetch(`${url}/rest/v1/weekly_league_groups?id=eq.${groupId}&select=tier`, { headers: server })
  if (!res.ok) return 0
  const rows = (await res.json()) as { tier?: number }[]
  return Number(rows[0]?.tier ?? 0)
}

/**
 * Replays to full time and writes the result — with what each real manager
 * earns (lib/weeklyLeague/rewards.ts: match gold by tier, plus the 핫타임
 * bonus for a manager who sent an order in a featured kick-off). True when
 * this call was the one that settled it.
 */
async function settleFromEngine(
  url: string,
  server: ServerHeaders,
  fixture: FixtureInfo,
  engine: EngineRow,
  commands: SharedCommand[],
): Promise<boolean> {
  const replay = replayFixture(engine.snapshot, engine.seed, commands, 90)
  const result = toResult(replay.state, replay.setup, { seed: engine.seed, engineVersion: engine.engineVersion })
  const tier = await tierOf(url, server, fixture.groupId)
  const rewards = rewardsForFixture({
    tier,
    kickoffUtcMs: fixture.scheduledAtUtc ? Date.parse(fixture.scheduledAtUtc) : 0,
    scoreHome: result.scoreFor,
    scoreAway: result.scoreAgainst,
    homeUserId: fixture.home.kind === 'user' ? fixture.home.userId : null,
    awayUserId: fixture.away.kind === 'user' ? fixture.away.userId : null,
    homeCommands: commands.filter((c) => c.side === 'home').length,
    awayCommands: commands.filter((c) => c.side === 'away').length,
  })
  const settled = await rpc<{ ok?: boolean }>(url, server, 'commit_weekly_fixture_result', {
    p_fixture_id: fixture.fixtureId,
    p_score_home: result.scoreFor,
    p_score_away: result.scoreAgainst,
    p_events: result.events,
    p_seed: engine.seed,
    p_engine_version: result.engineVersion,
    p_rewards: rewards,
  })
  return settled?.ok === true
}

async function contextOf(url: string, server: ServerHeaders, fixtureId: number): Promise<Context> {
  return rpc<Context>(url, server, 'weekly_fixture_context', { p_fixture_id: fixtureId })
}

/** One window-ended fixture: reuse its live engine if anyone watched, else start one now. */
async function settleOne(url: string, server: ServerHeaders, fixtureId: number): Promise<boolean> {
  const context = await contextOf(url, server, fixtureId)
  if (!context.fixture || context.fixture.status !== 'pending') return false
  const engine = await ensureEngine(url, server, context.fixture, context.engine)
  return settleFromEngine(url, server, context.fixture, engine, context.commands)
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
  const due = await rpc<{ fixtureId: number }[]>(url, server, 'due_weekly_fixtures', {
    p_group_id: null,
    p_from_queue: true,
    p_limit: QUEUE_DRAIN_PER_CALL,
  })
  let count = 0
  for (const fixture of due) {
    try {
      if (await settleOne(url, server, fixture.fixtureId)) count += 1
    } catch {
      // One bad fixture must not stop the rest; it stays queued for next time.
    }
  }
  return count
}

function sideOf(fixture: FixtureInfo, userId: string): 'home' | 'away' | null {
  if (fixture.home.kind === 'user' && fixture.home.userId === userId) return 'home'
  if (fixture.away.kind === 'user' && fixture.away.userId === userId) return 'away'
  return null
}

const playerNameOf = (id: string) => getPlayer(id)?.name ?? '선수'

type Body = {
  action?: string
  groupId?: number
  fixtureId?: number
  kind?: string
  payload?: unknown
  idempotencyKey?: string
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

    let body: Body = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }

    const server: ServerHeaders = { apikey: service, Authorization: `Bearer ${service}` }
    await loadTuning(url, server)
    const now = Date.now()

    // ------------------------------------------------------------------
    if (body.action === 'catch_up_group') {
      const groupId = Number(body.groupId)
      if (!Number.isInteger(groupId) || groupId <= 0) return refuse('bad group')
      const due = await rpc<{ fixtureId: number }[]>(url, server, 'due_weekly_fixtures', {
        p_group_id: groupId,
        p_from_queue: false,
        p_limit: GROUP_CATCH_UP_LIMIT,
      })
      let settled = 0
      for (const fixture of due) {
        if (await settleOne(url, server, fixture.fixtureId)) settled += 1
      }
      const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
      const drain = drainQueue(url, server).catch(() => 0)
      if (runtime?.waitUntil) runtime.waitUntil(drain)
      else await drain
      return json({ ok: true, settled })
    }

    // ------------------------------------------------------------------
    const fixtureId = Number(body.fixtureId)
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) return refuse('bad fixture')

    if (body.action === 'submit_command') {
      const kind =
        body.kind === 'tactic' || body.kind === 'substitution' || body.kind === 'autosub' || body.kind === 'card'
          ? body.kind
          : null
      if (!kind) return refuse('bad command')
      const payload = body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : kind === 'autosub' ? {} : null
      if (!payload) return refuse('bad command')
      if (kind === 'tactic' && (!payload.tactic || typeof payload.tactic !== 'object')) return refuse('bad command')
      if (kind === 'substitution' && (typeof payload.slotId !== 'string' || typeof payload.inUid !== 'string')) {
        return refuse('bad command')
      }
      if (kind === 'card') {
        // Before kick-off only, and only a card the manager actually holds —
        // read from their save, the same source every other check uses.
        if (!isTacticCardId(payload.cardId)) return refuse('bad command')
        const cardContext = await contextOf(url, server, fixtureId)
        const kickoff = cardContext.fixture?.scheduledAtUtc ? Date.parse(cardContext.fixture.scheduledAtUtc) : 0
        if (!kickoff || now >= kickoff) return refuse('card after kickoff')
        const saveRes = await fetch(`${url}/rest/v1/saves?user_id=eq.${user.id}&select=data`, { headers: server })
        const saveRows = saveRes.ok ? ((await saveRes.json()) as { data?: { items?: Record<string, unknown> } }[]) : []
        const held = Number(saveRows[0]?.data?.items?.[payload.cardId as string] ?? 0)
        if (!(held >= 1)) return refuse('no such card')
      }
      const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.slice(0, 80) : ''
      if (!key) return refuse('bad command')
      const receipt = await rpc<{ ok?: boolean; reason?: string; id?: number; side?: string; minute?: number; duplicate?: boolean }>(
        url,
        server,
        'submit_weekly_fixture_command',
        { p_fixture_id: fixtureId, p_user: user.id, p_kind: kind, p_payload: payload, p_idempotency_key: key },
      )
      if (!receipt?.ok) return refuse(receipt?.reason ?? 'refused')
      return json({ ok: true, id: receipt.id, side: receipt.side, minute: receipt.minute, duplicate: receipt.duplicate })
    }

    if (body.action !== 'get_state') return refuse('bad action')

    const context = await contextOf(url, server, fixtureId)
    const fixture = context.fixture
    if (!fixture || !fixture.scheduledAtUtc) return refuse('not found')
    const scheduledAt = Date.parse(fixture.scheduledAtUtc)
    const side = sideOf(fixture, user.id)

    if (fixture.status !== 'pending') {
      return json({
        ok: true,
        status: 'played',
        side,
        home: fixture.home.clubName,
        away: fixture.away.clubName,
        state: {
          minute: 90,
          finished: true,
          phase: 'full',
          stoppage: null,
          scoreHome: fixture.scoreHome ?? 0,
          scoreAway: fixture.scoreAway ?? 0,
          shotsHome: 0,
          shotsAway: 0,
          possessionHome: 50,
          events: Array.isArray(fixture.events) ? fixture.events.slice(-PUBLIC_EVENT_LIMIT) : [],
        },
      })
    }

    const hasUser = fixture.home.kind === 'user' || fixture.away.kind === 'user'

    if (now < scheduledAt - PRE_WINDOW_MS || (now < scheduledAt && !hasUser)) {
      return json({
        ok: true,
        status: 'upcoming',
        side,
        home: fixture.home.clubName,
        away: fixture.away.clubName,
        kickoffAt: fixture.scheduledAtUtc,
        secondsToKickoff: Math.ceil((scheduledAt - now) / 1000),
      })
    }

    // AI-only fixtures never reach here (the client only asks about fixtures
    // with a real user), but guard anyway: they belong to the SQL settlement.
    if (!hasUser) return refuse('not a live fixture')

    // Opening the fixture in the pre-match window freezes the kick-off
    // snapshot now — the eleven is locked three minutes out, and changes
    // from here on are substitutions, not a new team sheet.
    const engine = await ensureEngine(url, server, fixture, context.engine)

    if (now < scheduledAt) {
      const replay = replayFixture(engine.snapshot, engine.seed, context.commands, 0)
      return json({
        ok: true,
        status: 'pre',
        side,
        home: fixture.home.clubName,
        away: fixture.away.clubName,
        kickoffAt: fixture.scheduledAtUtc,
        secondsToKickoff: Math.ceil((scheduledAt - now) / 1000),
        lineup: side ? lineupViewOf(replay, side, playerNameOf) : null,
        pending: side ? context.commands.filter((c) => c.side === side).length : 0,
        cardPlayed: side ? replay.cardPlayed[side] : null,
      })
    }

    if (liveWindowEnded(scheduledAt, now)) {
      await settleFromEngine(url, server, fixture, engine, context.commands)
      const replay = replayFixture(engine.snapshot, engine.seed, context.commands, 90)
      const state = publicStateOf(replay.state)
      return json({
        ok: true,
        status: 'played',
        side,
        home: fixture.home.clubName,
        away: fixture.away.clubName,
        state: { ...state, events: state.events.slice(-PUBLIC_EVENT_LIMIT) },
        applied: replay.applied,
        rejected: replay.rejected,
      })
    }

    const minute = matchMinuteAt(scheduledAt, now)
    const replay = replayFixture(engine.snapshot, engine.seed, context.commands, minute)
    const state = publicStateOf(replay.state)
    return json({
      ok: true,
      status: 'live',
      side,
      home: fixture.home.clubName,
      away: fixture.away.clubName,
      kickoffAt: fixture.scheduledAtUtc,
      state: { ...state, events: state.events.slice(-PUBLIC_EVENT_LIMIT) },
      applied: replay.applied,
      rejected: replay.rejected,
      lineup: side ? lineupViewOf(replay, side, playerNameOf) : null,
      pending: side ? context.commands.filter((c) => c.side === side && !replay.applied.some((a) => a.id === c.id) && !replay.rejected.some((r) => r.id === c.id)).length : 0,
      cardPlayed: side ? replay.cardPlayed[side] : null,
    })
  } catch (error) {
    return json(
      { ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
}
