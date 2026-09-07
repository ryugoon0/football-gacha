import { describe, expect, it, vi } from 'vitest'
import { handle } from '../supabase/functions/draw-pack/handler'

/**
 * The Edge Function, run here rather than only in production.
 *
 * Every network call it makes is stubbed, so this checks the part that has
 * actually been going wrong: which answers come back, and with what status.
 * A refusal must arrive as 200 with ok:false — supabase-js drops the body of
 * anything else, and the player is told "could not connect" instead.
 */

const env = { url: 'https://project.supabase.co', anon: 'anon-key', service: 'service-key' }

const post = (body: unknown = { pack: 'basic' }, auth = 'Bearer user-jwt') =>
  new Request('https://fn/draw-pack', {
    method: 'POST',
    headers: auth ? { Authorization: auth, 'Content-Type': 'application/json' } : {},
    body: JSON.stringify(body),
  })

const ok = (payload: unknown) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })

/** Answers each of the three calls the handler makes, in order. */
function stubFetch(steps: { user?: unknown; economy?: unknown; commit?: unknown; saves?: unknown; fusion?: unknown }) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void init
    const href = String(input)
    if (href.includes('/auth/v1/user')) {
      return steps.user === null ? new Response('no', { status: 401 }) : ok(steps.user ?? { id: 'u1' })
    }
    if (href.includes('/rest/v1/economy')) return ok(steps.economy ?? [{ pity: 3, seeded: true }])
    if (href.includes('/rest/v1/saves')) return ok(steps.saves ?? [])
    if (href.includes('/rpc/record_world_fusion')) return ok(steps.fusion ?? { ok: true, balance: 1 })
    if (href.includes('/rpc/commit_pull')) {
      return ok(steps.commit ?? { ok: true, balance: 2700, pity: 4, pull_id: 9 })
    }
    throw new Error(`unexpected call: ${href}`)
  })
}

const run = async (steps: Parameters<typeof stubFetch>[0], request = post()) => {
  vi.stubGlobal('fetch', stubFetch(steps))
  const response = await handle(request, env)
  const body = await response.json()
  vi.unstubAllGlobals()
  return { status: response.status, body }
}

describe('the pull function', () => {
  it('opens a pack and settles it', async () => {
    const { status, body } = await run({})
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.cards).toHaveLength(1)
    expect(body.cards[0]).toHaveProperty('rarity')
    expect(body.balance).toBe(2700)
  })

  it('answers every refusal with 200 so the reason survives the client', async () => {
    // This is the bug that reached players: supabase-js turns a 402 or 409
    // into an error and drops the body, so the reason never arrives.
    const notSeeded = await run({ economy: [] })
    expect(notSeeded.status).toBe(200)
    expect(notSeeded.body).toEqual({ ok: false, reason: 'not seeded' })

    const broke = await run({ commit: { ok: false, reason: 'not enough gold', balance: 10 } })
    expect(broke.status).toBe(200)
    expect(broke.body.reason).toBe('not enough gold')

    const anonymous = await run({ user: null })
    expect(anonymous.status).toBe(200)
    expect(anonymous.body.reason).toBe('not signed in')
  })

  it('refuses a request with no token at all', async () => {
    const { status, body } = await run({}, post({ pack: 'basic' }, ''))
    expect(status).toBe(200)
    expect(body.reason).toBe('not signed in')
  })

  it('never lets an exception escape as a blank failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network is down') }))
    const response = await handle(post(), env)
    const body = await response.json()
    vi.unstubAllGlobals()
    expect(body.reason).toBe('crashed')
    expect(body.detail).toContain('network is down')
  })

  it('says so plainly when the platform gave it no keys', async () => {
    const response = await handle(post(), { url: '', anon: '', service: '' })
    expect(await response.json()).toMatchObject({ reason: 'not configured' })
  })

  it('falls back to the basic pack rather than trusting the body', async () => {
    const { body } = await run({}, post({ pack: 'a-pack-that-does-not-exist' }))
    expect(body.ok).toBe(true)
    expect(body.cards).toHaveLength(1)
  })

  it('opens a ten pull when asked for one', async () => {
    const { body } = await run({}, post({ pack: 'basicTen' }))
    expect(body.cards).toHaveLength(10)
  })

  it('sends the server seed and the rates in force to be recorded', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    await handle(post(), env)
    const call = spy.mock.calls.find((args) => String(args[0]).includes('commit_pull'))
    vi.unstubAllGlobals()
    expect(call).toBeDefined()
    const sent = JSON.parse(String(call?.[1]?.body))
    expect(sent.p_seed).toMatch(/^[0-9a-f]{32}$/)
    expect(sent.p_rates).toBeTruthy()
    expect(sent.p_pity_before).toBe(3)
  })

  it('uses the service key for the database and never the caller token', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    await handle(post(), env)
    const dbCalls = spy.mock.calls.filter((args) => String(args[0]).includes('/rest/v1/'))
    vi.unstubAllGlobals()
    expect(dbCalls.length).toBeGreaterThan(0)
    for (const args of dbCalls) {
      const headers = args[1]?.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer service-key')
    }
  })

  it('answers the browser preflight', async () => {
    const response = await handle(new Request('https://fn/draw-pack', { method: 'OPTIONS' }), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('the 월드 pack and 월드 fusion', () => {
  it('opens the 월드 pack only with a pack, and never for gold', async () => {
    const refused = await run({}, post({ pack: 'world' }))
    expect(refused.body.reason).toBe('pack not allowed')
    const withShards = await run({ commit: { ok: true, balance: 100, pity: 0, pull_id: 2, worldPacks: 0 } }, post({ pack: 'world', payWith: 'shards' }))
    expect(withShards.body.ok).toBe(true)
    const wrong = await run({}, post({ pack: 'premium', payWith: 'worldPack' }))
    expect(wrong.body.reason).toBe('pack not allowed')
    const spy = stubFetch({ commit: { ok: true, balance: 100, pity: 0, pull_id: 1, worldPacks: 0 } })
    vi.stubGlobal('fetch', spy)
    const body = await (await handle(post({ pack: 'world', payWith: 'worldPack' }), env)).json()
    const call = spy.mock.calls.find((args) => String(args[0]).includes('commit_pull'))
    vi.unstubAllGlobals()
    expect(body.ok).toBe(true)
    expect(['Live', 'World']).toContain(body.cards[0].rarity)
    const sent = JSON.parse(String(call?.[1]?.body))
    expect(sent.p_cost).toBe(0)
    expect(sent.p_world_packs).toBe(1)
  })

  it('fuses three 월드 cards from the save into a pack and refuses anything else', async () => {
    const { PLAYERS } = await import('../lib/players')
    const world = PLAYERS.filter((p) => p.rarity === 'World').slice(0, 3)
    const plat = PLAYERS.find((p) => p.rarity === 'Live')!
    const saves = [{ data: { cards: [...world.map((p, i) => ({ uid: `w${i}`, playerId: p.id })), { uid: 'p0', playerId: plat.id }] } }]
    const good = await run({ saves }, post({ action: 'fuse_world', uids: ['w0', 'w1', 'w2'] }))
    expect(good.body).toMatchObject({ ok: true, worldPacks: 1 })
    const notWorld = await run({ saves }, post({ action: 'fuse_world', uids: ['w0', 'w1', 'p0'] }))
    expect(notWorld.body.reason).toBe('not world')
    const missing = await run({ saves }, post({ action: 'fuse_world', uids: ['w0', 'w1', 'zz'] }))
    expect(missing.body.reason).toBe('card not in save')
    const two = await run({ saves }, post({ action: 'fuse_world', uids: ['w0', 'w1', 'w1'] }))
    expect(two.body.reason).toBe('need three')
  })
})

describe('checking the function without spending anything', () => {
  it('reports reachability and readiness, and never opens a pack', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    const response = await handle(post({ probe: true }), env)
    const body = await response.json()
    const settled = spy.mock.calls.some((args) => String(args[0]).includes('commit_pull'))
    vi.unstubAllGlobals()

    expect(body).toMatchObject({ ok: true, probe: true, seeded: true })
    expect(body.cards).toBeUndefined()
    expect(settled).toBe(false)
  })

  it('says a player is not on the ledger yet without refusing', async () => {
    const spy = stubFetch({ economy: [] })
    vi.stubGlobal('fetch', spy)
    const body = await (await handle(post({ probe: true }), env)).json()
    vi.unstubAllGlobals()
    expect(body).toMatchObject({ ok: true, probe: true, seeded: false })
  })
})
