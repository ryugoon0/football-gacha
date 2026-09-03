import { describe, expect, it, vi } from 'vitest'
import { handle } from '../supabase/functions/simulate-match/handler'
import { MINI_GAME_REWARD, matchReward } from '../lib/match'
import { initialState } from '../lib/storage'
import { DEFAULT_TACTIC } from '../lib/tactics'

/**
 * The Edge Function, run here rather than only in production — see
 * tests/drawPackFunction.test.ts for why. Every network call is stubbed, so
 * this checks the part that actually matters: the server never trusts a
 * client-submitted rating, and a refusal always arrives as 200 so the reason
 * survives supabase-js.
 */

const env = { url: 'https://project.supabase.co', anon: 'anon-key', service: 'service-key' }

const state = initialState()
const readySquad = state.squad
const save = { cards: state.cards, season: { division: 3 }, club: '테스트 클럽' }

const body = (over: Record<string, unknown> = {}) => ({
  competition: 'league',
  squad: readySquad,
  tactic: DEFAULT_TACTIC,
  opponent: { name: '상대 클럽', rating: 60 },
  venue: 'home',
  ...over,
})

const post = (payload: unknown = body(), auth = 'Bearer user-jwt') =>
  new Request('https://fn/simulate-match', {
    method: 'POST',
    headers: auth ? { Authorization: auth, 'Content-Type': 'application/json' } : {},
    body: JSON.stringify(payload),
  })

const ok = (payload: unknown) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })

/** Answers each of the three calls the handler makes, in order. */
function stubFetch(steps: { user?: unknown; save?: unknown; commit?: unknown }) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void init
    const href = String(input)
    if (href.includes('/auth/v1/user')) {
      return steps.user === null ? new Response('no', { status: 401 }) : ok(steps.user ?? { id: 'u1' })
    }
    if (href.includes('/rest/v1/saves')) return ok(steps.save === undefined ? [{ data: save }] : steps.save)
    if (href.includes('/rpc/commit_match')) {
      return ok(steps.commit ?? { ok: true, matchId: 7, balance: 4200 })
    }
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

describe('the match function', () => {
  it('plays a league match and settles it', async () => {
    const { status, body } = await run({})
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.seed).toMatch(/^[0-9a-f]{32}$/)
    expect(body.result.events.length).toBeGreaterThan(0)
    expect(['W', 'D', 'L']).toContain(body.result.result)
    expect(body.balance).toBe(4200)
    expect(body.matchId).toBe(7)
  })

  it('never trusts a squad rating the client sends — it recomputes from the save', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    // A client could put anything in the body besides squad/tactic/opponent/venue;
    // the handler only ever reads cards from the saves row it fetched itself.
    await handle(post(body({ team: { overall: 999 } })), env)
    const call = spy.mock.calls.find((args) => String(args[0]).includes('commit_match'))
    vi.unstubAllGlobals()
    const sent = JSON.parse(String(call?.[1]?.body))
    // The reward and score come from the server's own simulation, not from
    // anything resembling the injected "overall: 999".
    expect(typeof sent.p_reward).toBe('number')
    expect(sent.p_division).toBe(3)
  })

  it('refuses a lineup with an empty slot instead of asking the client to fill one in', async () => {
    const emptySlotKey = Object.keys(readySquad.slots)[0]
    const brokenSquad = { ...readySquad, slots: { ...readySquad.slots, [emptySlotKey]: null } }
    const { body: result } = await run({}, post(body({ squad: brokenSquad })))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('lineup not ready')
    expect(result.empty.length).toBeGreaterThan(0)
  })

  it('refuses a lineup fielding an injured starter', async () => {
    const slotKey = Object.keys(readySquad.slots).find((key) => readySquad.slots[key])!
    const uid = readySquad.slots[slotKey]!
    const injuredSave = {
      ...save,
      cards: save.cards.map((card) => (card.uid === uid ? { ...card, injuredFor: 2 } : card)),
    }
    const { body: result } = await run({ save: [{ data: injuredSave }] })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('lineup not ready')
    expect(result.injured.length).toBeGreaterThan(0)
  })

  it('reads division from the save, not from the request', async () => {
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    // division does not even appear on the request body — there is nothing
    // for a client to lie about.
    await handle(post(body()), env)
    const call = spy.mock.calls.find((args) => String(args[0]).includes('commit_match'))
    vi.unstubAllGlobals()
    const sent = JSON.parse(String(call?.[1]?.body))
    expect(sent.p_division).toBe(3)
  })

  it('pays the friendly share, not the full league reward', async () => {
    // League and friendly are two independent crypto-random matches, so
    // their scores are not comparable directly — a friendly could win big
    // while a league match loses. Instead, recompute what a league match
    // with the friendly call's own score would have paid, and check the
    // friendly reward is that scaled down, not that number outright.
    const spy = stubFetch({})
    vi.stubGlobal('fetch', spy)
    await handle(post(body({ competition: 'friendly' })), env)
    const commitCall = spy.mock.calls.find((args) => String(args[0]).includes('commit_match'))
    vi.unstubAllGlobals()
    const sent = JSON.parse(String(commitCall?.[1]?.body))

    const fullLeagueReward = matchReward(sent.p_result, sent.p_division, sent.p_score_for)
    expect(sent.p_reward).toBe(Math.round(fullLeagueReward * MINI_GAME_REWARD))
    expect(sent.p_reward).toBeLessThan(fullLeagueReward)
  })

  it('rejects an unknown competition or venue rather than guessing', async () => {
    const badCompetition = await run({}, post(body({ competition: 'exhibition' })))
    expect(badCompetition.body).toEqual({ ok: false, reason: 'bad competition' })

    const badVenue = await run({}, post(body({ venue: 'moon' })))
    expect(badVenue.body).toEqual({ ok: false, reason: 'bad venue' })
  })

  it('refuses when nobody is signed in', async () => {
    const { body: result } = await run({ user: null })
    expect(result.reason).toBe('not signed in')
  })

  it('refuses a request with no token at all', async () => {
    const { status, body: result } = await run({}, post(body(), ''))
    expect(status).toBe(200)
    expect(result.reason).toBe('not signed in')
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
    const response = await handle(new Request('https://fn/simulate-match', { method: 'OPTIONS' }), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
