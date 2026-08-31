import { describe, expect, it } from 'vitest'
import { matchReward, simulateMatch } from '../lib/match'
import { DEFAULT_TACTIC } from '../lib/tactics'
import { seededRandom } from '../lib/players'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import type { LeagueTeam } from '../lib/league'
import type { PlanKey } from '../lib/tactics'

const team = (rating: number): LeagueTeam => ({ id: 'x', name: '상대', badge: 'XX', rating })

function run(opponentRating: number, tactic: PlanKey = 'balanced', seed = 42, runs = 300) {
  const state = initialState()
  const rating = evaluateSquad(state.cards, state.squad)
  const rng = seededRandom(seed)
  let wins = 0
  let goalsFor = 0
  let goalsAgainst = 0
  for (let i = 0; i < runs; i++) {
    const result = simulateMatch({
      team: rating,
      teamName: state.club,
      opponent: team(opponentRating),
      division: 5,
      venue: 'home',
      tactic: { ...DEFAULT_TACTIC, plan: tactic },
      rng,
    })
    if (result.result === 'W') wins++
    goalsFor += result.scoreFor
    goalsAgainst += result.scoreAgainst
  }
  return { wins, runs, goalsFor, goalsAgainst }
}

describe('match simulation', () => {
  it('produces a coherent result', () => {
    const state = initialState()
    const result = simulateMatch({
      team: evaluateSquad(state.cards, state.squad),
      teamName: state.club,
      opponent: team(60),
      division: 5,
      venue: 'home',
      tactic: DEFAULT_TACTIC,
      rng: seededRandom(3),
    })

    const goals = result.events.filter((event) => event.type === 'goal')
    expect(goals.filter((event) => event.side === 'home')).toHaveLength(result.scoreFor)
    expect(goals.filter((event) => event.side === 'away')).toHaveLength(result.scoreAgainst)
    expect(result.shotsFor).toBeGreaterThanOrEqual(result.scoreFor)
    expect(result.events[0].type).toBe('kickoff')
    expect(result.events[result.events.length - 1].type).toBe('full')
    expect(result.possession).toBeGreaterThan(0)
    expect(result.possession).toBeLessThan(100)
    expect(result.result).toBe(
      result.scoreFor > result.scoreAgainst ? 'W' : result.scoreFor === result.scoreAgainst ? 'D' : 'L',
    )
  })

  it('scores a believable number of goals per game', () => {
    const { goalsFor, goalsAgainst, runs } = run(62)
    const perGame = (goalsFor + goalsAgainst) / runs
    expect(perGame).toBeGreaterThan(1)
    expect(perGame).toBeLessThan(6)
  })

  it('wins more often against weaker opposition', () => {
    const weak = run(45)
    const strong = run(85)
    expect(weak.wins).toBeGreaterThan(strong.wins)
    expect(weak.wins / weak.runs).toBeGreaterThan(0.5)
    expect(strong.wins / strong.runs).toBeLessThan(0.3)
  })

  it('concedes less with a defensive plan than an attacking one', () => {
    const attacking = run(70, 'attack', 11)
    const defensive = run(70, 'defend', 11)
    expect(defensive.goalsAgainst).toBeLessThan(attacking.goalsAgainst)
  })

  it('pays more for a win and for higher divisions', () => {
    expect(matchReward('W', 5, 1)).toBeGreaterThan(matchReward('D', 5, 1))
    expect(matchReward('D', 5, 0)).toBeGreaterThan(matchReward('L', 5, 0))
    expect(matchReward('W', 1, 0)).toBeGreaterThan(matchReward('W', 5, 0))
  })
})
