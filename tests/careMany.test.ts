import { describe, expect, it } from 'vitest'
import { MAX_CONDITION, careQuote, recoveryCost, treatmentCost } from '../lib/condition'
import { reducer } from '../lib/gameReducer'
import { initialState } from '../lib/storage'

describe('careMany', () => {
  it('치료와 회복을 고른 카드에만, 골드가 닿는 데까지 적용한다', () => {
    const state = initialState()
    const [a, b, c] = state.cards
    const cards = state.cards.map((card) =>
      card.uid === a.uid ? { ...card, injuredFor: 2, condition: 40 } : card.uid === b.uid ? { ...card, condition: 60 } : card.uid === c.uid ? { ...card, injuredFor: 1 } : card,
    )
    const quote = careQuote(cards, [a.uid, b.uid])
    expect(quote).toEqual({ injured: 1, treatCost: treatmentCost(cards[0]), tired: 2, recoverCost: recoveryCost(cards[0]) + recoveryCost(cards[1]) })

    const rich = { ...state, cards, gold: 1_000_000 }
    const next = reducer(rich, { type: 'careMany', uids: [a.uid, b.uid], treat: true, recover: true })
    expect(next.gold).toBe(rich.gold - quote.treatCost - quote.recoverCost)
    expect(next.cards.find((card) => card.uid === a.uid)).toMatchObject({ injuredFor: 0, condition: MAX_CONDITION })
    expect(next.cards.find((card) => card.uid === b.uid)!.condition).toBe(MAX_CONDITION)
    // c was not in the list — still injured.
    expect(next.cards.find((card) => card.uid === c.uid)!.injuredFor).toBe(1)

    const poor = { ...state, cards, gold: quote.treatCost }
    const partial = reducer(poor, { type: 'careMany', uids: [a.uid, b.uid], treat: true, recover: true })
    expect(partial.gold).toBe(0)
    expect(partial.cards.find((card) => card.uid === a.uid)).toMatchObject({ injuredFor: 0, condition: 40 })
  })

  it('할 일이 없으면 상태를 그대로 돌려준다', () => {
    const state = initialState()
    expect(reducer(state, { type: 'careMany', uids: state.cards.map((card) => card.uid), treat: true, recover: true })).toBe(state)
  })
})
