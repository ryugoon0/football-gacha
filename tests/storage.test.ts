import { afterEach, describe, expect, it } from 'vitest'
import { FORMATION_KEYS } from '../lib/formations'
import { BENCH_SIZE } from '../lib/squad'
import { MAX_CONDITION } from '../lib/condition'
import { SAVE_KEY, SAVE_VERSION, initialState, loadState, saveState, normalizeSave, normalizeSquad } from '../lib/storage'

/** Minimal localStorage so the save code can run outside a browser. */
function useFakeBrowser(): Map<string, string> {
  const store = new Map<string, string>()
  ;(globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  }
  return store
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('saving', () => {
  it('round trips the current version', () => {
    useFakeBrowser()
    const state = { ...initialState(), gold: 4242 }
    saveState(state)
    const loaded = loadState()

    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.gold).toBe(4242)
    expect(loaded.cards).toHaveLength(state.cards.length)
  })

  it('starts fresh when there is nothing saved', () => {
    useFakeBrowser()
    expect(loadState().gold).toBe(initialState().gold)
  })

  it('ignores a corrupted save instead of crashing', () => {
    const store = useFakeBrowser()
    store.set(SAVE_KEY, '{ this is not json')
    expect(loadState().version).toBe(SAVE_VERSION)
  })
})

describe('old saves', () => {
  it('starts a fresh game when the save is from an older model', () => {
    const store = useFakeBrowser()
    store.set(
      SAVE_KEY,
      JSON.stringify({
        version: 4,
        club: '옛날 클럽',
        gold: 4321,
        cards: [{ uid: 'old-1', playerId: 'n01', level: 3 }],
      }),
    )

    const loaded = loadState()
    // The card and season model changed shape, so the old save is not loaded.
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.gold).toBe(initialState().gold)
    expect(loaded.club).toBe(initialState().club)
  })

  it('fills in missing card fields on a save of the current version', () => {
    const store = useFakeBrowser()
    const base = initialState()
    const save = {
      ...base,
      gold: 777,
      cards: base.cards.map(({ uid, playerId, level }) => ({ uid, playerId, level })),
    }
    store.set(SAVE_KEY, JSON.stringify(save))

    const loaded = loadState()
    expect(loaded.gold).toBe(777)
    expect(loaded.cards.every((card) => typeof card.limit === 'number')).toBe(true)
    expect(loaded.cards.every((card) => card.condition === MAX_CONDITION)).toBe(true)
  })
})

describe('save hardening', () => {
  const clean = initialState()

  it('rebuilds a squad that is missing or the wrong shape', () => {
    for (const broken of [null, undefined, 'squad', 42, { slots: null, bench: 'x' }]) {
      const squad = normalizeSquad(broken)
      expect(Object.keys(squad.slots).length).toBeGreaterThan(0)
      expect(squad.bench).toHaveLength(BENCH_SIZE)
      expect(FORMATION_KEYS).toContain(squad.formation)
    }
  })

  it('keeps a real squad intact', () => {
    expect(normalizeSquad(clean.squad)).toEqual(clean.squad)
  })

  it('drops slots the formation does not have and non-string uids', () => {
    const squad = normalizeSquad({
      formation: '4-4-2',
      slots: { gk: 'keeper', notASlot: 'ghost', d1: 99 },
      bench: ['a', 5, null, 'b'],
    })
    expect(squad.slots.gk).toBe('keeper')
    expect(squad.slots).not.toHaveProperty('notASlot')
    expect(squad.slots.d1).toBeNull()
    expect(squad.bench).toHaveLength(BENCH_SIZE)
    expect(squad.bench[1]).toBeNull()
  })

  it('survives a hand edited save without taking the screen down', () => {
    const broken = {
      ...clean,
      squad: null,
      gold: 'Infinity',
      shards: NaN,
      matchday: '<script>',
      season: null,
      cup: 'gone',
      daily: 0,
      market: [],
      record: null,
      history: 'nope',
      collected: null,
    }
    const state = normalizeSave(broken)!
    expect(state).not.toBeNull()
    expect(state.squad.bench).toHaveLength(BENCH_SIZE)
    expect(state.gold).toBe(clean.gold)
    expect(state.shards).toBe(clean.shards)
    expect(state.matchday).toBe(0)
    expect(state.season.division).toBe(clean.season.division)
    expect(Array.isArray(state.history)).toBe(true)
    expect(Array.isArray(state.collected)).toBe(true)
  })

  it('still refuses something that is not a save at all', () => {
    expect(normalizeSave(null)).toBeNull()
    expect(normalizeSave({ cards: 'nope' })).toBeNull()
  })
})
