import { describe, expect, it } from 'vitest'
import { applyAutoSubs } from '../lib/autoSub'
import { emptySlots } from '../lib/formations'
import type { Card, Squad } from '../lib/types'

describe('a replacement is never someone who would be pulled straight back off', () => {
  it('leaves a starter on when every substitute is below the tired bar', () => {
    // With the bar raised, a bench player on 60 counts as tired too. Swapping
    // them in would only mean swapping them out again at the next whistle.
    const cards: Card[] = [
      { uid: 's1', playerId: 'n01', level: 3, limit: 5, condition: 50, injuredFor: 0, exp: 0 },
      { uid: 'b1', playerId: 'n02', level: 3, limit: 5, condition: 60, injuredFor: 0, exp: 0 },
    ]
    const squad: Squad = {
      formation: '4-3-3',
      slots: { ...emptySlots('4-3-3'), gk: 's1' },
      bench: ['b1', null, null, null, null, null, null],
    }

    const raised = applyAutoSubs(cards, squad, 5, (card) => card.condition, 70)
    expect(raised.subs).toHaveLength(0)
    expect(raised.squad.slots.gk).toBe('s1')
  })

  it('still makes the swap when the substitute is genuinely fresher', () => {
    const cards: Card[] = [
      { uid: 's1', playerId: 'n01', level: 3, limit: 5, condition: 50, injuredFor: 0, exp: 0 },
      { uid: 'b1', playerId: 'n02', level: 3, limit: 5, condition: 95, injuredFor: 0, exp: 0 },
    ]
    const squad: Squad = {
      formation: '4-3-3',
      slots: { ...emptySlots('4-3-3'), gk: 's1' },
      bench: ['b1', null, null, null, null, null, null],
    }

    const raised = applyAutoSubs(cards, squad, 5, (card) => card.condition, 70)
    expect(raised.subs).toHaveLength(1)
    expect(raised.squad.slots.gk).toBe('b1')
  })
})

describe('the substitution allowance', () => {
  const squad = (): Squad => ({
    formation: '4-3-3',
    slots: { ...emptySlots('4-3-3'), gk: 's1', d1: 's2', d2: 's3' },
    bench: ['b1', 'b2', 'b3', null, null, null, null],
  })

  const cards: Card[] = [
    ...['s1', 's2', 's3'].map((uid) => ({
      uid, playerId: 'n01', level: 3, limit: 5, condition: 20, injuredFor: 0, exp: 0,
    })),
    ...['b1', 'b2', 'b3'].map((uid) => ({
      uid, playerId: 'n02', level: 3, limit: 5, condition: 100, injuredFor: 0, exp: 0,
    })),
  ]

  it('stops once the allowance is spent, leaving the rest on the field', () => {
    const two = applyAutoSubs(cards, squad(), 5, (card) => card.condition, 45, 2)
    expect(two.subs).toHaveLength(2)

    const all = applyAutoSubs(cards, squad(), 5, (card) => card.condition, 45)
    expect(all.subs).toHaveLength(3)
  })

  it('makes no change at all when nothing is left', () => {
    const none = applyAutoSubs(cards, squad(), 5, (card) => card.condition, 45, 0)
    expect(none.subs).toHaveLength(0)
    expect(none.squad).toEqual(squad())
  })
})
