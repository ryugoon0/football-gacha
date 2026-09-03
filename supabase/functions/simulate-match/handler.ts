// 서버 권한 경기 판정.
//
// 클라이언트는 스쿼드 배치·전술·어느 상대와 붙는지만 말합니다. 무엇이
// 나왔는지는 서버가 정합니다. 카드 소유·부상·11명 여부는 여기서
// 다시 확인하고, 클라이언트가 보낸 SquadRating을 그대로 믿지 않습니다 —
// 서버가 세이브에서 읽은 카드로 직접 계산합니다.
//
// 시뮬레이션 로직은 이 파일에 다시 쓰지 않고 shared.js를 씁니다. 게임이
// 쓰는 lib/matchEngine.ts·lib/squad.ts·lib/match.ts에서 그대로 만들어진
// 번들이라, 판정이 한 벌뿐입니다.
//
// draw-pack과 같은 이유로 supabase-js 없이 fetch로 REST를 직접 부릅니다.
import {
  DEFAULT_TACTIC,
  ENGINE_VERSION,
  MINI_GAME_REWARD,
  evaluateSquad,
  matchReward,
  missingSlots,
  type SharedCard,
  type SharedSquad,
  runToEnd,
  toResult,
} from './shared.js'

const COMPETITIONS = ['league', 'cup', 'friendly'] as const
type Competition = (typeof COMPETITIONS)[number]
const VENUES = ['home', 'away', 'neutral'] as const
type Venue = (typeof VENUES)[number]

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

/** See draw-pack/handler.ts for why refusals are always 200 with ok:false. */
const refuse = (reason: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, reason, ...extra })

/** See draw-pack/handler.ts — same reasoning, money is involved either way. */
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

interface MatchRequest {
  competition?: string
  squad?: SharedSquad
  tactic?: unknown
  phased?: unknown
  opponent?: { name?: string; rating?: number }
  venue?: string
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

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405)

  const { url, anon, service } = env
  if (!url || !anon || !service) return json({ ok: false, reason: 'not configured' }, 500)

  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization) return refuse('not signed in')

  try {
    // Who is asking. Supabase verifies the token; this never parses it itself.
    const whoami = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: anon },
    })
    if (!whoami.ok) return refuse('not signed in')
    const user = (await whoami.json()) as { id?: string }
    if (!user?.id) return refuse('not signed in')

    let body: MatchRequest = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }

    const competition = COMPETITIONS.includes(body.competition as Competition)
      ? (body.competition as Competition)
      : null
    const venue = VENUES.includes(body.venue as Venue) ? (body.venue as Venue) : null
    const opponentName = (body.opponent?.name ?? '').trim().slice(0, 40)
    const opponentRating = Math.round(Number(body.opponent?.rating))
    if (!competition) return refuse('bad competition')
    if (!venue) return refuse('bad venue')
    if (!isSquad(body.squad)) return refuse('bad squad')
    if (!opponentName) return refuse('bad opponent')
    if (!Number.isFinite(opponentRating) || opponentRating < 0 || opponentRating > 200) {
      return refuse('bad opponent')
    }

    // service_role: the only key allowed to read another table row by user_id
    // and to settle the match afterward.
    const server = { apikey: service, Authorization: `Bearer ${service}` }

    const saveRes = await fetch(`${url}/rest/v1/saves?user_id=eq.${user.id}&select=data`, {
      headers: server,
    })
    if (!saveRes.ok) {
      return json({ ok: false, reason: 'save read failed', detail: await saveRes.text() }, 500)
    }
    const saveRows = (await saveRes.json()) as { data?: { cards?: unknown; season?: unknown } }[]
    const save = saveRows[0]?.data
    if (!save) return refuse('no save')

    const cards = Array.isArray(save.cards) ? (save.cards as SharedCard[]) : []
    const season = save.season as { division?: number } | undefined
    const division = Number(season?.division)
    if (!Number.isFinite(division) || division < 1 || division > 5) {
      return refuse('bad save state')
    }

    // The club name lives in the save too, but it is only ever shown back to
    // this same player — no validation needed for a value nobody else sees.
    const teamName = typeof (save as { club?: unknown }).club === 'string'
      ? (save as { club: string }).club
      : '내 클럽'

    // The one part of this request that is not taken on trust: the squad is
    // evaluated from cards this call just read from the save, not from
    // whatever rating the client might have sent along.
    const rating = evaluateSquad(cards, body.squad, division)
    const gaps = missingSlots(rating.evaluations)
    if (gaps.empty.length > 0 || gaps.injured.length > 0 || gaps.duplicated.length > 0) {
      return refuse('lineup not ready', { empty: gaps.empty, injured: gaps.injured, duplicated: gaps.duplicated })
    }
    if (rating.overCap) {
      return refuse('lineup over level cap', { levelTotal: rating.levelTotal, levelCap: rating.levelCap })
    }

    const setup = {
      team: rating,
      teamName,
      opponent: { id: 'server-opponent', name: opponentName, badge: '', rating: opponentRating },
      division,
      venue,
      tactic: (body.tactic && typeof body.tactic === 'object' ? body.tactic : DEFAULT_TACTIC) as never,
      traits: rating.traits as never,
      phased: (body.phased ?? undefined) as never,
    }

    const { rng, seed } = serverRng()
    const state = runToEnd(setup, rng)
    const result = toResult(state, setup, { seed, engineVersion: ENGINE_VERSION })

    const baseReward = matchReward(result.result, division, result.scoreFor)
    const reward = competition === 'friendly' ? Math.round(baseReward * MINI_GAME_REWARD) : baseReward

    const settle = await fetch(`${url}/rest/v1/rpc/commit_match`, {
      method: 'POST',
      headers: { ...server, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user: user.id,
        p_competition: competition,
        p_seed: seed,
        p_engine_version: result.engineVersion,
        p_division: division,
        p_opponent_name: opponentName,
        p_opponent_rating: opponentRating,
        p_venue: venue,
        p_score_for: result.scoreFor,
        p_score_against: result.scoreAgainst,
        p_result: result.result,
        p_reward: reward,
        p_events: result.events,
      }),
    })

    if (!settle.ok) {
      return json({ ok: false, reason: 'commit failed', detail: await settle.text() }, 500)
    }
    const settled = (await settle.json()) as { ok?: boolean; matchId?: number; balance?: number }
    if (!settled?.ok) return refuse('commit refused')

    return json({
      ok: true,
      result: { ...result, reward },
      matchId: settled.matchId,
      balance: settled.balance,
    })
  } catch (error) {
    return json(
      { ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
}
