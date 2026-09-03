// 데일리 PvP 판정 — 서버 권한.
//
// simulate-match와 같은 원칙(무엇이 나왔는지는 서버가 정한다)을 그대로
// 따르되, 이쪽은 세이브를 두 벌(도전한 쪽·상대) 읽어야 한다. 상대의
// 라인업은 그 사람이 지금 저장해 둔 실제 스쿼드이고, 검증하지 않는다 —
// 상대는 아무것도 걸지 않으므로(하루 한도도 도전한 쪽만 소모) 속여도
// 얻을 게 없다. 시뮬레이션은 lib/matchEngine.ts의 opponentSquad 확장을
// 그대로 쓴다 — 캐주얼 모드·경쟁 리그의 rating 전용 상대 계산과 같은
// 엔진, 같은 코드다.
import {
  DEFAULT_TACTIC,
  ENGINE_VERSION,
  KNOB_KEYS,
  evaluateSquad,
  matchReward,
  missingSlots,
  setTuning,
  tune,
  type SharedCard,
  type SharedSquad,
  runToEnd,
  toResult,
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

const refuse = (reason: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, reason, ...extra })

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PvpMatchRequest {
  opponentUserId?: string
  squad?: SharedSquad
  tactic?: unknown
  phased?: unknown
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

interface SaveShape {
  cards?: unknown
  squad?: unknown
  club?: unknown
  season?: { division?: number }
  daily?: { pvpMatches?: number }
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

    let body: PvpMatchRequest = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }

    const opponentUserId = typeof body.opponentUserId === 'string' ? body.opponentUserId : ''
    if (!UUID_RE.test(opponentUserId)) return refuse('bad opponent')
    if (opponentUserId === user.id) return refuse('cannot challenge yourself')
    if (!isSquad(body.squad)) return refuse('bad squad')

    const server = { apikey: service, Authorization: `Bearer ${service}` }

    const [saveRes, opponentRes, configRes] = await Promise.all([
      fetch(`${url}/rest/v1/saves?user_id=eq.${user.id}&select=data`, { headers: server }),
      fetch(`${url}/rest/v1/saves?user_id=eq.${opponentUserId}&select=data`, { headers: server }),
      fetch(`${url}/rest/v1/game_config?select=key,value`, { headers: server }),
    ])
    if (!saveRes.ok) {
      return json({ ok: false, reason: 'save read failed', detail: await saveRes.text() }, 500)
    }
    if (!opponentRes.ok) {
      return json({ ok: false, reason: 'opponent read failed', detail: await opponentRes.text() }, 500)
    }

    const saveRows = (await saveRes.json()) as { data?: SaveShape }[]
    const save = saveRows[0]?.data
    if (!save) return refuse('no save')

    const opponentRows = (await opponentRes.json()) as { data?: SaveShape }[]
    const opponentSave = opponentRows[0]?.data
    if (!opponentSave) return refuse('opponent not found')

    if (configRes.ok) {
      const configRows = (await configRes.json()) as { key: string; value: number }[]
      const known = new Set<string>(KNOB_KEYS)
      const values: Record<string, number> = {}
      for (const row of configRows) if (known.has(row.key)) values[row.key] = row.value
      setTuning(values)
    }

    const playedToday = Number(save.daily?.pvpMatches ?? 0)
    if (playedToday >= tune('pvpDailyLimit')) {
      return refuse('pvp limit reached')
    }

    const cards = Array.isArray(save.cards) ? (save.cards as SharedCard[]) : []
    const division = Number(save.season?.division)
    if (!Number.isFinite(division) || division < 1 || division > 5) {
      return refuse('bad save state')
    }
    const teamName = typeof save.club === 'string' && save.club ? save.club : '내 클럽'

    const opponentCards = Array.isArray(opponentSave.cards) ? (opponentSave.cards as SharedCard[]) : []
    const opponentSquadData = isSquad(opponentSave.squad) ? opponentSave.squad : null
    if (!opponentSquadData) return refuse('opponent lineup not ready')
    const opponentDivision = Number(opponentSave.season?.division)
    const opponentName = typeof opponentSave.club === 'string' && opponentSave.club
      ? opponentSave.club
      : '상대 클럽'

    const rating = evaluateSquad(cards, body.squad, division)
    const gaps = missingSlots(rating.evaluations)
    if (gaps.empty.length > 0 || gaps.injured.length > 0 || gaps.duplicated.length > 0) {
      return refuse('lineup not ready', { empty: gaps.empty, injured: gaps.injured, duplicated: gaps.duplicated })
    }
    if (rating.overCap) {
      return refuse('lineup over level cap', { levelTotal: rating.levelTotal, levelCap: rating.levelCap })
    }

    const opponentRating = evaluateSquad(
      opponentCards,
      opponentSquadData,
      Number.isFinite(opponentDivision) ? opponentDivision : division,
    )

    const setup = {
      team: rating,
      teamName,
      opponent: { id: 'pvp', name: opponentName, badge: '', rating: 0 },
      opponentSquad: opponentRating,
      opponentName,
      opponentTraits: opponentRating.traits as never,
      division,
      venue: 'neutral' as const,
      tactic: (body.tactic && typeof body.tactic === 'object' ? body.tactic : DEFAULT_TACTIC) as never,
      traits: rating.traits as never,
      phased: (body.phased ?? undefined) as never,
    }

    const { rng, seed } = serverRng()
    const state = runToEnd(setup, rng)
    const result = toResult(state, setup, { seed, engineVersion: ENGINE_VERSION })

    const baseReward = matchReward(result.result, division, result.scoreFor)
    const reward = Math.round(baseReward * tune('pvpGoldMultiplier'))

    const settle = await fetch(`${url}/rest/v1/rpc/commit_match`, {
      method: 'POST',
      headers: { ...server, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user: user.id,
        p_competition: 'pvp',
        p_seed: seed,
        p_engine_version: result.engineVersion,
        p_division: division,
        p_opponent_name: opponentName,
        p_opponent_rating: 0,
        p_venue: 'neutral',
        p_score_for: result.scoreFor,
        p_score_against: result.scoreAgainst,
        p_result: result.result,
        p_reward: reward,
        p_events: result.events,
        p_opponent_user_id: opponentUserId,
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
      opponentClubName: opponentName,
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
