import { describe, expect, it } from 'vitest'
import { affordableBatches, fusionSizeFor, planBulkFusion } from '../lib/fusion'
import { PLAYERS_BY_RARITY } from '../lib/players'
import { reducer } from '../lib/gameReducer'
import { initialState } from '../lib/storage'
import { tune } from '../lib/tuning'
import type { Card } from '../lib/types'

const card = (uid: string, playerId: string, extra: Partial<Card> = {}): Card => ({
  uid,
  playerId,
  level: 1,
  limit: 5,
  condition: 100,
  injuredFor: 0,
  exp: 0,
  ...extra,
})

describe('planBulkFusion', () => {
  it('잠금·18명·키운 카드는 건너뛰고 등급별로 장수만큼 묶는다', () => {
    const state = initialState()
    const normal = PLAYERS_BY_RARITY.Normal
    const rare = PLAYERS_BY_RARITY.Rare
    const size = fusionSizeFor('Normal')
    const spare: Card[] = []
    for (let index = 0; index < size * 2 + 1; index++) spare.push(card(`n${index}`, normal[index % normal.length].id))
    spare.push(card('locked', normal[0].id, { locked: true }))
    spare.push(card('grown', normal[1].id, { level: 2 }))
    spare.push(card('exp', normal[2].id, { exp: 5 }))
    for (let index = 0; index < size; index++) spare.push(card(`r${index}`, rare[index % rare.length].id))
    const squad = { ...state.squad, bench: ['n0', ...state.squad.bench.slice(1)] }
    const plan = planBulkFusion([...state.cards, ...spare], squad, 1_000_000)
    const normalGroup = plan.groups.find((group) => group.from === 'Normal')!
    const rareGroup = plan.groups.find((group) => group.from === 'Rare')!
    const flat = normalGroup.batches.flat()
    expect(flat).not.toContain('locked')
    expect(flat).not.toContain('grown')
    expect(flat).not.toContain('exp')
    expect(flat).not.toContain('n0')
    // Starter cards from the initial squad never appear either.
    for (const uid of Object.values(state.squad.slots)) expect(flat).not.toContain(uid)
    expect(rareGroup.batches).toHaveLength(1)
    expect(rareGroup.to).toBe('Legend')
    expect(plan.feeTotal).toBe(plan.fusions * tune('fusionFee'))
  })

  it('키운 카드 제외를 끄면 포함하고, 등급을 고르면 그 등급만 본다', () => {
    const state = initialState()
    const normal = PLAYERS_BY_RARITY.Normal
    const size = fusionSizeFor('Normal')
    const spare = Array.from({ length: size }, (_, index) => card(`g${index}`, normal[index].id, { level: 2 + index }))
    const plan = planBulkFusion(spare, { ...state.squad, slots: {}, bench: [] }, 1_000_000, { rarities: ['Normal'], keepGrown: false })
    expect(plan.groups.map((group) => group.from)).toEqual(['Normal'])
    expect(plan.groups[0].batches).toHaveLength(1)
    expect(plan.groups[0].batches[0]).toEqual(spare.map((c) => c.uid))
    expect(planBulkFusion(spare, { ...state.squad, slots: {}, bench: [] }, 1_000_000, { rarities: ['Normal'] }).fusions).toBe(0)
  })

  it('골드가 모자라면 앞에서부터 감당되는 묶음만 남긴다', () => {
    const state = initialState()
    const normal = PLAYERS_BY_RARITY.Normal
    const size = fusionSizeFor('Normal')
    const spare: Card[] = []
    for (let index = 0; index < size * 3; index++) spare.push(card(`n${index}`, normal[index % normal.length].id))
    const fee = tune('fusionFee')
    const plan = planBulkFusion([...state.cards, ...spare], { ...state.squad, slots: {}, bench: [] }, fee * 2 + 1, { rarities: ['Normal'] })
    expect(plan.fusions).toBeGreaterThanOrEqual(3)
    expect(plan.affordableFusions).toBe(2)
    expect(affordableBatches(plan)).toHaveLength(2)
  })
})

describe('fuseMany reducer', () => {
  it('묶음마다 골드를 빼고 카드를 바꾸며, 잠긴 묶음은 건너뛴다', () => {
    const state = initialState()
    const normal = PLAYERS_BY_RARITY.Normal
    const size = fusionSizeFor('Normal')
    const spare: Card[] = []
    for (let index = 0; index < size * 2; index++) spare.push(card(`n${index}`, normal[index % normal.length].id))
    spare[size].locked = true
    const start = { ...state, cards: [...state.cards, ...spare], gold: 1_000_000 }
    const reward = PLAYERS_BY_RARITY.Rare[0]
    const batches = [
      { uids: spare.slice(0, size).map((c) => c.uid), player: reward },
      { uids: spare.slice(size).map((c) => c.uid), player: reward },
    ]
    const next = reducer(start, { type: 'fuseMany', batches })
    expect(next.gold).toBe(start.gold - tune('fusionFee'))
    expect(next.cards).toHaveLength(start.cards.length - size + 1)
    expect(next.cards.some((c) => c.uid === `n${size}`)).toBe(true)
    expect(next.cards.filter((c) => c.playerId === reward.id).length).toBeGreaterThanOrEqual(1)
  })
})
