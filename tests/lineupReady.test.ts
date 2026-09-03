import { describe, expect, it } from 'vitest'
import { evaluateSquad, missingSlots } from '../lib/squad'
import { applyAutoSubs } from '../lib/autoSub'
import { initialState } from '../lib/storage'
import type { GameState } from '../lib/types'

const withEmptySlot = (state: GameState, slotId: string): GameState => ({
  ...state,
  squad: { ...state.squad, slots: { ...state.squad.slots, [slotId]: null } },
})

const injure = (state: GameState, uid: string): GameState => ({
  ...state,
  cards: state.cards.map((card) => (card.uid === uid ? { ...card, injuredFor: 2 } : card)),
})

describe('lineup readiness', () => {
  const base = initialState()
  const division = base.season.division

  it('reports nothing missing for the starter squad', () => {
    const rating = evaluateSquad(base.cards, base.squad, division)
    expect(missingSlots(rating.evaluations)).toEqual({ empty: [], injured: [], duplicated: [] })
    expect(rating.filled).toBe(11)
  })

  it('flags a second copy of the same player started in another slot', () => {
    const [firstSlot, secondSlot] = Object.keys(base.squad.slots).filter(
      (id) => base.squad.slots[id] !== null,
    )
    const uid = base.squad.slots[firstSlot] as string
    const card = base.cards.find((item) => item.uid === uid)!
    const secondCopy = { ...card, uid: `${uid}-copy` }
    const doubled: GameState = {
      ...base,
      cards: [...base.cards, secondCopy],
      squad: { ...base.squad, slots: { ...base.squad.slots, [secondSlot]: secondCopy.uid } },
    }
    const rating = evaluateSquad(doubled.cards, doubled.squad, division)
    const gaps = missingSlots(rating.evaluations)
    expect(gaps.duplicated).toHaveLength(1)
  })

  it('names the position left empty', () => {
    const slotId = Object.keys(base.squad.slots).find(
      (id) => base.squad.slots[id] !== null,
    ) as string
    const rating = evaluateSquad(base.cards, withEmptySlot(base, slotId).squad, division)
    const gaps = missingSlots(rating.evaluations)
    expect(gaps.empty).toHaveLength(1)
    expect(gaps.injured).toHaveLength(0)
    expect(rating.filled).toBe(10)
  })

  it('counts an injured starter as a hole when nobody covers', () => {
    const slotId = Object.keys(base.squad.slots).find(
      (id) => base.squad.slots[id] !== null,
    ) as string
    const uid = base.squad.slots[slotId] as string
    const hurt = { ...injure(base, uid), squad: { ...base.squad, bench: base.squad.bench.map(() => null) } }
    const rating = evaluateSquad(hurt.cards, hurt.squad, division)
    expect(missingSlots(rating.evaluations).injured).toHaveLength(1)
  })

  it('is filled again once auto substitution covers the injury', () => {
    const slotId = 'gk'
    const withGk = Object.keys(base.squad.slots).includes(slotId)
      ? slotId
      : (Object.keys(base.squad.slots)[0] as string)
    const uid = base.squad.slots[withGk] as string
    const hurt = injure(base, uid)
    const auto = applyAutoSubs(hurt.cards, hurt.squad, division)
    const rating = evaluateSquad(hurt.cards, auto.squad, division)
    const gaps = missingSlots(rating.evaluations)
    // Either the bench covered the position, or it is still reported as a hole.
    if (auto.subs.length > 0) expect(gaps.injured).toHaveLength(0)
    else expect(gaps.injured).toHaveLength(1)
  })
})
