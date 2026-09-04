import { describe, expect, it } from 'vitest'
import { clubNameProblem, normalizeClubName } from '../lib/clubName'

describe('club names', () => {
  it('normalises whitespace the way the server compares', () => {
    expect(normalizeClubName('  한강   유나이티드 ')).toBe('한강 유나이티드')
  })

  it('rejects names that are too short, too long, or carry markup', () => {
    expect(clubNameProblem('a')).toContain('2자')
    expect(clubNameProblem('가'.repeat(21))).toContain('20자')
    expect(clubNameProblem('<script>')).toContain('쓸 수 없는')
    expect(clubNameProblem('서울 캐피탈')).toBeNull()
  })
})
