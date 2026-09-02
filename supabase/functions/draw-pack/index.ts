// 서버 권한 뽑기.
//
// 난수와 확률이 여기에 있습니다. 클라이언트는 "어느 팩을 열지"만 말하고,
// 무엇이 나왔는지는 서버가 정합니다. 그래야 고지한 확률이 실제와 같음을
// pull_log로 증명할 수 있습니다.
//
// 확률 로직은 이 파일에 다시 쓰지 않고 shared.js를 씁니다. 게임이 쓰는
// lib/gacha.ts에서 그대로 만들어진 번들이라, 확률이 한 벌뿐입니다.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PACKS, PITY_LIMIT, drawSession, featuredPlayer, packOf, pickupWeekKey } from './shared.js'

const GROUPS = ['GK', 'DF', 'MF', 'FW']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

/**
 * An answer the caller is meant to read.
 *
 * supabase-js turns any non-2xx into an error and throws the body away, so a
 * refusal sent as 402 or 409 reaches the game as "could not connect" — the one
 * thing it is not. Outcomes the player should hear about therefore go out as
 * 200 with ok:false, and a real status code is kept for real failures.
 */
const refuse = (reason: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, reason, ...extra })

/**
 * A generator backed by the platform's cryptographic randomness.
 *
 * Math.random is seeded per isolate and predictable enough that a determined
 * player could line up pulls. Money is involved, so the dice have to be real.
 * The seed is recorded with every pull so the result stays reproducible.
 */
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !service) return json({ ok: false, reason: 'not configured' }, 500)

  // Who is asking. The token is verified by Supabase, never parsed here.
  const authorization = request.headers.get('Authorization') ?? ''
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: auth } = await asUser.auth.getUser()
  const user = auth?.user
  if (!user) return refuse('not signed in')

  let body: { pack?: string; group?: string } = {}
  try {
    body = await request.json()
  } catch {
    // An empty body is fine; the defaults below cover it.
  }

  const packId = PACKS.some((item) => item.id === body.pack) ? body.pack : 'basic'
  const pack = packOf(packId)
  const group = body.group && GROUPS.includes(body.group) ? body.group : null

  // service_role: the only key allowed to settle a pull.
  const asServer = createClient(url, service)

  const { data: snapshot } = await asServer
    .from('economy')
    .select('pity, seeded')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!snapshot?.seeded) return refuse('not seeded')

  const pityBefore = snapshot.pity ?? 0
  const { rng, seed } = serverRng()
  const outcome = drawSession({
    count: pack.count,
    pity: pityBefore,
    featured: featuredPlayer(pickupWeekKey()),
    group,
    guarantee: pack.guarantee ?? null,
    rates: pack.rates,
    rng,
  })

  const cards = outcome.players.map((player) => ({
    id: player.id,
    name: player.name,
    rarity: player.rarity,
  }))

  // Gold, the log and the pity counter move together or not at all.
  const { data: result, error } = await asServer.rpc('commit_pull', {
    p_user: user.id,
    p_pack: pack.id,
    p_cost: pack.cost,
    p_seed: seed,
    p_rates: pack.rates,
    p_pity_before: pityBefore,
    p_pity_after: outcome.pity,
    p_pity_hit: outcome.pityHit,
    p_cards: cards,
  })

  if (error) return json({ ok: false, reason: 'commit failed', detail: error.message }, 500)
  if (!result?.ok) return refuse(result?.reason ?? 'refused', { balance: result?.balance })

  return json({
    ok: true,
    cards,
    pity: result.pity,
    pityLimit: PITY_LIMIT,
    pityHit: outcome.pityHit,
    balance: result.balance,
    pullId: result.pull_id,
  })
})
