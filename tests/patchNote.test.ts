import { describe, expect, it } from 'vitest'
import { BODY_MAX, sortPosts, TITLE_MAX, type Post } from '../lib/board'
import { PATCH_LOG, patchEntry, sortedPatchLog, type PatchEntry } from '../lib/patchLog'
import { buildPatchNote, defaultNoteTitle, publishedIds, validateNote } from '../lib/patchNote'

const entry = (over: Partial<PatchEntry> = {}): PatchEntry => ({
  id: 'x',
  date: '2026-09-02',
  kind: 'feature',
  title: '무언가 추가',
  ...over,
})

describe('patch log', () => {
  it('has a unique id for every entry — notices point at these', () => {
    const ids = PATCH_LOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is sorted newest first', () => {
    const dates = sortedPatchLog().map((item) => item.date)
    expect([...dates].sort((a, b) => (a < b ? 1 : -1))).toEqual(dates)
  })

  it('finds an entry by id and reports a missing one', () => {
    expect(patchEntry(PATCH_LOG[0].id)?.title).toBe(PATCH_LOG[0].title)
    expect(patchEntry('nope')).toBeNull()
  })
})

describe('building a patch note', () => {
  it('groups the chosen entries by kind, in a fixed order', () => {
    const { body } = buildPatchNote([
      entry({ id: 'a', kind: 'fix', title: '버그 수정' }),
      entry({ id: 'b', kind: 'feature', title: '기능 추가' }),
      entry({ id: 'c', kind: 'balance', title: '밸런스 조정' }),
    ])

    expect(body.indexOf('■ 추가')).toBeLessThan(body.indexOf('■ 조정'))
    expect(body.indexOf('■ 조정')).toBeLessThan(body.indexOf('■ 수정'))
  })

  it('writes detail lines under their entry', () => {
    const { body } = buildPatchNote([entry({ detail: ['첫 줄', '둘째 줄'] })])
    expect(body).toContain('· 무언가 추가')
    expect(body).toContain('   - 첫 줄')
    expect(body).toContain('   - 둘째 줄')
  })

  it('only writes up the entries it was given — the rest stay internal', () => {
    const { body } = buildPatchNote([entry({ id: 'a', title: '고른 것' })])
    expect(body).toContain('고른 것')
    expect(body).not.toContain('고르지 않은 것')
  })

  it('falls back to a dated title and respects a custom one', () => {
    expect(defaultNoteTitle([entry({ date: '2026-09-02' })])).toBe('[패치 노트] 2026-09-02')
    expect(buildPatchNote([entry()], '  9월 업데이트  ').title).toBe('9월 업데이트')
  })

  it('trims a title and body that would be rejected by the board', () => {
    const long = Array.from({ length: 40 }, (_, i) =>
      entry({ id: `e${i}`, title: '아주 긴 제목'.repeat(20) }),
    )
    const note = buildPatchNote(long, 'x'.repeat(TITLE_MAX + 40))
    expect(note.title.length).toBeLessThanOrEqual(TITLE_MAX)
    expect(note.body.length).toBeLessThanOrEqual(BODY_MAX)
    expect(validateNote(note, long.length)).toBeNull()
  })

  it('refuses to publish nothing', () => {
    expect(validateNote(buildPatchNote([]), 0)).toContain('하나 이상')
  })

  it('knows which entries players have already been told about', () => {
    const seen = publishedIds([{ patchIds: ['a', 'b'] }, { patchIds: ['b', 'c'] }])
    expect([...seen].sort()).toEqual(['a', 'b', 'c'])
    expect(publishedIds([]).size).toBe(0)
  })
})

describe('the board', () => {
  const post = (over: Partial<Post>): Post => ({
    id: 'p',
    userId: 'u',
    nickname: '감독',
    title: '글',
    body: '내용',
    createdAt: '2026-09-01T00:00:00Z',
    notice: false,
    patchIds: [],
    ...over,
  })

  it('puts notices above ordinary posts, newest first inside each group', () => {
    const sorted = sortPosts([
      post({ id: 'old-post', createdAt: '2026-09-01T00:00:00Z' }),
      post({ id: 'new-post', createdAt: '2026-09-03T00:00:00Z' }),
      post({ id: 'old-notice', notice: true, createdAt: '2026-08-30T00:00:00Z' }),
      post({ id: 'new-notice', notice: true, createdAt: '2026-09-02T00:00:00Z' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual([
      'new-notice',
      'old-notice',
      'new-post',
      'old-post',
    ])
  })
})
