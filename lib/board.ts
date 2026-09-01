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
  return null
}

export function validateComment(body: string): string | null {
  const text = body.trim()
  if (!text) return '댓글을 입력해 주세요.'
  if (text.length > COMMENT_MAX) return `댓글은 ${COMMENT_MAX}자까지 쓸 수 있습니다.`
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
