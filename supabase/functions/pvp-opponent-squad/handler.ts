// 데일리 PvP 상대 라인업 조회.
//
// 기존 public_club_squads(옵트인 스냅샷)와 완전히 별개 경로다 — "PvP 상대는
// 공개 설정과 무관하게 항상 보인다"로 확정된 사항이라, 대상 유저의 saves를
// service_role로 직접 읽는다. lib/publicClub.ts의 publicLineupOf()를 그대로
// 번들해서 쓰므로(draw-pack과 같은 패턴), 무엇을 공개하는지(선수 아이디·
// 레벨·선발/교체 자리뿐, 카드 uid·컨디션·경제 정보는 없음)는 한 곳에만
// 쓰여 있다.
import { publicLineupOf, type SharedGameState } from './shared.js'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    let body: { userId?: string } = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }
    const targetId = typeof body.userId === 'string' ? body.userId : ''
    if (!UUID_RE.test(targetId)) return refuse('bad user')

    const server = { apikey: service, Authorization: `Bearer ${service}` }
    const saveRes = await fetch(`${url}/rest/v1/saves?user_id=eq.${targetId}&select=data`, {
      headers: server,
    })
    if (!saveRes.ok) {
      return json({ ok: false, reason: 'save read failed', detail: await saveRes.text() }, 500)
    }
    const rows = (await saveRes.json()) as { data?: SharedGameState }[]
    const save = rows[0]?.data
    if (!save) return refuse('not found')

    const clubName = typeof save.club === 'string' && save.club ? save.club : '이름 없는 클럽'
    const division = Number(save.season?.division)
    const lineup = publicLineupOf(save)

    return json({
      ok: true,
      userId: targetId,
      clubName,
      division: Number.isFinite(division) ? division : null,
      formation: save.squad?.formation ?? '4-3-3',
      lineup,
    })
  } catch (error) {
    return json(
      { ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
}
