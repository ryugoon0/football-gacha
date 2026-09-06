import { describe, expect, it } from 'vitest'
import { calendarEvents, dayKeyKst, upcoming, weekStartKst, weeklyLeagueEvents } from '../lib/calendar'

describe('이벤트 캘린더', () => {
  it('finds Monday 00:00 KST for any moment of the week', () => {
    const wed = Date.parse('2026-09-09T15:30:00+09:00')
    expect(weekStartKst(wed)).toBe(Date.parse('2026-09-07T00:00:00+09:00'))
    const sunLate = Date.parse('2026-09-13T23:59:00+09:00')
    expect(weekStartKst(sunLate)).toBe(Date.parse('2026-09-07T00:00:00+09:00'))
    expect(weekStartKst(Date.parse('2026-09-14T00:00:00+09:00'))).toBe(Date.parse('2026-09-14T00:00:00+09:00'))
  })

  it('lays the cup rounds, hot times and the season close over a week', () => {
    const start = Date.parse('2026-09-07T00:00:00+09:00')
    const events = weeklyLeagueEvents(start)
    expect(events.filter((e) => e.kind === 'cup').map((e) => e.title)).toContain('Masters Final')
    expect(events.filter((e) => e.kind === 'hot')).toHaveLength(14)
    expect(dayKeyKst(events.find((e) => e.kind === 'reward')!.startMs)).toBe('2026-09-13')
    const cupA = events.find((e) => e.title === 'Cup A 16강 1차전')!
    expect(dayKeyKst(cupA.startMs)).toBe('2026-09-08')
  })

  it('keeps today and the horizon, drops yesterday', () => {
    const now = Date.parse('2026-09-09T12:00:00+09:00')
    const list = upcoming(calendarEvents(now), now, 7)
    expect(list.every((e) => e.endMs >= Date.parse('2026-09-09T00:00:00+09:00'))).toBe(true)
    expect(list.every((e) => e.startMs <= now + 7 * 86_400_000)).toBe(true)
    expect(list.some((e) => e.kind === 'limited')).toBe(true)
  })
})
