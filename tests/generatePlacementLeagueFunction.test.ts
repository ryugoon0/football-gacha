import { describe, expect, it, vi } from 'vitest'
import { handle } from '../supabase/functions/generate-placement-league/handler'
import { TIERS, TIER_COUNT } from '../lib/weeklyLeague/config'

const env = { url: 'https://project.supabase.co', anon: 'anon-key', service: 'service-key' }

const body = (over: Record<string, unknown> = {}) => ({
  tier: 0,
  realUsers: [{ userId: 'u1', clubName: '내 클럽', rating: 65 }],
  ...over,
})

const post = (payload: unknown = body(), auth = 'Bearer admin-jwt') =>
  new Request('https://fn/generate-placement-league', {
    method: 'POST',
    headers: auth ? { Authorization: auth, 'Content-Type': 'application/json' } : {},
    body: JSON.stringify(payload),
  })

const ok = (payload: unknown) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })

/** Answers the calls the handler makes, in order they might arrive. */
function stubFetch(steps: {
  user?: unknown
  isAdmin?: boolean
  existingGroup?: { id: number }[]
  groupId?: number
  competitions?: Record<string, number>
  seedResult?: unknown
}) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const href = String(input)
    if (href.includes('/auth/v1/user')) {
      return steps.user === null ? new Response('no', { status: 401 }) : ok(steps.user ?? { id: 'admin1' })
    }
    if (href.includes('/rpc/is_admin')) {
      return ok(steps.isAdmin ?? true)
    }
    if (href.includes('/weekly_league_groups?')) {
      return ok(steps.existingGroup ?? [])
    }
    if (href.includes('/rpc/create_weekly_league_group')) {
      return ok(steps.groupId ?? 42)
    }
    if (href.includes('/rpc/seed_weekly_schedule_slots')) {
      return ok({ ok: true, inserted: 45 })
    }
    if (href.includes('/rpc/seed_weekly_competitions')) {
      return ok(
        steps.competitions ?? { OPENING_PLACEMENT: 1, LEAGUE: 2, CUP_A: 3, CUP_B: 4, MASTERS_FINAL: 5 },
      )
    }
    if (href.includes('/rpc/seed_league_fixtures')) {
      return ok(steps.seedResult ?? { ok: true, inserted: 360 })
    }
    void init
    throw new Error(`unexpected call: ${href}`)
  })
}

const run = async (steps: Parameters<typeof stubFetch>[0], request = post()) => {
  vi.stubGlobal('fetch', stubFetch(steps))
  const response = await handle(request, env)
  const json = await response.json()
  vi.unstubAllGlobals()
  return { status: response.status, body: json }
}

describe('the placement league generation function', () => {
  it('builds a full 16-club placement league and seeds it', async () => {
    const { status, body: result } = await run({})
    expect(status).toBe(200)
    expect(result.ok).toBe(true)
    expect(result.groupId).toBe(42)
    expect(result.members).toBe(16)
    expect(result.fixturesInserted).toBe(360)
  })

  it('fills the remaining slots with AI clubs when fewer real users are given', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    await handle(post(body({ realUsers: [{ userId: 'u1', clubName: '내 클럽', rating: 65 }] })), env)
    const call = spy.mock.calls.find((args) => String(args[0]).includes('create_weekly_league_group'))
    vi.unstubAllGlobals()
    const sent = JSON.parse(String(call?.[1]?.body))
    expect(sent.p_members).toHaveLength(16)
    expect(sent.p_members[0]).toMatchObject({ kind: 'user', userId: 'u1', clubName: '내 클럽' })
    expect(sent.p_members.slice(1).every((m: { kind: string }) => m.kind === 'ai')).toBe(true)
  })

  it('gives AI clubs the tier-specific base rating, not a flat number', async () => {
    for (const tier of [0, TIER_COUNT - 1]) {
      const spy = stubFetch({})
      vi.stubGlobal('fetch', spy)
      await handle(post(body({ tier, realUsers: [] })), env)
      const call = spy.mock.calls.find((args) => String(args[0]).includes('create_weekly_league_group'))
      vi.unstubAllGlobals()
      const sent = JSON.parse(String(call?.[1]?.body))
      expect(sent.p_members.every((m: { rating: number }) => m.rating === TIERS[tier].aiBaseRating)).toBe(true)
    }
    // The top tier's AI is meant to be tougher than the bottom tier's.
    expect(TIERS[0].aiBaseRating).toBeGreaterThan(TIERS[TIER_COUNT - 1].aiBaseRating)
  })

  it('caps real users tighter for lower tiers than for the top tier', async () => {
    expect(TIERS[0].maxRealUsers).toBeGreaterThan(TIERS[TIER_COUNT - 1].maxRealUsers)

    const bottomTier = TIER_COUNT - 1
    const oneTooMany = Array.from({ length: TIERS[bottomTier].maxRealUsers + 1 }, (_, i) => ({
      userId: `u${i}`,
      clubName: `club-${i}`,
      rating: 60,
    }))
    const { body: result } = await run({}, post(body({ tier: bottomTier, realUsers: oneTooMany })))
    expect(result.reason).toBe('too many real users for this tier')
  })

  it('rejects a tier outside the configured range', async () => {
    const { body: result } = await run({}, post(body({ tier: TIER_COUNT })))
    expect(result.reason).toBe('bad tier')
  })

  it('never spawns a second group for a tier/week that already has one', async () => {
    const spy = stubFetch({ existingGroup: [{ id: 7 }] })
    vi.stubGlobal('fetch', spy)
    const response = await handle(post(), env)
    const result = await response.json()
    vi.unstubAllGlobals()
    expect(result.groupId).toBe(7)
    expect(spy.mock.calls.some((args) => String(args[0]).includes('create_weekly_league_group'))).toBe(false)
  })

  it('refuses a non-admin caller', async () => {
    const { body: result } = await run({ isAdmin: false })
    expect(result.reason).toBe('not admin')
  })

  it('refuses when nobody is signed in', async () => {
    const { body: result } = await run({ user: null })
    expect(result.reason).toBe('not signed in')
  })

  it('refuses a request with no token at all', async () => {
    const { body: result } = await run({}, post(body(), ''))
    expect(result.reason).toBe('not signed in')
  })

  it('rejects a negative or missing tier', async () => {
    const bad = await run({}, post(body({ tier: -1 })))
    expect(bad.body.ok).toBe(false)
    expect(bad.body.reason).toBe('bad tier')
    const missing = await run({}, post(body({ tier: undefined })))
    expect(missing.body.ok).toBe(false)
    expect(missing.body.reason).toBe('bad tier')
  })

  it('rejects more real users than the tier cap allows', async () => {
    const tooMany = Array.from({ length: TIERS[0].maxRealUsers + 1 }, (_, i) => ({
      userId: `u${i}`,
      clubName: `club-${i}`,
      rating: 60,
    }))
    const { body: result } = await run({}, post(body({ tier: 0, realUsers: tooMany })))
    expect(result.reason).toBe('too many real users for this tier')
  })

  it('rejects a duplicate user id or club name among real users', async () => {
    const dupeUser = [
      { userId: 'u1', clubName: 'A', rating: 60 },
      { userId: 'u1', clubName: 'B', rating: 60 },
    ]
    expect((await run({}, post(body({ realUsers: dupeUser })))).body.reason).toBe('duplicate real user')

    const dupeClub = [
      { userId: 'u1', clubName: 'A', rating: 60 },
      { userId: 'u2', clubName: 'A', rating: 60 },
    ]
    expect((await run({}, post(body({ realUsers: dupeClub })))).body.reason).toBe('duplicate club name')
  })

  it('rejects a malformed real user entry', async () => {
    const { body: result } = await run({}, post(body({ realUsers: [{ userId: 'u1' }] })))
    expect(result.reason).toBe('bad real user entry')
  })

  it('never lets an exception escape as a blank failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network is down') }))
    const response = await handle(post(), env)
    const result = await response.json()
    vi.unstubAllGlobals()
    expect(result.reason).toBe('crashed')
    expect(result.detail).toContain('network is down')
  })

  it('says so plainly when the platform gave it no keys', async () => {
    const response = await handle(post(), { url: '', anon: '', service: '' })
    expect(await response.json()).toMatchObject({ reason: 'not configured' })
  })

  it('answers the browser preflight', async () => {
    const response = await handle(new Request('https://fn/generate-placement-league', { method: 'OPTIONS' }), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
