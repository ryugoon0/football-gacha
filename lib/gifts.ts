import { ITEMS, type ItemId } from './items'
import { getSupabase } from './supabase'

/**
 * Operator gifts — a message with gold and items, sent to one manager, to
 * everyone, or to managers picked by activity (supabase/migrations/
 * 20260906010000_gifts.sql). The recipient collects it from the 선물함;
 * the server records the gold in the ledger and the client adds it to the
 * save, the same shape as weekly league rewards.
 */

export type GiftTarget =
  | { kind: 'all' }
  | { kind: 'users'; userIds: string[] }
  /** Managers whose save was last written more than `days` days ago. */
  | { kind: 'inactive'; days: number }
  /** Managers who played within the last `days` days. */
  | { kind: 'active'; days: number }
  /** Accounts created within the last `days` days. */
  | { kind: 'new'; days: number }
  /** Every account created from now on, the moment it is created (auth.users trigger). Replaces the previous welcome gift. */
  | { kind: 'welcome' }

export const GIFT_TARGET_LABEL: Record<GiftTarget['kind'], string> = {
  all: '전체 유저',
  users: '특정 유저',
  inactive: '접속 안 한 지 N일 이상',
  active: '최근 N일 안에 접속',
  new: '가입 N일 이내',
  welcome: '신규 가입자 (가입 때 자동)',
}

export function describeTarget(target: GiftTarget): string {
  switch (target.kind) {
    case 'welcome':
      return '신규 가입자 — 가입하는 순간 자동'
    case 'all':
      return '전체 유저'
    case 'users':
      return `특정 유저 ${target.userIds.length}명`
    case 'inactive':
      return `접속 안 한 지 ${target.days}일 이상`
    case 'active':
      return `최근 ${target.days}일 안에 접속`
    case 'new':
      return `가입 ${target.days}일 이내`
  }
}

export interface GiftRow {
  inboxId: number
  giftId: number
  title: string
  message: string
  gold: number
  items: Record<string, number>
  createdAt: string
  claimedAt: string | null
  expiresAt: string | null
}

/** Items in a gift as the reducer wants them — unknown ids dropped here so the count shown matches what lands. */
export function giftItemLines(items: Record<string, number> | null | undefined): { id: ItemId; count: number }[] {
  return Object.entries(items ?? {})
    .filter((entry): entry is [ItemId, number] => entry[0] in ITEMS && Number(entry[1]) > 0)
    .map(([id, count]) => ({ id, count: Math.floor(Number(count)) }))
}

export async function fetchMyGifts(): Promise<GiftRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('my_gifts')
  if (error || !Array.isArray(data)) return []
  return (data as GiftRow[]).map((row) => ({ ...row, items: row.items && typeof row.items === 'object' ? row.items : {} }))
}

export async function claimGifts(
  inboxIds?: number[],
): Promise<{ ok: true; count: number; gold: number; items: { id: ItemId; count: number }[] } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('claim_gifts', { p_inbox_ids: inboxIds ?? null })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string; count?: number; gold?: number; items?: Record<string, number> } | null
  if (!body?.ok) return { ok: false, reason: body?.reason ?? 'unavailable' }
  return { ok: true, count: Number(body.count ?? 0), gold: Number(body.gold ?? 0), items: giftItemLines(body.items) }
}

// ---------------------------------------------------------------------------
// Operator side
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  user_id: string
  email: string | null
  club: string
  last_seen_at: string | null
  created_at: string
}

export async function findUsersForGift(query: string): Promise<AdminUserRow[]> {
  const supabase = getSupabase()
  if (!supabase || !query.trim()) return []
  const { data, error } = await supabase.rpc('find_users_for_admin', { p_query: query.trim() })
  if (error || !Array.isArray(data)) return []
  return data as AdminUserRow[]
}

/** How many managers a target reaches right now; null when the server could not say. */
export async function giftAudienceCount(target: GiftTarget): Promise<number | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('gift_audience_count_for_admin', { p_target: target })
  if (error || typeof data !== 'number' || data < 0) return null
  return data
}

export interface SendGiftInput {
  title: string
  message: string
  gold: number
  items: Record<string, number>
  target: GiftTarget
  expiresAt?: string | null
}

export async function sendGift(input: SendGiftInput): Promise<{ ok: true; giftId: number; recipients: number } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('send_gift', {
    p_title: input.title,
    p_message: input.message,
    p_gold: Math.max(0, Math.floor(input.gold)),
    p_items: input.items,
    p_target: input.target,
    p_expires_at: input.expiresAt ?? null,
  })
  if (error) return { ok: false, reason: error.message }
  const body = data as { ok?: boolean; reason?: string; giftId?: number; recipients?: number } | null
  if (!body?.ok) return { ok: false, reason: body?.reason ?? 'unavailable' }
  return { ok: true, giftId: Number(body.giftId), recipients: Number(body.recipients ?? 0) }
}

export interface AdminGiftRow {
  id: number
  title: string
  message: string
  gold: number
  items: Record<string, number>
  target: GiftTarget
  recipients: number
  claimed: number
  created_at: string
  expires_at: string | null
}

export async function fetchGiftsForAdmin(): Promise<AdminGiftRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('gifts_for_admin')
  if (error || !Array.isArray(data)) return []
  return data as AdminGiftRow[]
}

export const GIFT_FAILURE_MESSAGE: Record<string, string> = {
  offline: '서버에 연결되지 않았습니다.',
  unavailable: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'not signed in': '로그인이 풀렸습니다.',
  'not an operator': '운영자 계정이 아닙니다.',
  'empty gift': '골드나 아이템 중 하나는 넣어야 합니다.',
  'no recipients': '조건에 맞는 유저가 없습니다.',
  'bad items': '아이템 목록 형식이 잘못됐습니다.',
}
