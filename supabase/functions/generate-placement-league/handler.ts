// 개막 배치 리그(그리고 나중에 정규 주간 일정도) 생성 — 운영자 전용.
//
// 실유저 배정은 아직 자동 매칭 알고리즘이 없다("admin은 직접 입력으로
// 충분"이라는 이번 세션의 결정 — ROADMAP.md 참고). 그래서 운영자가 이 함수를
// 호출할 때 리그에 넣을 실유저 목록을 직접 넘긴다. 나머지 자리는 AI 클럽으로
// 채운다.
//
// 대진 생성 로직(라운드로빈·홈원정 밸런싱)은 여기 다시 쓰지 않고 shared.js를
// 쓴다. lib/weeklyLeagueServer.ts에서 그대로 만들어진 번들이라 판정이 한
// 벌뿐이다. draw-pack·simulate-match와 같은 이유로 supabase-js 없이 fetch로
// REST를 직접 부른다.
import {
  CLUB_COUNT,
  CLUB_POOL,
  TIERS,
  TIER_COUNT,
  TRANSITION_SCHEDULE,
  buildPlacementSlots,
  generatePlacementFixtures,
  toPlacementFixtureRows,
  toPlacementScheduleSlotRows,
  type MemberInput,
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
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const refuse = (reason: string, extra: Record<string, unknown> = {}) => json({ ok: false, reason, ...extra })

interface RealUserInput {
  userId?: string
  clubName?: string
  rating?: number
}

interface GenerateRequest {
  tier?: number
  realUsers?: RealUserInput[]
}

function isRealUserInput(value: unknown): value is Required<RealUserInput> {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<RealUserInput>
  return (
    typeof v.userId === 'string' &&
    v.userId.length > 0 &&
    typeof v.clubName === 'string' &&
    v.clubName.trim().length > 0 &&
    v.clubName.length <= 30 &&
    typeof v.rating === 'number' &&
    Number.isFinite(v.rating) &&
    v.rating >= 0 &&
    v.rating <= 200
  )
}

/** 전환 일정의 cutoverAt 날짜 부분(KST 기준)을 그대로 써서 고정 week_id를 만든다. */
function placementWeekId(): string {
  // '2026-09-04T00:00:00+09:00' -> 'placement-2026-09-04'
  const datePart = TRANSITION_SCHEDULE.cutoverAt.slice(0, 10)
  return `placement-${datePart}`
}

/**
 * 등급이 낮을수록(인덱스가 클수록) 실유저를 적게 태우고 AI 평점도 낮춘다
 * — 아래쪽 리그일수록 실유저가 약한 AI를 쉽게 이기고 쉽게 승격해서 기분
 * 좋게 시작하고, 위로 갈수록 실유저 비중과 상대 강도가 함께 오른다
 * (config.ts의 TIERS, 인덱스 0이 최상위).
 */
function buildMembers(realUsers: Required<RealUserInput>[], tier: number): MemberInput[] {
  const aiRating = TIERS[tier].aiBaseRating
  const taken = new Set(realUsers.map((u) => u.clubName))
  const members: MemberInput[] = realUsers.map((u, i) => ({
    slot: i,
    kind: 'user',
    userId: u.userId,
    clubName: u.clubName,
    badge: '',
    rating: Math.round(u.rating),
  }))

  let poolIndex = 0
  while (members.length < CLUB_COUNT) {
    const [name, badge] = CLUB_POOL[poolIndex % CLUB_POOL.length]
    poolIndex += 1
    if (taken.has(name)) continue
    taken.add(name)
    members.push({ slot: members.length, kind: 'ai', userId: null, clubName: name, badge, rating: aiRating })
  }
  return members
}

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405)

  const { url, anon, service } = env
  if (!url || !anon || !service) return json({ ok: false, reason: 'not configured' }, 500)

  const authorization = request.headers.get('Authorization') ?? ''
  if (!authorization) return refuse('not signed in')

  try {
    const whoami = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anon } })
    if (!whoami.ok) return refuse('not signed in')
    const user = (await whoami.json()) as { id?: string }
    if (!user?.id) return refuse('not signed in')

    // is_admin()은 auth.uid()를 보므로 서비스 키가 아니라 호출자 본인 토큰으로 불러야 한다.
    const adminCheck = await fetch(`${url}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { Authorization: authorization, apikey: anon, 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!adminCheck.ok || (await adminCheck.json()) !== true) return refuse('not admin')

    let body: GenerateRequest = {}
    try {
      body = await request.json()
    } catch {
      return refuse('bad request')
    }

    const tier = Number.isInteger(body.tier) ? (body.tier as number) : null
    if (tier === null || tier < 0 || tier >= TIER_COUNT) return refuse('bad tier', { tierCount: TIER_COUNT })

    const realUsersInput = Array.isArray(body.realUsers) ? body.realUsers : []
    const cap = TIERS[tier].maxRealUsers
    if (realUsersInput.length > cap) return refuse('too many real users for this tier', { max: cap })
    if (!realUsersInput.every(isRealUserInput)) return refuse('bad real user entry')
    const realUsers = realUsersInput as Required<RealUserInput>[]
    if (new Set(realUsers.map((u) => u.userId)).size !== realUsers.length) return refuse('duplicate real user')
    if (new Set(realUsers.map((u) => u.clubName)).size !== realUsers.length) return refuse('duplicate club name')

    const members = buildMembers(realUsers, tier)
    const weekId = placementWeekId()

    const server = { apikey: service, Authorization: `Bearer ${service}` }
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { ...server, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      })
      if (!res.ok) throw new Error(`${name} failed: ${await res.text()}`)
      return res.json()
    }

    // create_weekly_league_group always inserts a fresh row — re-running this
    // function (retry, or someone clicking twice) must not spawn a second
    // group for the same tier and week, or the same real user ends up in two
    // placement leagues. Look for an existing one first.
    const existingRes = await fetch(
      `${url}/rest/v1/weekly_league_groups?tier=eq.${tier}&week_id=eq.${encodeURIComponent(weekId)}&select=id&limit=1`,
      { headers: server },
    )
    if (!existingRes.ok) throw new Error(`group lookup failed: ${await existingRes.text()}`)
    const existingRows = (await existingRes.json()) as { id: number }[]

    const groupId =
      existingRows[0]?.id ??
      ((await rpc('create_weekly_league_group', {
        p_tier: tier,
        p_week_id: weekId,
        p_members: members,
      })) as number)

    const slotRows = toPlacementScheduleSlotRows(buildPlacementSlots())
    await rpc('seed_weekly_schedule_slots', { p_week_id: weekId, p_slots: slotRows })

    const competitions = (await rpc('seed_weekly_competitions', { p_group_id: groupId })) as Record<string, number>
    const placementCompetitionId = competitions.OPENING_PLACEMENT
    if (!placementCompetitionId) throw new Error('OPENING_PLACEMENT competition id missing')

    const clubIds = members.map((m) => String(m.slot))
    const clubIdToSlot = Object.fromEntries(clubIds.map((id, i) => [id, i]))
    const fixtures = generatePlacementFixtures(clubIds)
    const fixtureRows = toPlacementFixtureRows(fixtures, clubIdToSlot)
    const seeded = (await rpc('seed_league_fixtures', {
      p_group_id: groupId,
      p_competition_id: placementCompetitionId,
      p_fixtures: fixtureRows,
    })) as { inserted: number; reason?: string }

    return json({
      ok: true,
      groupId,
      weekId,
      competitions,
      members: members.length,
      fixturesInserted: seeded.inserted,
      alreadySeeded: seeded.reason === 'already seeded',
    })
  } catch (error) {
    return json({ ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) }, 500)
  }
}
