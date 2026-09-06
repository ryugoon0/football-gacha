import { describe, expect, it } from 'vitest'
import { capDivisionOfTier, lineupCapOf, lineupCapOfTier, lineupDivisionOf } from '../lib/squad'
import { reducer } from '../lib/gameReducer'
import { initialState } from '../lib/storage'

describe('스쿼드 레벨 상한은 경쟁 리그 등급을 따른다', () => {
  it('등급 0~3이 상한 110·89·77·66에 대응하고, 미배정은 최하위다', () => {
    expect(lineupCapOfTier(0)).toBe(110)
    expect(lineupCapOfTier(1)).toBe(89)
    expect(lineupCapOfTier(2)).toBe(77)
    expect(lineupCapOfTier(3)).toBe(66)
    expect(lineupCapOfTier(null)).toBe(66)
    expect(lineupCapOfTier(undefined)).toBe(66)
    expect(lineupCapOfTier(9)).toBe(66)
    expect(lineupCapOfTier(-1)).toBe(110)
    expect(lineupCapOf(capDivisionOfTier(2))).toBe(77)
  })

  it('세이브의 등급으로 키를 고르고, 캐주얼 디비전은 보지 않는다', () => {
    const state = { ...initialState(), season: { ...initialState().season, division: 1 } }
    expect(lineupCapOf(lineupDivisionOf(state))).toBe(66)
    const placed = reducer(state, { type: 'setWeeklyTier', tier: 0 })
    expect(placed.weeklyTier).toBe(0)
    expect(lineupCapOf(lineupDivisionOf(placed))).toBe(110)
    expect(reducer(placed, { type: 'setWeeklyTier', tier: 0 })).toBe(placed)
    expect(reducer(placed, { type: 'setWeeklyTier', tier: null }).weeklyTier).toBeNull()
  })
})
