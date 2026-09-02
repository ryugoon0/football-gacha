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
}

export type DrawFailure =
  | 'offline'
  | 'not signed in'
  | 'not enough gold'
  | 'not seeded'
  | 'unavailable'

export function serverDrawAvailable(): boolean {
  return isSupabaseConfigured()
}

type DrawResult = { ok: true; draw: ServerDraw } | { ok: false; reason: DrawFailure }

async function askServer(pack: string, group: string | null): Promise<DrawResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('draw-pack', {
      body: { pack, group },
    })
    if (error) return { ok: false, reason: 'unavailable' }

    const result = data as (ServerDraw & { ok?: boolean; reason?: string }) | null
    if (!result?.ok) {
      const reason = result?.reason
      if (reason === 'not enough gold' || reason === 'not seeded' || reason === 'not signed in') {
        return { ok: false, reason }
      }
      return { ok: false, reason: 'unavailable' }
    }
    return { ok: true, draw: result }
  } catch {
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
): Promise<DrawResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { ok: false, reason: 'not signed in' }

  const first = await askServer(pack, group)
  if (first.ok || first.reason !== 'not seeded' || !opening) return first

  // Every existing player crosses onto the ledger exactly once, and that one
  // call can fail on a dropped connection. Without this retry they would be
  // told to wait forever — a reload was the only way out. seed_economy only
  // ever acts once, so asking again costs nothing.
  const seeded = await seedEconomy(opening.gold, opening.pity)
  if (!seeded) return first
  return askServer(pack, group)
}

export const DRAW_FAILURE_MESSAGE: Record<DrawFailure, string> = {
  offline: '서버에 연결되지 않아 뽑기를 진행할 수 없습니다.',
  'not signed in': '로그인이 풀렸습니다. 다시 로그인한 뒤 뽑아 주세요.',
  'not enough gold': '골드가 부족합니다.',
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
