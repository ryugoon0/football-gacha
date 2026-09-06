import { describe, expect, it } from 'vitest'
import { applyWear, type WearRow } from '../lib/weeklyWear'
import { wearOf, type LiveSnapshot, type ReplayResult } from '../lib/weeklyLeague/liveReplay'
import type { Card, Squad } from '../lib/types'

const card = (uid: string, condition: number): Card =>
  ({ uid, playerId: 'n1125', level: 1, limit: 0, exp: 0, condition, injuredFor: 0 }) as Card

const row = (id: number, starters: string[], subs: string[] = []): WearRow => ({
  id,
  fixture_id: id,
  starters,
  subs,
  created_at: '2026-09-06T00:00:00Z',
})

const rates = { starter: 6, sub: 3, rest: 8 }

describe('applyWear', () => {
  it('선발은 소모, 교체는 덜 소모, 안 뛴 카드는 회복한다', () => {
    const cards = [card('a', 100), card('b', 100), card('c', 50)]
    const { cards: next, summary } = applyWear(cards, [row(1, ['a'], ['b'])], rates)
    expect(next.map((c) => c.condition)).toEqual([94, 97, 58])
    expect(summary).toEqual({ fixtures: 1, drained: 2, rested: 1 })
  })

  it('경기마다 누적되며 0과 100에서 멈춘다', () => {
    const cards = [card('a', 10), card('b', 96)]
    const rows = [row(2, ['a']), row(1, ['a']), row(3, ['a'])]
    const { cards: next } = applyWear(cards, rows, rates)
    expect(next[0].condition).toBe(0)
    expect(next[1].condition).toBe(100)
  })

  it('이미 없는 카드의 uid는 무시한다', () => {
    const cards = [card('a', 80)]
    const { cards: next } = applyWear(cards, [row(1, ['gone'], ['also-gone'])], rates)
    expect(next[0].condition).toBe(88)
  })

  it('줄이 없으면 그대로', () => {
    const cards = [card('a', 80)]
    expect(applyWear(cards, [], rates).cards).toBe(cards)
  })
})

describe('wearOf', () => {
  const squad = (slots: Record<string, string | null>): Squad => ({ formation: '4-3-3', slots, bench: [] })
  it('킥오프 11명과 교체 투입을 구분하고 AI 쪽은 비운다', () => {
    const snapshot = {
      home: { cards: [], squad: squad({ gk: 'h1', st: 'h2' }), division: 1 },
      away: { cards: [], squad: squad({}), division: 1 },
    } as unknown as LiveSnapshot
    const result = {
      home: { cards: [], squad: squad({ gk: 'h1', st: 'h9' }), division: 1 },
      away: { cards: [], squad: squad({}), division: 1 },
    } as unknown as ReplayResult
    expect(wearOf(snapshot, result)).toEqual([{ side: 'home', starters: ['h1', 'h2'], subs: ['h9'] }])
  })
})
