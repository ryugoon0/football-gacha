import { describe, expect, it } from 'vitest'
import {
  BODY_MAX,
  COMMENT_MAX,
  TITLE_MAX,
  nicknameFrom,
  timeAgo,
  validateComment,
  validatePost,
} from '../lib/board'

describe('board rules', () => {
  it('needs a title and a body', () => {
    expect(validatePost({ title: '', body: '내용' })).toMatch('제목')
    expect(validatePost({ title: '제목', body: '   ' })).toMatch('내용')
    expect(validatePost({ title: '제목', body: '내용' })).toBeNull()
  })

  it('caps the length of everything', () => {
    expect(validatePost({ title: 'ㄱ'.repeat(TITLE_MAX + 1), body: '내용' })).toMatch('제목')
    expect(validatePost({ title: '제목', body: 'ㄱ'.repeat(BODY_MAX + 1) })).toMatch('내용')
    expect(validateComment('ㄱ'.repeat(COMMENT_MAX + 1))).toMatch('댓글')
    expect(validateComment('좋은 글이네요')).toBeNull()
  })

  it('bylines with the club name, falling back to the email', () => {
    expect(nicknameFrom('내 클럽 FC', 'me@example.com')).toBe('내 클럽 FC')
    expect(nicknameFrom('  ', 'me@example.com')).toBe('me')
    expect(nicknameFrom('가'.repeat(40), 'me@example.com')).toHaveLength(16)
  })

  it('reads times the way a person would say them', () => {
    const now = new Date('2026-09-01T12:00:00Z')
    expect(timeAgo('2026-09-01T11:59:30Z', now)).toBe('방금')
    expect(timeAgo('2026-09-01T11:30:00Z', now)).toBe('30분 전')
    expect(timeAgo('2026-09-01T05:00:00Z', now)).toBe('7시간 전')
    expect(timeAgo('2026-08-30T12:00:00Z', now)).toBe('2일 전')
    expect(timeAgo('not a date', now)).toBe('')
  })
})

describe('욕설 필터', () => {
  it('blocks obvious profanity even when spaced or dressed up, and leaves ordinary text alone', async () => {
    const { containsProfanity, validatePost, validateComment, PROFANITY_MESSAGE } = await import('../lib/board')
    expect(containsProfanity('진짜 시발 왜 이래')).toBe(true)
    expect(containsProfanity('시 발')).toBe(true)
    expect(containsProfanity('FUCK this')).toBe(true)
    expect(containsProfanity('오늘 경기 정말 재밌었어요')).toBe(false)
    expect(validateComment('병신같은 팀')).toBe(PROFANITY_MESSAGE)
    expect(validatePost({ title: '좋은 경기', body: '수고했어요' })).toBeNull()
  })
})
