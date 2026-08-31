import { describe, expect, it } from 'vitest'
import {
  MY_TEAM_ID,
  ROUNDS_PER_SEASON,
  TEAMS_PER_LEAGUE,
  createSeason,
  fixturesOfRound,
  myFixture,
  recordResult,
  seasonOutcome,
  simulateAiMatch,
  standings,
} from '../lib/league'
import { seededRandom } from '../lib/players'

const season = () => createSeason(5, 1, '내 클럽 FC')

describe('season schedule', () => {
  it('gives every team one match per round against everyone once', () => {
    const s = season()
    expect(s.teams).toHaveLength(TEAMS_PER_LEAGUE)
    expect(s.fixtures).toHaveLength((TEAMS_PER_LEAGUE / 2) * ROUNDS_PER_SEASON)

    const pairs = new Set<string>()
    for (let round = 0; round < ROUNDS_PER_SEASON; round++) {
      const fixtures = fixturesOfRound(s, round)
      expect(fixtures).toHaveLength(TEAMS_PER_LEAGUE / 2)
      const playing = fixtures.flatMap((fixture) => [fixture.home, fixture.away])
      expect(new Set(playing).size).toBe(TEAMS_PER_LEAGUE)
      for (const fixture of fixtures) pairs.add([fixture.home, fixture.away].sort().join('-'))
    }
    expect(pairs.size).toBe((TEAMS_PER_LEAGUE * (TEAMS_PER_LEAGUE - 1)) / 2)
  })

  it('always has a fixture for the player', () => {
    const s = season()
    for (let round = 0; round < ROUNDS_PER_SEASON; round++) {
      const fixture = myFixture({ ...s, round })
      expect(fixture).not.toBeNull()
      expect([fixture!.home, fixture!.away]).toContain(MY_TEAM_ID)
    }
  })

  it('does not give one team every home game', () => {
    const s = season()
    const homeGames = s.fixtures.filter((fixture) => fixture.home === MY_TEAM_ID).length
    expect(homeGames).toBeGreaterThan(1)
    expect(homeGames).toBeLessThan(ROUNDS_PER_SEASON)
  })
})

describe('table', () => {
  it('awards three points for a win and one for a draw', () => {
    let s = season()
    s = recordResult(s, MY_TEAM_ID, 'ai0', 2, 1)
    s = recordResult(s, 'ai1', 'ai2', 0, 0)

    expect(s.table[MY_TEAM_ID]).toMatchObject({ played: 1, w: 1, points: 3, gf: 2, ga: 1 })
    expect(s.table.ai0).toMatchObject({ played: 1, l: 1, points: 0 })
    expect(s.table.ai1).toMatchObject({ d: 1, points: 1 })
  })

  it('sorts on points, then goal difference', () => {
    let s = season()
    s = recordResult(s, 'ai0', 'ai1', 5, 0)
    s = recordResult(s, 'ai2', 'ai3', 1, 0)
    const table = standings(s)
    expect(table[0].team.id).toBe('ai0')
    expect(table[1].team.id).toBe('ai2')
    expect(table[0].rank).toBe(1)
  })
})

describe('season outcome', () => {
  it('promotes the winner and relegates the bottom side', () => {
    let s = createSeason(3, 2, '내 클럽 FC')
    // Win every match; the rivals only draw with each other.
    for (const fixture of s.fixtures) {
      if (fixture.home === MY_TEAM_ID) s = recordResult(s, fixture.home, fixture.away, 3, 0)
      else if (fixture.away === MY_TEAM_ID) s = recordResult(s, fixture.home, fixture.away, 0, 3)
      else s = recordResult(s, fixture.home, fixture.away, 1, 1)
    }
    const outcome = seasonOutcome(s)
    expect(outcome.rank).toBe(1)
    expect(outcome.promoted).toBe(true)
    expect(outcome.nextDivision).toBe(2)
    expect(outcome.reward).toBeGreaterThan(0)
  })

  it('keeps the top division from promoting further', () => {
    const s = createSeason(1, 1, '내 클럽 FC')
    expect(seasonOutcome(s).promoted).toBe(false)
    expect(seasonOutcome(s).nextDivision).toBe(1)
  })

  it('keeps the bottom division from relegating further', () => {
    let s = createSeason(5, 1, '내 클럽 FC')
    for (const fixture of s.fixtures) {
      if (fixture.home === MY_TEAM_ID) s = recordResult(s, fixture.home, fixture.away, 0, 4)
      else if (fixture.away === MY_TEAM_ID) s = recordResult(s, fixture.home, fixture.away, 4, 0)
      else s = recordResult(s, fixture.home, fixture.away, 2, 1)
    }
    const outcome = seasonOutcome(s)
    expect(outcome.rank).toBe(TEAMS_PER_LEAGUE)
    expect(outcome.relegated).toBe(false)
    expect(outcome.nextDivision).toBe(5)
  })
})

describe('ai matches', () => {
  it('produces plausible scorelines and favours the stronger team', () => {
    const rng = seededRandom(99)
    const strong = { id: 'a', name: 'A', badge: 'A', rating: 85 }
    const weak = { id: 'b', name: 'B', badge: 'B', rating: 55 }
    let strongWins = 0
    for (let i = 0; i < 400; i++) {
      const [home, away] = simulateAiMatch(strong, weak, rng)
      expect(home).toBeGreaterThanOrEqual(0)
      expect(away).toBeLessThanOrEqual(9)
      if (home > away) strongWins++
    }
    expect(strongWins).toBeGreaterThan(280)
  })
})
