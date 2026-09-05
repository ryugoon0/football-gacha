// 서버 권한 뽑기.
//
// 난수와 확률이 여기에 있습니다. 클라이언트는 "어느 팩을 열지"만 말하고,
// 무엇이 나왔는지는 서버가 정합니다. 그래야 고지한 확률이 실제와 같음을
// pull_log로 증명할 수 있습니다.
//
// 확률 로직은 이 파일에 다시 쓰지 않고 shared.js를 씁니다. 게임이 쓰는
// lib/gacha.ts에서 그대로 만들어진 번들이라, 확률이 한 벌뿐입니다.
//
// 바깥에서 가져오는 모듈이 하나도 없습니다. supabase-js를 쓰면 편하지만
// jsr:·npm:·esm.sh 중 무엇이 이 런타임에서 되는지는 배포해 봐야 알 수 있고,
// 모듈을 못 불러오면 함수가 뜨지도 못한 채 "연결 실패"만 남깁니다. Deno에
// 이미 있는 fetch로 REST를 직접 부르면 그 불확실성이 통째로 사라집니다.
import { KNOB_KEYS, PACKS, PITY_LIMIT, drawSession, featuredPlayer, packOf, pickupWeekKey, setTuning } from './shared.js'

const GROUPS = ['GK', 'DF', 'MF', 'FW']

/** The three secrets the platform hands the function at runtime. */
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

/**
 * An answer the caller is meant to read.
 *
 * supabase-js turns any non-2xx into an error and throws the body away, so a
 * refusal sent as 402 or 409 reaches the game as "could not connect" — the one
 * thing it is not. Outcomes the player should hear about go out as 200 with
 * ok:false; a real status code is kept for real failures.
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

    let body: { pack?: string; group?: string; probe?: boolean; payWith?: string } = {}
    try {
      body = await request.json()
    } catch {
      // An empty body is fine; the defaults below cover it.
    }

    // The odds are operator knobs (game_config); read them before the roll so
    // the table the player sees is the table this pull uses.
    try {
      const configRes = await fetch(`${url}/rest/v1/game_config?select=key,value`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
      })
      if (configRes.ok) {
        const rows = (await configRes.json()) as { key: string; value: number | string }[]
        const known = new Set<string>(KNOB_KEYS)
        const values: Record<string, number> = {}
        for (const row of rows) {
          const value = typeof row.value === 'string' ? Number(row.value) : row.value
          if (known.has(row.key) && Number.isFinite(value)) values[row.key] = value
        }
        setTuning(values)
      }
    } catch {
      // Unreachable config means the compiled defaults roll — same as the client shows when offline.
    }

    const packId = PACKS.some((item) => item.id === body.pack) ? (body.pack as string) : 'basic'
    const pack = packOf(packId)
    const group = body.group && GROUPS.includes(body.group) ? body.group : null
    // 프리미엄 스카우트 티켓: a server-side balance (scout_tickets) that stands in
    // for the gold. One ticket per card, premium packs only; commit_pull takes
    // the tickets in the same transaction as the log and the pity counter.
    const payWithTickets = body.payWith === 'ticket'
    if (payWithTickets && pack.family !== 'premium') return refuse('ticket not allowed')
    const ticketCost = payWithTickets ? pack.count : 0
    const goldCost = payWithTickets ? 0 : pack.cost

    // service_role: the only key allowed to read the counter and settle a pull.
    const server = { apikey: service, Authorization: `Bearer ${service}` }

    const economy = await fetch(
      `${url}/rest/v1/economy?user_id=eq.${user.id}&select=pity,seeded`,
      { headers: server },
    )
    if (!economy.ok) {
      return json({ ok: false, reason: 'economy read failed', detail: await economy.text() }, 500)
    }
    const rows = (await economy.json()) as { pity?: number; seeded?: boolean }[]
    const snapshot = rows[0]

    // A check that costs nothing. Without it the only way to find out whether
    // the function is reachable is to spend gold on a pull that may fail.
    if (body.probe) {
      return json({
        ok: true,
        probe: true,
        seeded: Boolean(snapshot?.seeded),
        pity: snapshot?.pity ?? 0,
        pack: pack.id,
      })
    }

    if (!snapshot?.seeded) return refuse('not seeded')

    const pityBefore = snapshot.pity ?? 0
    const { rng, seed } = serverRng()
    // The server clock decides 리미티드 windows and the week's pick-up — never the device's.
    const nowMs = Date.now()
    const outcome = drawSession({
      count: pack.count,
      pity: pityBefore,
      featured: featuredPlayer(pickupWeekKey(new Date(nowMs)), nowMs),
      group,
      guarantee: pack.guarantee ?? null,
      rates: pack.rates,
      rng,
      nowMs,
    })

    const cards = outcome.players.map((player) => ({
      id: player.id,
      name: player.name,
      rarity: player.rarity,
    }))

    // Gold, the log and the pity counter move together or not at all.
    const settle = await fetch(`${url}/rest/v1/rpc/commit_pull`, {
      method: 'POST',
      headers: { ...server, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user: user.id,
        p_pack: pack.id,
        p_cost: goldCost,
        p_seed: seed,
        p_rates: pack.rates,
        p_pity_before: pityBefore,
        p_pity_after: outcome.pity,
        p_pity_hit: outcome.pityHit,
        p_cards: cards,
        p_tickets: ticketCost,
      }),
    })

    if (!settle.ok) {
      return json({ ok: false, reason: 'commit failed', detail: await settle.text() }, 500)
    }
    const result = (await settle.json()) as {
      ok?: boolean
      reason?: string
      balance?: number
      tickets?: number
      pity?: number
      pull_id?: number
    }
    if (!result?.ok) return refuse(result?.reason ?? 'refused', { balance: result?.balance, tickets: result?.tickets })

    return json({
      ok: true,
      cards,
      pity: result.pity,
      pityLimit: PITY_LIMIT,
      pityHit: outcome.pityHit,
      balance: result.balance,
      tickets: result.tickets,
      pullId: result.pull_id,
    })
  } catch (error) {
    // Never let an exception reach the player as a bare 500 with no clue in it.
    return json(
      { ok: false, reason: 'crashed', detail: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
}
