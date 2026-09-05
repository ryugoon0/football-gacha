import { getSupabase, isSupabaseConfigured } from './supabase'

/**
 * Opening a pack on the server.
 *
 * Once there is an account, the pack is opened by the Edge Function: the dice
 * and the odds live there and every pull is logged, which is what lets us show
 * players a rate and prove it. There is deliberately **no fallback** — if the
 * server cannot be reached the pull fails. A quiet fall back to the browser
 * would be exactly the way around the server we just built.
 *
 * With no server configured at all there is no account and no economy to
 * protect, so the browser draws as before.
 */

export interface ServerDraw {
  cards: { id: string; rarity: string }[]
  pity: number
  pityHit: boolean
  balance: number
  /** 프리미엄 스카우트 티켓 left on the server after this pull, when the server reports it. */
  tickets?: number
}

export type DrawFailure =
  | 'offline'
  | 'not signed in'
  | 'not enough gold'
  | 'not enough tickets'
  | 'ticket not allowed'
  | 'not seeded'
  | 'unavailable'

/** What pays for the pull: gold from the ledger, or 프리미엄 스카우트 티켓 from the server balance. */
export type PayWith = 'gold' | 'ticket'

export function serverDrawAvailable(): boolean {
  return isSupabaseConfigured()
}

type DrawResult = { ok: true; draw: ServerDraw } | { ok: false; reason: DrawFailure }

const KNOWN: DrawFailure[] = ['not enough gold', 'not enough tickets', 'ticket not allowed', 'not seeded', 'not signed in']

function known(reason: unknown): DrawFailure | null {
  return KNOWN.find((item) => item === reason) ?? null
}

/**
 * The reason hidden inside a failed invoke.
 *
 * supabase-js turns any non-2xx into an error and drops the body, so without
 * digging it out every refusal looks like "could not connect". The body is on
 * the error's response, when there is one.
 */
async function reasonFromError(error: unknown): Promise<{ reason: string | null; detail: string }> {
  const response = (error as { context?: Response })?.context
  const message = error instanceof Error ? error.message : String(error)
  if (!response || typeof response.json !== 'function') return { reason: null, detail: message }
  try {
    const body = (await response.clone().json()) as { reason?: string; detail?: string }
    return { reason: body?.reason ?? null, detail: body?.detail ?? body?.reason ?? message }
  } catch {
    return { reason: null, detail: `${response.status} ${message}` }
  }
}

/** Set when a pull fails for a reason worth reporting, so it can be pasted back. */
export let lastDrawDetail = ''

async function askServer(pack: string, group: string | null, payWith: PayWith): Promise<DrawResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('draw-pack', {
      body: { pack, group, payWith },
    })

    if (error) {
      const dug = await reasonFromError(error)
      lastDrawDetail = dug.detail
      const match = known(dug.reason)
      return { ok: false, reason: match ?? 'unavailable' }
    }

    const result = data as (ServerDraw & { ok?: boolean; reason?: string }) | null
    if (!result?.ok) {
      lastDrawDetail = result?.reason ?? '알 수 없는 응답'
      return { ok: false, reason: known(result?.reason) ?? 'unavailable' }
    }
    lastDrawDetail = ''
    return { ok: true, draw: result }
  } catch (error) {
    lastDrawDetail = error instanceof Error ? error.message : String(error)
    return { ok: false, reason: 'unavailable' }
  }
}

export async function drawOnServer(
  pack: string,
  group: string | null,
  /**
   * The save's gold and pity, used only to move an existing player onto the
   * ledger if that has not happened yet.
   */
  opening?: { gold: number; pity: number },
  payWith: PayWith = 'gold',
): Promise<DrawResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { ok: false, reason: 'not signed in' }

  const first = await askServer(pack, group, payWith)
  if (first.ok || first.reason !== 'not seeded' || !opening) return first

  // Every existing player crosses onto the ledger exactly once, and that one
  // call can fail on a dropped connection. Without this retry they would be
  // told to wait forever — a reload was the only way out. seed_economy only
  // ever acts once, so asking again costs nothing.
  const seeded = await seedEconomy(opening.gold, opening.pity)
  if (!seeded) return first
  return askServer(pack, group, payWith)
}

/** How many 프리미엄 스카우트 티켓 this account holds on the server; null when it cannot be read. */
export async function fetchScoutTickets(): Promise<number | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return null
  const { data, error } = await supabase.from('scout_tickets').select('balance').eq('user_id', userId).maybeSingle()
  if (error) return null
  return Number((data as { balance?: number } | null)?.balance ?? 0)
}

export const DRAW_FAILURE_MESSAGE: Record<DrawFailure, string> = {
  offline: '서버에 연결되지 않아 뽑기를 진행할 수 없습니다.',
  'not signed in': '로그인이 풀렸습니다. 다시 로그인한 뒤 뽑아 주세요.',
  'not enough gold': '골드가 부족합니다.',
  'not enough tickets': '프리미엄 스카우트 티켓이 부족합니다.',
  'ticket not allowed': '티켓은 프리미엄 스카우트에만 쓸 수 있습니다.',
  'not seeded': '계정 준비가 아직 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.',
  unavailable: '뽑기 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

/** Moves an existing player onto the server ledger. Safe to call every sign-in. */
export async function seedEconomy(gold: number, pity: number): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.rpc('seed_economy', {
    p_gold: Math.max(0, Math.floor(gold)),
    p_pity: Math.max(0, Math.floor(pity)),
  })
  if (error) return false
  return Boolean((data as { ok?: boolean } | null)?.ok)
}

/** Asks the pull server whether it is reachable and this account is ready. */
export async function probeDrawServer(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) return '서버가 설정되지 않았습니다.'
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return '로그인이 필요합니다.'

  try {
    const { data, error } = await supabase.functions.invoke('draw-pack', { body: { probe: true } })
    if (error) {
      const dug = await reasonFromError(error)
      return `연결 실패 — ${dug.detail}`
    }
    const result = data as { ok?: boolean; seeded?: boolean; pity?: number; reason?: string } | null
    if (!result?.ok) return `서버가 거절 — ${result?.reason ?? '알 수 없음'}`
    return result.seeded
      ? `정상 · 계정 준비됨 · 천장 카운터 ${result.pity ?? 0}`
      : '연결은 되지만 이 계정이 아직 원장으로 옮겨지지 않았습니다. 뽑기를 한 번 시도하면 자동으로 옮겨집니다.'
  } catch (error) {
    return `연결 실패 — ${error instanceof Error ? error.message : String(error)}`
  }
}
