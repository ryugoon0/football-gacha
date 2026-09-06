import { describe, expect, it } from 'vitest'
import { LEVEL_REFUND_MULTIPLIER, LIMIT_REFUND_MULTIPLIER, applyLevelCaps, levelCapNotice } from '../lib/levelCapMigration'
import { PLAYERS_BY_RARITY, levelCap } from '../lib/players'
import { trainCost } from '../lib/rarity'
import { normalizeSave, initialState, SAVE_VERSION } from '../lib/storage'
import type { Card } from '../lib/types'

const card = (uid: string, playerId: string, level: number, limit: number, exp = 0): Card => ({
  uid,
  playerId,
  level,
  limit,
  condition: 100,
  injuredFor: 0,
  exp,
})

describe('applyLevelCaps', () => {
  it('한계를 넘는 카드만 내리고 잃은 레벨·한계만큼 골드를 계산한다', () => {
    const normal = PLAYERS_BY_RARITY.Normal[0]
    const gold = PLAYERS_BY_RARITY.Legend[0]
    const cap = levelCap(normal)
    expect(cap).toBe(7)
    const cards = [card('a', normal.id, cap + 2, cap + 2, 999), card('b', gold.id, 5, 6), card('c', normal.id, cap, cap + 1)]
    const { cards: next, refund, adjusted } = applyLevelCaps(cards)
    const a = next.find((c) => c.uid === 'a')!
    expect(a.level).toBe(cap)
    expect(a.limit).toBe(cap)
    expect(a.exp).toBeLessThan(999)
    expect(next.find((c) => c.uid === 'b')).toBe(cards[1])
    const c = next.find((c) => c.uid === 'c')!
    expect(c.level).toBe(cap)
    expect(c.limit).toBe(cap)
    const expectedA =
      (trainCost('Normal', cap + 1) + trainCost('Normal', cap + 2)) * LEVEL_REFUND_MULTIPLIER + 2 * trainCost('Normal', cap) * LIMIT_REFUND_MULTIPLIER
    const expectedC = trainCost('Normal', cap) * LIMIT_REFUND_MULTIPLIER
    expect(adjusted.map((item) => item.refund)).toEqual([expectedA, expectedC])
    expect(refund).toBe(expectedA + expectedC)
    // Second pass: nothing left to do.
    const again = applyLevelCaps(next)
    expect(again.refund).toBe(0)
    expect(again.adjusted).toHaveLength(0)
  })

  it('저장본을 읽을 때 골드를 더하고 안내를 남긴다', () => {
    const normal = PLAYERS_BY_RARITY.Normal[0]
    const state = { ...initialState(), version: SAVE_VERSION, gold: 100, cards: [card('x', normal.id, 9, 9)] }
    const loaded = normalizeSave(state)!
    expect(loaded.cards[0].level).toBe(7)
    expect(loaded.gold).toBeGreaterThan(100)
    expect(loaded.notice?.gold).toBe(loaded.gold - 100)
    expect(loaded.notice?.lines.some((line) => line.includes(normal.name))).toBe(true)
    // Reading the normalized save again changes nothing and leaves the notice alone.
    const twice = normalizeSave({ ...loaded, notice: undefined })!
    expect(twice.gold).toBe(loaded.gold)
    expect(twice.notice).toBeUndefined()
  })

  it('안내는 12장까지만 나열하고 나머지는 세어 준다', () => {
    const adjusted = Array.from({ length: 15 }, (_, i) => ({ uid: `u${i}`, name: `선수${i}`, grade: '일반', from: 8, to: 7, limitFrom: 8, limitTo: 7, refund: 10 }))
    const notice = levelCapNotice({ refund: 150, adjusted })
    expect(notice.lines).toHaveLength(1 + 12 + 1)
    expect(notice.lines[notice.lines.length - 1]).toBe('외 3장')
  })
})
