import { getSupabase } from './supabase'
/** Community board rules that do not need a server to check. */

export const TITLE_MAX = 60
export const BODY_MAX = 2000
export const COMMENT_MAX = 500
export const NICKNAME_MAX = 16
export const PAGE_SIZE = 20

export interface Post {
  id: string
  userId: string
  nickname: string
  title: string
  body: string
  createdAt: string
  /** Operator announcements sit above ordinary posts. */
  notice: boolean
  /** Which patch log entries this notice covers. Empty for ordinary posts. */
  patchIds: string[]
}

/** Notices first, then newest first within each group. */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.notice !== b.notice) return a.notice ? -1 : 1
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  })
}

export interface Comment {
  id: string
  postId: string
  userId: string
  nickname: string
  body: string
  createdAt: string
}

export interface Draft {
  title: string
  body: string
}

export function validatePost(draft: Draft): string | null {
  const title = draft.title.trim()
  const body = draft.body.trim()
  if (!title) return '제목을 입력해 주세요.'
  if (title.length > TITLE_MAX) return `제목은 ${TITLE_MAX}자까지 쓸 수 있습니다.`
  if (!body) return '내용을 입력해 주세요.'
  if (body.length > BODY_MAX) return `내용은 ${BODY_MAX}자까지 쓸 수 있습니다.`
  if (containsProfanity(title) || containsProfanity(body)) return PROFANITY_MESSAGE
  return null
}

export function validateComment(body: string): string | null {
  const text = body.trim()
  if (!text) return '댓글을 입력해 주세요.'
  if (text.length > COMMENT_MAX) return `댓글은 ${COMMENT_MAX}자까지 쓸 수 있습니다.`
  if (containsProfanity(text)) return PROFANITY_MESSAGE
  return null
}

/** A club name makes a friendlier byline than an email address. */
export function nicknameFrom(club: string, email: string): string {
  const name = (club.trim() || email.split('@')[0] || '감독').slice(0, NICKNAME_MAX)
  return name
}

/** Relative time in Korean, falling back to a date for anything old. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((now.getTime() - then) / 1000)
  if (seconds < 60) return '방금'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

// ---------------------------------------------------------------------------
// 운영 — 욕설 필터, 신고, 차단
// ---------------------------------------------------------------------------

/**
 * Words a post or comment may not contain. A short list on purpose: it stops
 * the obvious, and the report button plus the operator's delete handle the
 * rest. Matched after stripping spaces and symbols, so "시 발" is caught too.
 */
const PROFANITY = ['시발', '씨발', '씨발', '병신', '개새끼', '좆', '지랄', '느금', '니미', '닥쳐', '엿먹', 'fuck', 'shit', 'bitch']

export function containsProfanity(text: string): boolean {
  // Strip spaces and punctuation only — \W would also strip Hangul.
  const flat = text.normalize('NFC').toLowerCase().replace(/[\s\p{P}\p{S}_]+/gu, '')
  return PROFANITY.some((word) => flat.includes(word.replace(/\s+/g, '')))
}

export const PROFANITY_MESSAGE = '욕설이나 비하 표현이 들어 있어 올릴 수 없습니다. 표현을 바꿔 주세요.'

export const REPORT_REASONS = ['욕설·비하', '광고·홍보', '개인정보 노출', '도배', '기타'] as const

export async function reportContent(target: { postId?: string; commentId?: string }, reason: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('report_content', {
    p_post_id: target.postId ?? null,
    p_comment_id: target.commentId ?? null,
    p_reason: reason,
  })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string } | null
  return body?.ok ? { ok: true } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

export const REPORT_FAILURE_MESSAGE: Record<string, string> = {
  offline: '서버에 연결되지 않았습니다.',
  unavailable: '신고를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'not signed in': '로그인이 풀렸습니다.',
  'own content': '내가 쓴 글은 신고할 수 없습니다. 삭제를 이용해 주세요.',
  'no reason': '신고 사유를 골라 주세요.',
}

/** Ids of the people I have blocked — their posts and comments are hidden on this screen. */
export async function fetchBlockedUsers(): Promise<Set<string>> {
  const supabase = getSupabase()
  if (!supabase) return new Set()
  const { data, error } = await supabase.from('user_blocks').select('blocked')
  if (error || !data) return new Set()
  return new Set((data as { blocked: string }[]).map((row) => row.blocked))
}

export async function blockUser(blocker: string, blocked: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || blocker === blocked) return false
  const { error } = await supabase.from('user_blocks').upsert({ blocker, blocked })
  return !error
}

export async function unblockUser(blocker: string, blocked: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { error } = await supabase.from('user_blocks').delete().eq('blocker', blocker).eq('blocked', blocked)
  return !error
}
