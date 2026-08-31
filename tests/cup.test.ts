import { describe, expect, it } from 'vitest'
import {
  CUP_ROUNDS,
  CUP_TEAMS,
  createCup,
  cupReward,
  myTie,
  resolveCupRound,
  tiesOfRound,
} from '../lib/cup'
import { MY_TEAM_ID, simulateAiMatch } from '../lib/league'
import { seededRandom } from '../lib/players'

const cup = () => createCup(4, 1, '내 클럽 FC')

describe('cup draw', () => {
  it('starts with eight teams in four ties', () => {
    const state = cup()
    expect(state.teams).toHaveLength(CUP_TEAMS)
    expect(tiesOfRound(state, 0)).toHaveLength(CUP_TEAMS / 2)
    expect(myTie(state)).not.toBeNull()
    expect(state.teams.filter((team) => team.id === MY_TEAM_ID)).toHaveLength(1)
  })

  it('never puts a team in two ties of the same round', () => {
    const state = cup()
    const ids = tiesOfRound(state, 0).flatMap((tie) => [tie.home, tie.away])
    expect(new Set(ids).size).toBe(CUP_TEAMS)
  })
})

describe('cup progress', () => {
  it('advances the winner and builds the next round', () => {
    const rng = seededRandom(5)
    const { cup: next, advanced } = resolveCupRound(cup(), 3, 0, 80, simulateAiMatch, rng)

    expect(advanced).toBe(true)
    expect(next.eliminated).toBe(false)
    expect(next.round).toBe(1)
    expect(tiesOfRound(next, 1)).toHaveLength(2)
    expect(myTie(next)).not.toBeNull()
    // Every first round tie now has a winner.
    expect(tiesOfRound(next, 0).every((tie) => tie.winner)).toBe(true)
  })

  it('crowns a champion once the player is knocked out', () => {
    const rng = seededRandom(6)
    const { cup: next, advanced } = resolveCupRound(cup(), 0, 2, 80, simulateAiMatch, rng)

    expect(advanced).toBe(false)
    expect(next.eliminated).toBe(true)
    expect(next.champion).toBeTruthy()
    expect(next.champion).not.toBe(MY_TEAM_ID)
  })

  it('decides a draw on penalties', () => {
    const rng = seededRandom(9)
    const { cup: next } = resolveCupRound(cup(), 1, 1, 80, simulateAiMatch, rng)
    const mine = next.ties.find(
      (tie) => tie.round === 0 && (tie.home === MY_TEAM_ID || tie.away === MY_TEAM_ID),
    )!
    expect(mine.shootout).not.toBeNull()
    expect(mine.shootout![0]).not.toBe(mine.shootout![1])
    expect(mine.winner).toBeTruthy()
  })

  it('can be won by playing every round', () => {
    const rng = seededRandom(11)
    let state = cup()
    for (let round = 0; round < CUP_ROUNDS; round++) {
      expect(myTie(state)).not.toBeNull()
      state = resolveCupRound(state, 2, 0, 90, simulateAiMatch, rng).cup
    }
    expect(state.champion).toBe(MY_TEAM_ID)
    expect(state.eliminated).toBe(false)
  })

  it('pays more the deeper the run goes', () => {
    expect(cupReward(2, true)).toBeGreaterThan(cupReward(1, true))
    expect(cupReward(1, true)).toBeGreaterThan(cupReward(0, true))
    expect(cupReward(0, false)).toBeLessThan(cupReward(0, true))
  })
})
