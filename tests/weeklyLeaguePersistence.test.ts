import { describe, expect, it } from 'vitest'
import { CLUB_COUNT } from '../lib/weeklyLeague/config'
import { buildWeeklySlots, generateLeagueFixtures, leagueSlots } from '../lib/weeklyLeague/schedule'
import { createCupBracket, fixturesForCurrentStage } from '../lib/weeklyLeague/cup'
import {
  toCupStageTieRows,
  toLeagueFixtureRows,
  toMemberRows,
  toScheduleSlotRows,
  weekStartUtcMs,
} from '../lib/weeklyLeague/persistence'

// 2026-09-07은 실제로 월요일이다 — KST 자정 UTC 변환이 맞는지 확인하는 데 씀.
const MONDAY = { year: 2026, month: 9, day: 7 }
const weekStart = weekStartUtcMs(MONDAY)

const clubIds = Array.from({ length: CLUB_COUNT }, (_, i) => `club-${i}`)
const clubIdToSlot = Object.fromEntries(clubIds.map((id, i) => [id, i]))

describe('weekStartUtcMs', () => {
  it('converts 2026-09-07 00:00 KST to the matching UTC instant', () => {
    // KST 자정 = 전날 UTC 15:00.
    expect(new Date(weekStart).toISOString()).toBe('2026-09-06T15:00:00.000Z')
  })
})

describe('toScheduleSlotRows', () => {
  const rows = toScheduleSlotRows(weekStart, buildWeeklySlots())

  it('produces 105 rows with distinct, ascending scheduled times', () => {
    expect(rows).toHaveLength(105)
    for (let i = 1; i < rows.length; i++) {
      expect(new Date(rows[i].scheduledAtUtc).getTime()).toBeGreaterThan(new Date(rows[i - 1].scheduledAtUtc).getTime())
    }
  })

  it('places Monday 09:00 KST fixture at the week start', () => {
    expect(rows[0]).toMatchObject({ day: 'MON', hour: 9 })
    expect(new Date(rows[0].scheduledAtUtc).getTime()).toBe(weekStart + 9 * 3_600_000)
  })

  it('places Sunday 23:00 (Masters Final) exactly 6 days 14 hours after the week start', () => {
    const last = rows[rows.length - 1]
    expect(last).toMatchObject({ day: 'SUN', hour: 23, type: 'MASTERS_FINAL' })
    expect(new Date(last.scheduledAtUtc).getTime()).toBe(weekStart + 6 * 86_400_000 + 23 * 3_600_000)
  })
})

describe('toMemberRows', () => {
  it('accepts exactly 16 unique slots', () => {
    const members = clubIds.map((clubName, slot) => ({
      slot,
      kind: 'ai' as const,
      userId: null,
      clubName,
      badge: '',
      rating: 60,
    }))
    expect(toMemberRows(members)).toHaveLength(16)
  })

  it('rejects a duplicate slot', () => {
    const members = clubIds.map((clubName, slot) => ({
      slot: slot === 15 ? 0 : slot,
      kind: 'ai' as const,
      userId: null,
      clubName,
      badge: '',
      rating: 60,
    }))
    expect(() => toMemberRows(members)).toThrow(/duplicate slot/)
  })
})

describe('toLeagueFixtureRows', () => {
  const fixtures = generateLeagueFixtures(clubIds)
  const rows = toLeagueFixtureRows(weekStart, fixtures, clubIdToSlot)

  it('maps every fixture to a slot number and keeps the count', () => {
    expect(rows).toHaveLength(fixtures.length)
    for (const row of rows) {
      expect(row.homeSlot).toBeGreaterThanOrEqual(0)
      expect(row.awaySlot).toBeGreaterThanOrEqual(0)
    }
  })

  it('schedules round 0 at the first league slot', () => {
    const firstLeagueSlot = leagueSlots()[0]
    const round0 = rows.filter((r) => r.round === 0)
    const expected = weekStart + ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].indexOf(firstLeagueSlot.day) * 86_400_000 + firstLeagueSlot.hour * 3_600_000
    for (const row of round0) expect(new Date(row.scheduledAtUtc).getTime()).toBe(expected)
  })

  it('throws on an unknown club id', () => {
    const bad = [{ round: 0, slot: leagueSlots()[0], home: 'nope', away: clubIds[1] }]
    expect(() => toLeagueFixtureRows(weekStart, bad as never, clubIdToSlot)).toThrow(/unknown club id/)
  })
})

describe('toCupStageTieRows', () => {
  const bracket = createCupBracket(clubIds)
  const rows = toCupStageTieRows(weekStart, 'CUP_A', fixturesForCurrentStage(bracket), clubIdToSlot, buildWeeklySlots())

  it('produces one row per R16 tie with both legs scheduled', () => {
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.leg1ScheduledAtUtc).toBeTruthy()
      expect(row.leg2ScheduledAtUtc).toBeTruthy()
      expect(new Date(row.leg2ScheduledAtUtc!).getTime()).toBeGreaterThan(new Date(row.leg1ScheduledAtUtc).getTime())
    }
  })

  it('schedules Cup A R16 leg 1 on Tuesday 14:00 KST', () => {
    const expected = weekStart + 1 * 86_400_000 + 14 * 3_600_000 // TUE = index 1
    expect(new Date(rows[0].leg1ScheduledAtUtc).getTime()).toBe(expected)
  })

  it('has no leg 2 time for the final (single leg)', () => {
    // A FINAL-stage bracket built directly, rather than played out — only
    // the row shape (no leg2 time) matters for this check.
    const finalBracket = {
      stage: 'FINAL' as const,
      ties: [
        {
          id: 'FINAL-0',
          stage: 'FINAL' as const,
          homeSeed: clubIds[0],
          awaySeed: clubIds[1],
          leg1: null,
          leg2: null,
          winner: null,
          decidedBy: null,
        },
      ],
      history: [],
      champion: null,
    }
    const finalRows = toCupStageTieRows(weekStart, 'CUP_A', fixturesForCurrentStage(finalBracket), clubIdToSlot, buildWeeklySlots())
    expect(finalRows).toHaveLength(1)
    expect(finalRows[0].leg2ScheduledAtUtc).toBeUndefined()
  })
})
