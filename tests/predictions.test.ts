import { describe, expect, it } from 'vitest'
import { countCorrect, picksComplete, roundAcceptsPicks, type PredictionMatch, type PredictionRound } from '../lib/predictions'

const match = (id: number, result: PredictionMatch['result'] = null): PredictionMatch => ({
  id,
  round_id: 1,
  idx: id,
  league: '킹덤',
  home: '맨체스 레즈',
  away: '리버 머지',
  kickoff_at: null,
  result,
})

const round = (over: Partial<PredictionRound> = {}): PredictionRound => ({
  id: 1,
  title: '9월 2주 빅매치',
  note: '',
  closes_at: '2026-09-12T20:00:00+09:00',
  reward_gold: 5000,
  status: 'open',
  created_at: '2026-09-08T00:00:00+09:00',
  settled_at: null,
  entrants: 0,
  winners: 0,
  ...over,
})

describe('빅매치 예측', () => {
  it('takes picks only while open and before the deadline', () => {
    const before = Date.parse('2026-09-12T19:59:00+09:00')
    const after = Date.parse('2026-09-12T20:00:01+09:00')
    expect(roundAcceptsPicks(round(), before)).toBe(true)
    expect(roundAcceptsPicks(round(), after)).toBe(false)
    expect(roundAcceptsPicks(round({ status: 'settled' }), before)).toBe(false)
  })

  it('needs every match picked before a sheet can go in', () => {
    const matches = [match(1), match(2), match(3)]
    expect(picksComplete(matches, { '1': 'H', '2': 'D' })).toBe(false)
    expect(picksComplete(matches, { '1': 'H', '2': 'D', '3': 'A' })).toBe(true)
    expect(picksComplete([], {})).toBe(false)
  })

  it('counts only the matches with a result, the way the server settles', () => {
    const matches = [match(1, 'H'), match(2, 'D'), match(3)]
    expect(countCorrect(matches, { '1': 'H', '2': 'A', '3': 'A' })).toBe(1)
    expect(countCorrect(matches, { '1': 'H', '2': 'D', '3': 'A' })).toBe(2)
  })
})
