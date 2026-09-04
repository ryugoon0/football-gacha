import { describe, expect, it } from 'vitest'
import { runToEnd, toResult } from '../lib/matchEngine'
import { seededRandom } from '../lib/random'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import { buildWeeklyMatchSetup, weeklyAiSquad, type WeeklyMemberSummary } from '../lib/weeklyLeague/liveMatch'

const memberOf = (over: Partial<WeeklyMemberSummary> = {}): WeeklyMemberSummary => ({
  slot: 0,
  kind: 'ai',
  clubName: '테스트 클럽',
  rating: 65,
  ...over,
})

describe('weekly AI squad', () => {
  it('fields the same eleven for the same group and slot every time', () => {
    const a = weeklyAiSquad(1, 3, 68)
    const b = weeklyAiSquad(1, 3, 68)
    expect(a.squad).toEqual(b.squad)
    expect(a.cards).toEqual(b.cards)
  })

  it('gives a different club a different eleven', () => {
    const a = weeklyAiSquad(1, 3, 68)
    const b = weeklyAiSquad(1, 4, 68)
    expect(a.cards).not.toEqual(b.cards)
  })

  it('produces a squad evaluateSquad can score', () => {
    const { rating } = weeklyAiSquad(2, 7, 75)
    expect(rating.overall).toBeGreaterThan(0)
    expect(rating.evaluations.some((item) => item.card)).toBe(true)
  })
})

describe('weekly match setup', () => {
  it('builds a setup that runs to a coherent full-time result, AI vs AI', () => {
    const setup = buildWeeklyMatchSetup({
      groupId: 5,
      home: memberOf({ slot: 0, clubName: '홈 클럽', rating: 70 }),
      away: memberOf({ slot: 1, clubName: '원정 클럽', rating: 65 }),
      neutralVenue: false,
    })
    const state = runToEnd(setup, seededRandom(11))
    const result = toResult(state, setup, { seed: 'test' })
    expect(state.minute).toBe(90)
    expect(result.opponent).toBe('원정 클럽')
    expect(result.scoreFor).toBeGreaterThanOrEqual(0)
    expect(result.scoreAgainst).toBeGreaterThanOrEqual(0)
  })

  it('lets a real user squad play as either home or away, same engine', () => {
    const state = initialState()
    const rating = evaluateSquad(state.cards, state.squad, 5)
    expect(rating.overall).toBeGreaterThan(0)

    const asHome = buildWeeklyMatchSetup({
      groupId: 9,
      home: memberOf({ kind: 'user', slot: 2, clubName: state.club, rating: rating.overall }),
      away: memberOf({ slot: 3, clubName: 'AI 클럽', rating: 60 }),
      homeInput: { cards: state.cards, squad: state.squad, division: 5 },
      neutralVenue: false,
    })
    const asAway = buildWeeklyMatchSetup({
      groupId: 9,
      home: memberOf({ slot: 3, clubName: 'AI 클럽', rating: 60 }),
      away: memberOf({ kind: 'user', slot: 2, clubName: state.club, rating: rating.overall }),
      awayInput: { cards: state.cards, squad: state.squad, division: 5 },
      neutralVenue: false,
    })

    expect(asHome.team.overall).toBe(rating.overall)
    expect(asAway.opponentSquad?.overall).toBe(rating.overall)

    const homeResult = toResult(runToEnd(asHome, seededRandom(4)), asHome, { seed: 't' })
    const awayResult = toResult(runToEnd(asAway, seededRandom(4)), asAway, { seed: 't' })
    expect(homeResult.scoreFor).toBeGreaterThanOrEqual(0)
    expect(awayResult.scoreAgainst).toBeGreaterThanOrEqual(0)
  })

  it('respects neutralVenue', () => {
    const setup = buildWeeklyMatchSetup({
      groupId: 1,
      home: memberOf({ slot: 0 }),
      away: memberOf({ slot: 1 }),
      neutralVenue: true,
    })
    expect(setup.venue).toBe('neutral')
  })
})
