import { describe, expect, it } from 'vitest'
import { MINI_GAME_LIMIT, freshDaily, miniGamesLeft, rollOver, todayKey } from '../lib/daily'
import { reducer } from '../lib/gameReducer'
import { friendlyOpponent, divisionBaseRating } from '../lib/league'
import { MINI_GAME_REWARD } from '../lib/match'
import { initialState } from '../lib/storage'
import type { GameState, MatchResult } from '../lib/types'

const result = (over: Partial<MatchResult> = {}): MatchResult => ({
  result: 'W',
  scoreFor: 2,
  scoreAgainst: 1,
  opponent: '친선 상대',
  opponentRating: 55,
  events: [],
  reward: 200,
  scorerUids: [],
  shotsFor: 8,
  shotsAgainst: 5,
  possession: 55,
  ...over,
})

const play = (state: GameState, times: number): GameState => {
  let next = state
  for (let i = 0; i < times; i += 1) {
    next = reducer(next, {
      type: 'miniGame',
      result: result(),
      lineup: { squad: next.squad, subs: [] },
    })
  }
  return next
}

describe('daily mini games', () => {
  it('starts the day with ten friendlies', () => {
    expect(miniGamesLeft(freshDaily(todayKey()))).toBe(MINI_GAME_LIMIT)
  })

  it('pays gold and counts down, without touching the league', () => {
    const start = { ...initialState(), daily: freshDaily(todayKey()) }
    const next = play(start, 1)
    expect(next.gold).toBe(start.gold + 200)
    expect(next.daily.miniGames).toBe(1)
    expect(next.season.round).toBe(start.season.round)
    expect(next.matchday).toBe(start.matchday)
    expect(next.record).toEqual(start.record)
    expect(next.history[0].competition).toBe('friendly')
  })

  it('stops at ten a day', () => {
    const start = { ...initialState(), daily: freshDaily(todayKey()) }
    const spent = play(start, MINI_GAME_LIMIT)
    expect(spent.daily.miniGames).toBe(MINI_GAME_LIMIT)
    expect(miniGamesLeft(spent.daily)).toBe(0)

    const extra = play(spent, 1)
    expect(extra.gold).toBe(spent.gold)
    expect(extra.daily.miniGames).toBe(MINI_GAME_LIMIT)
  })

  it('gives the allowance back the next day', () => {
    const yesterday = { ...freshDaily('1999-01-01'), miniGames: MINI_GAME_LIMIT }
    expect(rollOver(yesterday, todayKey()).miniGames).toBe(0)
  })

  it('pays less than a league match', () => {
    expect(MINI_GAME_REWARD).toBeLessThan(1)
  })

  it('draws an opponent near the division level', () => {
    for (let index = 0; index < 12; index += 1) {
      const opponent = friendlyOpponent(3, index)
      expect(Math.abs(opponent.rating - divisionBaseRating(3))).toBeLessThanOrEqual(5)
      expect(opponent.name.length).toBeGreaterThan(1)
    }
  })
})

describe('friendlies and the squad', () => {
  it('never injures anyone, unlike a league match', () => {
    let state = { ...initialState(), daily: freshDaily(todayKey()) }
    for (let i = 0; i < MINI_GAME_LIMIT; i += 1) {
      state = reducer(state, {
        type: 'miniGame',
        result: result(),
        lineup: { squad: state.squad, subs: [] },
      })
    }
    expect(state.daily.miniGames).toBe(MINI_GAME_LIMIT)
    expect(state.cards.every((card) => card.injuredFor === 0)).toBe(true)
  })

  it('still costs the starters condition', () => {
    const start = { ...initialState(), daily: freshDaily(todayKey()) }
    const next = play(start, 3)
    const starterUid = Object.values(start.squad.slots).find(Boolean) as string
    const before = start.cards.find((card) => card.uid === starterUid)!.condition
    const after = next.cards.find((card) => card.uid === starterUid)!.condition
    expect(after).toBeLessThan(before)
  })
})
