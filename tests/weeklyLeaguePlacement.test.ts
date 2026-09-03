import { describe, expect, it } from 'vitest'
import {
  CLUB_COUNT,
  PLACEMENT_DAYS,
  PLACEMENT_ROUNDS,
  TRANSITION_SCHEDULE,
} from '../lib/weeklyLeague/config'
import {
  buildPlacementSlots,
  cupASeedFromPlacementStandings,
  generatePlacementFixtures,
  placementReward,
} from '../lib/weeklyLeague/placement'
import { toPlacementFixtureRows, toPlacementScheduleSlotRows } from '../lib/weeklyLeague/persistence'
import { standings } from '../lib/weeklyLeague/standings'

const clubIds = Array.from({ length: CLUB_COUNT }, (_, i) => `club-${i}`)

describe('absolute transition timestamps (요구사항 1, 2, 3, 23)', () => {
  it('cutoverAt is 2026-09-04 00:00 KST, which is 2026-09-03 15:00 UTC', () => {
    expect(TRANSITION_SCHEDULE.cutoverAt).toBe('2026-09-04T00:00:00+09:00')
    expect(new Date(TRANSITION_SCHEDULE.cutoverAt).toISOString()).toBe('2026-09-03T15:00:00.000Z')
  })

  it('firstMatchAt is 2026-09-04 09:00 KST', () => {
    expect(TRANSITION_SCHEDULE.firstMatchAt).toBe('2026-09-04T09:00:00+09:00')
  })

  it('endsAt (regular season start) is 2026-09-07 00:00 KST', () => {
    expect(TRANSITION_SCHEDULE.endsAt).toBe('2026-09-07T00:00:00+09:00')
  })

  it('schedules the first placement fixture at exactly firstMatchAt', () => {
    const rows = toPlacementScheduleSlotRows(buildPlacementSlots())
    expect(rows[0]).toMatchObject({ day: 'FRI', hour: 9 })
    expect(rows[0].scheduledAtUtc).toBe(new Date(TRANSITION_SCHEDULE.firstMatchAt).toISOString())
  })
})

describe('placement slots (요구사항 4, 5)', () => {
  const slots = buildPlacementSlots()

  it('has exactly 45 slots across Friday, Saturday, Sunday', () => {
    expect(slots).toHaveLength(45)
    expect(PLACEMENT_DAYS).toEqual(['FRI', 'SAT', 'SUN'])
  })

  it('runs 09:00 to 23:00 in one-hour steps each day', () => {
    for (const day of PLACEMENT_DAYS) {
      const hours = slots.filter((s) => s.day === day).map((s) => s.hour)
      expect(hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23])
    }
  })
})

describe('placement fixtures (요구사항 6, 7, 8, 9, 13, 14, 24)', () => {
  const fixtures = generatePlacementFixtures(clubIds)

  it('produces exactly 45 rounds of 8 matches each — 360 total', () => {
    expect(fixtures).toHaveLength(360)
    const rounds = new Map<number, number>()
    for (const f of fixtures) rounds.set(f.round, (rounds.get(f.round) ?? 0) + 1)
    expect(rounds.size).toBe(PLACEMENT_ROUNDS)
    for (const count of rounds.values()) expect(count).toBe(8)
  })

  it('gives every club exactly 45 matches', () => {
    const played = new Map<string, number>()
    for (const f of fixtures) {
      played.set(f.home, (played.get(f.home) ?? 0) + 1)
      played.set(f.away, (played.get(f.away) ?? 0) + 1)
    }
    for (const club of clubIds) expect(played.get(club)).toBe(45)
  })

  it('has every club meet every other club exactly 3 times', () => {
    for (const a of clubIds) {
      for (const b of clubIds) {
        if (a === b) continue
        const meetings = fixtures.filter((f) => (f.home === a && f.away === b) || (f.home === b && f.away === a)).length
        expect(meetings).toBe(3)
      }
    }
  })

  it('never fields a club against itself, and never double-books a slot', () => {
    expect(fixtures.every((f) => f.home !== f.away)).toBe(true)
    const byIndex = new Map<number, string[]>()
    for (const f of fixtures) {
      const clubs = byIndex.get(f.slot.index) ?? []
      clubs.push(f.home, f.away)
      byIndex.set(f.slot.index, clubs)
    }
    for (const clubs of byIndex.values()) expect(new Set(clubs).size).toBe(clubs.length)
  })

  it('is idempotent — regenerating from the same club order produces identical fixtures', () => {
    expect(generatePlacementFixtures(clubIds)).toEqual(fixtures)
  })
})

describe('home/away balance across the three cycles (요구사항 10, 11, 12)', () => {
  const fixtures = generatePlacementFixtures(clubIds)
  const cycle1 = fixtures.filter((f) => f.round < 15)
  const cycle2 = fixtures.filter((f) => f.round >= 15 && f.round < 30)

  it('mirrors cycle 1 and cycle 2 exactly (every pair swaps home/away)', () => {
    for (const f1 of cycle1) {
      const mirrored = cycle2.find((f2) => f2.home === f1.away && f2.away === f1.home)
      expect(mirrored).toBeDefined()
    }
  })

  it('gives every club 22 or 23 total home games, split 8-and-8', () => {
    const homeCount = new Map(clubIds.map((c) => [c, 0]))
    for (const f of fixtures) homeCount.set(f.home, (homeCount.get(f.home) ?? 0) + 1)

    const counts = clubIds.map((c) => homeCount.get(c)!)
    expect(counts.every((n) => n === 22 || n === 23)).toBe(true)
    expect(counts.filter((n) => n === 23)).toHaveLength(8)
    expect(counts.filter((n) => n === 22)).toHaveLength(8)
    // sanity: total home games across all clubs equals total matches.
    expect(counts.reduce((a, b) => a + b, 0)).toBe(360)
  })
})

describe('placement RPC row mapping', () => {
  it('maps every fixture to a slot number with an absolute UTC time', () => {
    const clubIdToSlot = Object.fromEntries(clubIds.map((id, i) => [id, i]))
    const fixtures = generatePlacementFixtures(clubIds)
    const rows = toPlacementFixtureRows(fixtures, clubIdToSlot)
    expect(rows).toHaveLength(360)
    expect(new Date(rows[0].scheduledAtUtc).toISOString()).toBe(new Date(TRANSITION_SCHEDULE.firstMatchAt).toISOString())
  })
})

describe('placement competition rules (요구사항 15, 16, 17, 18, 19)', () => {
  it('applies a 0.5 reward multiplier', () => {
    expect(placementReward(1000)).toBe(500)
    expect(TRANSITION_SCHEDULE.rewardMultiplier).toBe(0.5)
  })

  it('has promotion, relegation and cups disabled for the transition window', () => {
    expect(TRANSITION_SCHEDULE.promotionEnabled).toBe(false)
    expect(TRANSITION_SCHEDULE.relegationEnabled).toBe(false)
    expect(TRANSITION_SCHEDULE.cupEnabled).toBe(false)
  })

  it('hands the placement standings straight to Cup A seeding, best club first', () => {
    const fixtures = generatePlacementFixtures(clubIds)
    const matches = fixtures.map((f) => ({ home: f.home, away: f.away, homeGoals: f.home === clubIds[0] ? 3 : 0, awayGoals: 0 }))
    const table = standings(clubIds, matches)
    const ranked = table.map((r) => r.club)
    const seed = cupASeedFromPlacementStandings(ranked)
    expect(seed[0]).toBe(table[0].club)
    expect(seed).toHaveLength(16)
  })
})
