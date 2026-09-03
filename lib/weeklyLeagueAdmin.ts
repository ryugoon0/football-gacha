import { getSupabase } from './supabase'

/**
 * Kicks off the opening placement league from the operator console. Mirrors
 * lib/onlineMatch.ts's calling convention — supabase-js attaches the
 * operator's own session token, which the function checks with is_admin()
 * before touching anything.
 */

export interface PlacementRealUserInput {
  userId: string
  clubName: string
  rating: number
}

export interface GeneratePlacementRequest {
  tier: number
  realUsers: PlacementRealUserInput[]
}

export type GeneratePlacementOutcome =
  | {
      ok: true
      groupId: number
      weekId: string
      members: number
      fixturesInserted: number
      alreadySeeded: boolean
    }
  | { ok: false; reason: string; detail?: string }

export async function generatePlacementLeague(
  request: GeneratePlacementRequest,
): Promise<GeneratePlacementOutcome> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.functions.invoke('generate-placement-league', { body: request })
    if (error) {
      const response = (error as { context?: Response })?.context
      let detail = error instanceof Error ? error.message : String(error)
      if (response && typeof response.json === 'function') {
        try {
          const body = (await response.clone().json()) as { reason?: string; detail?: string }
          return { ok: false, reason: body?.reason ?? 'unavailable', detail: body?.detail }
        } catch {
          // fall through to the generic message below
        }
      }
      return { ok: false, reason: 'unavailable', detail }
    }
    const body = data as GeneratePlacementOutcome
    if (!body?.ok) return { ok: false, reason: (body as { reason?: string })?.reason ?? 'unavailable' }
    return body
  } catch (error) {
    return { ok: false, reason: 'unavailable', detail: error instanceof Error ? error.message : String(error) }
  }
}
