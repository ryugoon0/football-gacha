import { describe, expect, it } from 'vitest'
import { ITEMS, visibleItemIds } from '../lib/items'
import { PLAYERS } from '../lib/players'
import { canPick, pickCandidates } from '../lib/pickTicket'
import { reducer } from '../lib/gameReducer'
import { initialState } from '../lib/storage'

describe('스카우트 지정권', () => {
  it('플래티넘 지정권은 출시된 플래티넘만, 라이브 지정권은 열린 적 있는 리미티드만 고른다', () => {
    const plat = pickCandidates('platinumPick')
    expect(plat.length).toBeGreaterThan(0)
    expect(plat.every((p) => p.rarity === 'Live' && !p.limited && !p.unreleased && !p.retired)).toBe(true)
    const limited = PLAYERS.filter((p) => p.limited && !p.unreleased)
    const before = limited.length ? Date.parse(limited[0].limited!.from) - 1 : 0
    expect(pickCandidates('livePick', before).some((p) => p.id === limited[0]?.id)).toBe(false)
    expect(pickCandidates('livePick', Date.parse('2099-01-01')).length).toBe(limited.length)
    expect(pickCandidates('drink')).toEqual([])
  })

  it('지정권은 상점에 올라가지 않는다', () => {
    expect(ITEMS.platinumPick.gold).toBeNull()
    expect(ITEMS.platinumPick.shards).toBeNull()
    expect(visibleItemIds()).not.toContain('platinumPick')
    expect(visibleItemIds()).not.toContain('livePick')
    expect(visibleItemIds()).toContain('drink')
  })

  it('쓰면 카드가 들어오고 지정권이 한 장 줄며, 대상이 아닌 카드는 거부한다', () => {
    const state = { ...initialState(), items: { platinumPick: 2 } }
    const target = pickCandidates('platinumPick')[0]
    const next = reducer(state, { type: 'spendItemOnPick', id: 'platinumPick', playerId: target.id })
    expect(next.items.platinumPick).toBe(1)
    expect(next.cards.length).toBe(state.cards.length + 1)
    expect(next.cards[next.cards.length - 1].playerId).toBe(target.id)
    expect(next.collected).toContain(target.id)
    const normal = PLAYERS.find((p) => p.rarity === 'Normal' && !p.unreleased)!
    expect(canPick('platinumPick', normal.id)).toBe(false)
    expect(reducer(next, { type: 'spendItemOnPick', id: 'platinumPick', playerId: normal.id })).toBe(next)
    expect(reducer({ ...state, items: {} }, { type: 'spendItemOnPick', id: 'platinumPick', playerId: target.id })).toEqual({ ...state, items: {} })
  })
})
