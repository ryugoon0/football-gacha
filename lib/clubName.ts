import { getSupabase } from './supabase'

export const CLUB_NAME_MIN = 2
export const CLUB_NAME_MAX = 20

/** Trim, collapse inner runs of spaces — the same shape the server compares on. */
export function normalizeClubName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Why a name cannot be used before the server is even asked, or null when it can. */
export function clubNameProblem(raw: string): string | null {
  const name = normalizeClubName(raw)
  if (name.length < CLUB_NAME_MIN) return `클럽명은 ${CLUB_NAME_MIN}자 이상이어야 합니다.`
  if (name.length > CLUB_NAME_MAX) return `클럽명은 ${CLUB_NAME_MAX}자까지입니다.`
  if (/[<>{}\[\]\\]/.test(name)) return '클럽명에 쓸 수 없는 문자가 있습니다.'
  return null
}

export type ClubNameCheck =
  | { status: 'available' }
  | { status: 'taken' }
  | { status: 'invalid'; message: string }
  | { status: 'error' }

/** Asks the server whether the name is free (works signed out — sign-up needs it). */
export async function checkClubName(raw: string): Promise<ClubNameCheck> {
  const problem = clubNameProblem(raw)
  if (problem) return { status: 'invalid', message: problem }
  const supabase = getSupabase()
  if (!supabase) return { status: 'available' }
  const { data, error } = await supabase.rpc('club_name_available', { p_name: normalizeClubName(raw) })
  if (error) return { status: 'error' }
  const result = data as { available?: boolean; reason?: string } | null
  if (result?.available === true) return { status: 'available' }
  if (result?.reason === 'length') return { status: 'invalid', message: clubNameProblem(raw) ?? '클럽명 길이를 확인해 주세요.' }
  return { status: 'taken' }
}
