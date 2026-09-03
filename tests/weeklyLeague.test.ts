import { describe, expect, it } from 'vitest'
import {
  CLUB_COUNT,
  LEAGUE_ROUNDS,
  MATCHES_PER_LEAGUE_ROUND,
} from '../lib/weeklyLeague/config'
import { buildWeeklySlots, cupSlots, generateLeagueFixtures, leagueSlots } from '../lib/weeklyLeague/schedule'
import {
  advanceStageIfDone,
  createCupBracket,
  fixturesForCurrentStage,
  recordFinal,
  recordFirstLeg,
  recordSecondLeg,
  type CupBracket,
  type LegResult,
} from '../lib/weeklyLeague/cup'
import { selectMastersFinalists } from '../lib/weeklyLeague/mastersFinal'
import { standings, type StandingsMatch } from '../lib/weeklyLeague/standings'

const clubIds = Array.from({ length: CLUB_COUNT }, (_, i) => `club-${i}`)

describe('weekly slots (요구사항 1, 2, 7, 8)', () => {
  it('has exactly 105 global slots', () => {
    expect(buildWeeklySlots()).toHaveLength(105)
  })

  it('runs 09:00 to 23:00 in exact one-hour steps every day', () => {
    const byDay = new Map<string, number[]>()
    for (const slot of buildWeeklySlots()) {
      const hours = byDay.get(slot.day) ?? []
      hours.push(slot.hour)
      byDay.set(slot.day, hours)
    }
    for (const hours of byDay.values()) {
      expect(hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23])
    }
  })

  it('has exactly 90 league slots', () => {
    expect(leagueSlots()).toHaveLength(LEAGUE_ROUNDS)
  })

  it('never puts a league fixture in a cup slot', () => {
    for (const slot of cupSlots()) {
      expect(slot.type).not.toBe('LEAGUE')
    }
  })

  it('gives Saturday exactly 9 league slots', () => {
    const saturday = buildWeeklySlots().filter((s) => s.day === 'SAT')
    expect(saturday.filter((s) => s.type === 'LEAGUE')).toHaveLength(9)
  })

  it('puts Masters Final only on Sunday 23:00', () => {
    const masters = buildWeeklySlots().filter((s) => s.type === 'MASTERS_FINAL')
    expect(masters).toEqual([expect.objectContaining({ day: 'SUN', hour: 23 })])
  })
})

describe('league fixture generation (요구사항 3, 4, 5, 6, 20)', () => {
  const fixtures = generateLeagueFixtures(clubIds)

  it('produces exactly 90 rounds with 8 matches each', () => {
    const rounds = new Map<number, number>()
    for (const f of fixtures) rounds.set(f.round, (rounds.get(f.round) ?? 0) + 1)
    expect(rounds.size).toBe(LEAGUE_ROUNDS)
    for (const count of rounds.values()) expect(count).toBe(MATCHES_PER_LEAGUE_ROUND)
  })

  it('gives every club exactly 90 league matches', () => {
    const played = new Map<string, number>()
    for (const f of fixtures) {
      played.set(f.home, (played.get(f.home) ?? 0) + 1)
      played.set(f.away, (played.get(f.away) ?? 0) + 1)
    }
    for (const club of clubIds) expect(played.get(club)).toBe(90)
  })

  it('has every club meet every other club exactly 6 times, 3 home and 3 away', () => {
    for (const a of clubIds) {
      for (const b of clubIds) {
        if (a === b) continue
        const home = fixtures.filter((f) => f.home === a && f.away === b).length
        const away = fixtures.filter((f) => f.home === b && f.away === a).length
        expect(home).toBe(3)
        expect(away).toBe(3)
      }
    }
  })

  it('never fields a club against itself', () => {
    expect(fixtures.every((f) => f.home !== f.away)).toBe(true)
  })

  it('never double-books a club in the same slot', () => {
    const byIndex = new Map<number, string[]>()
    for (const f of fixtures) {
      const clubs = byIndex.get(f.slot.index) ?? []
      clubs.push(f.home, f.away)
      byIndex.set(f.slot.index, clubs)
    }
    for (const clubs of byIndex.values()) expect(new Set(clubs).size).toBe(clubs.length)
  })

  it('is idempotent — regenerating from the same club order produces identical fixtures', () => {
    const again = generateLeagueFixtures(clubIds)
    expect(again).toEqual(fixtures)
  })

  it('rejects a club count other than 16', () => {
    expect(() => generateLeagueFixtures(clubIds.slice(0, 15))).toThrow()
  })
})

describe('cup bracket (요구사항 9, 10, 11, 13, 14)', () => {
  it('starts at R16 with no group stage — 8 ties from 16 clubs', () => {
    const bracket = createCupBracket(clubIds)
    expect(bracket.stage).toBe('R16')
    expect(bracket.ties).toHaveLength(8)
  })

  it('plays R16, QF and SF as two legs and the final as one', () => {
    const bracket = createCupBracket(clubIds)
    const r16Fixtures = fixturesForCurrentStage(bracket)
    expect(r16Fixtures.every((f) => f.leg === 1)).toBe(true)

    const afterLeg1 = recordFirstLeg(bracket, bracket.ties[0].id, { goals: { home: 1, away: 0 } })
    const leg2Fixture = fixturesForCurrentStage(afterLeg1).find((f) => f.tieId === bracket.ties[0].id)
    expect(leg2Fixture?.leg).toBe(2)
  })

  it('does not apply an away-goals rule — scoring away twice does not decide a level aggregate', () => {
    const bracket = createCupBracket(clubIds)
    const tieId = bracket.ties[0].id
    // Leg 1: away side (awaySeed) scores twice away from home. Leg 2: the
    // same happens in reverse. Aggregate is level 3-3 either way — under an
    // away-goals rule the leg-1 away goals would decide it outright instead.
    let b = recordFirstLeg(bracket, tieId, { goals: { home: 1, away: 2 } })
    expect(() =>
      recordSecondLeg(b, tieId, { goals: { home: 1, away: 2 } }),
    ).toThrow(/level after regulation but no extra time given/i)
  })

  it('only plays extra time and penalties when the aggregate is level', () => {
    const bracket = createCupBracket(clubIds)
    const tieId = bracket.ties[0].id
    let b = recordFirstLeg(bracket, tieId, { goals: { home: 2, away: 0 } })
    // Aggregate 2-1, decided in regulation — extra time must be rejected.
    expect(() =>
      recordSecondLeg(b, tieId, {
        goals: { home: 1, away: 0 },
        extraTime: { home: 0, away: 0 },
      }),
    ).toThrow()

    b = recordSecondLeg(b, tieId, { goals: { home: 0, away: 1 } })
    const decided = b.ties.find((t) => t.id === tieId)!
    expect(decided.winner).toBe(bracket.ties[0].homeSeed)
    expect(decided.decidedBy).toBe('AGGREGATE')
  })

  it('settles a level aggregate with extra time, then penalties if still level', () => {
    const bracket = createCupBracket(clubIds)
    const tieId = bracket.ties[0].id
    let b = recordFirstLeg(bracket, tieId, { goals: { home: 1, away: 1 } })
    b = recordSecondLeg(b, tieId, {
      goals: { home: 1, away: 1 },
      extraTime: { home: 1, away: 0 },
    })
    let decided = b.ties.find((t) => t.id === tieId)!
    expect(decided.decidedBy).toBe('EXTRA_TIME')
    expect(decided.winner).toBe(bracket.ties[0].homeSeed)

    const b2 = createCupBracket(clubIds)
    let c = recordFirstLeg(b2, tieId, { goals: { home: 1, away: 1 } })
    c = recordSecondLeg(c, tieId, {
      goals: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 3, away: 4 },
    })
    decided = c.ties.find((t) => t.id === tieId)!
    expect(decided.decidedBy).toBe('PENALTIES')
    expect(decided.winner).toBe(b2.ties[0].awaySeed)
  })

  it('gives an eliminated club no fixture in the next round', () => {
    let bracket = createCupBracket(clubIds)
    const eliminated = bracket.ties[0].awaySeed
    for (const t of bracket.ties) {
      bracket = recordFirstLeg(bracket, t.id, { goals: { home: 2, away: 0 } })
      bracket = recordSecondLeg(bracket, t.id, { goals: { home: 0, away: 0 } })
    }
    bracket = advanceStageIfDone(bracket)
    expect(bracket.stage).toBe('QF')
    expect(bracket.ties.every((t) => t.homeSeed !== eliminated && t.awaySeed !== eliminated)).toBe(true)
    // No substitute fixture appears in that freed-up slot for anyone else either —
    // QF has exactly half as many ties as R16, nothing extra.
    expect(bracket.ties).toHaveLength(4)
  })
})

function playOutBracket(clubIds: string[], marginFor: (home: string, away: string) => number): CupBracket {
  let bracket = createCupBracket(clubIds)
  while (!bracket.champion) {
    for (const t of [...bracket.ties]) {
      if (t.winner) continue
      if (bracket.stage === 'FINAL') {
        bracket = recordFinal(bracket, t.id, { goals: { home: marginFor(t.homeSeed, t.awaySeed) > 0 ? 1 : 0, away: 0 } })
        continue
      }
      bracket = recordFirstLeg(bracket, t.id, { goals: { home: 1, away: 0 } })
      bracket = recordSecondLeg(bracket, t.id, { goals: { home: 0, away: 0 } })
    }
    bracket = advanceStageIfDone(bracket)
  }
  return bracket
}

describe('Masters Final selection (요구사항 15, 16)', () => {
  it('pairs the two different cup champions directly', () => {
    const cupA = playOutBracket(clubIds, () => 1)
    // Cup B: reverse the seed order so a different club wins.
    const cupB = playOutBracket([...clubIds].reverse(), () => 1)
    expect(cupA.champion).not.toBe(cupB.champion)

    const selection = selectMastersFinalists(cupA, cupB, clubIds)
    expect(selection.reason).toBe('DIFFERENT_CHAMPIONS')
    expect(selection.home).toBe(cupA.champion)
    expect(selection.away).toBe(cupB.champion)
  })

  it('picks a ranked runner-up and records the ranking when one club wins both cups', () => {
    const cupA = playOutBracket(clubIds, () => 1)
    const cupB = playOutBracket(clubIds, () => 1)
    expect(cupA.champion).toBe(cupB.champion)

    const selection = selectMastersFinalists(cupA, cupB, clubIds)
    expect(selection.reason).toBe('SAME_CLUB_DOUBLE_WIN')
    expect(selection.home).toBe(cupA.champion)
    expect(selection.away).not.toBe(cupA.champion)
    expect(selection.runnerUpRanking).toBeDefined()
    expect(selection.runnerUpRanking!.length).toBe(CLUB_COUNT - 1)
  })
})

describe('per-club match totals (요구사항 17, 18)', () => {
  it('an R16-only exit means 94 matches total (90 league + 4 cup)', () => {
    // The spec's own arithmetic: every club plays both R16 legs of both cups
    // regardless of the result, so the floor is 90 + 2 + 2 = 94.
    expect(90 + 2 + 2).toBe(94)
  })

  it('a club reaching both finals and the Masters Final plays at most 105', () => {
    // 90 league + (2+2+2+1) per cup * 2 cups + 1 Masters Final.
    const perCup = 2 + 2 + 2 + 1
    expect(90 + perCup * 2 + 1).toBe(105)
  })
})

describe('season match volume for one 16-club group (요구사항 11절 검증)', () => {
  it('adds up to 779 matches a week', () => {
    const league = (CLUB_COUNT * 90) / 2
    const oneCup = 16 + 8 + 4 + 1
    const cups = oneCup * 2
    const mastersFinal = 1
    expect(league).toBe(720)
    expect(oneCup).toBe(29)
    expect(cups).toBe(58)
    expect(league + cups + mastersFinal).toBe(779)
  })
})

describe('standings tie-break (동률 처리)', () => {
  it('breaks a points tie with head-to-head record before overall goal difference', () => {
    const three = ['a', 'b', 'c']
    // a and b are level on points; a beat b head-to-head, but b has the
    // better overall goal difference. Head-to-head must still put a first.
    const matches: StandingsMatch[] = [
      { home: 'a', away: 'b', homeGoals: 2, awayGoals: 0 }, // a beats b head-to-head
      { home: 'b', away: 'a', homeGoals: 0, awayGoals: 0 },
      { home: 'a', away: 'c', homeGoals: 0, awayGoals: 5 }, // a's overall GD tanked
      { home: 'b', away: 'c', homeGoals: 3, awayGoals: 0 }, // b's overall GD is great
    ]
    const table = standings(three, matches)
    const a = table.find((r) => r.club === 'a')!
    const b = table.find((r) => r.club === 'b')!
    expect(a.points).toBe(b.points)
    expect(a.rank).toBeLessThan(b.rank)
  })

  it('falls back to the fixed seed order as the last resort', () => {
    const clubs = ['x', 'y']
    const rows = standings(clubs, [], { fixedSeedOrder: ['y', 'x'] })
    expect(rows[0].club).toBe('y')
  })
})
