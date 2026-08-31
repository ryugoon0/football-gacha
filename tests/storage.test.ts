import { afterEach, describe, expect, it } from 'vitest'
import { MAX_CONDITION } from '../lib/condition'
import { MY_TEAM_ID } from '../lib/league'
import { SAVE_KEY, SAVE_VERSION, initialState, loadState, saveState } from '../lib/storage'

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

describe('migrations', () => {
  it('carries a version 1 save over to the league format', () => {
    const store = useFakeBrowser()
    store.set(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        club: '옛날 클럽',
        gold: 1234,
        cards: [{ uid: 'old-1', playerId: 'n01', level: 3 }],
        squad: { formation: '4-3-3', slots: { gk: 'old-1' } },
        record: { w: 5, d: 2, l: 1 },
        division: 3,
        collected: ['n01'],
      }),
    )

    const loaded = loadState()
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.club).toBe('옛날 클럽')
    expect(loaded.gold).toBe(1234)
    expect(loaded.record.w).toBe(5)
    expect(loaded.season.division).toBe(3)
    expect(loaded.season.teams.some((team) => team.id === MY_TEAM_ID)).toBe(true)
    expect(loaded.cup.round).toBe(0)
    // Old cards gain fitness with a clean bill of health.
    expect(loaded.cards[0]).toMatchObject({ uid: 'old-1', level: 3, condition: MAX_CONDITION, injuredFor: 0 })
    expect(loaded.guideDone).toBe(true)
  })

  it('keeps a version 4 save and adds shards, pity and pull records', () => {
    const store = useFakeBrowser()
    const base = initialState()
    const v4: Record<string, unknown> = { ...base, version: 4, gold: 4321 }
    delete v4.shards
    delete v4.pity
    delete v4.pulls
    store.set(SAVE_KEY, JSON.stringify(v4))

    const loaded = loadState()
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.gold).toBe(4321)
    expect(loaded.shards).toBe(0)
    expect(loaded.pity).toBe(0)
    expect(loaded.pulls.total).toBe(0)
  })

  it('keeps a version 3 save and adds experience to its cards', () => {
    const store = useFakeBrowser()
    const base = initialState()
    const v3 = {
      ...base,
      version: 3,
      gold: 555,
      season: { ...base.season, round: 2 },
      cards: base.cards.map(({ uid, playerId, level, condition, injuredFor }) => ({
        uid,
        playerId,
        level,
        condition,
        injuredFor,
      })),
    }
    store.set(SAVE_KEY, JSON.stringify(v3))

    const loaded = loadState()
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.gold).toBe(555)
    expect(loaded.season.round).toBe(2)
    expect(loaded.cards.every((card) => card.exp === 0)).toBe(true)
    expect(loaded.lastRatings).toEqual([])
  })

  it('keeps a version 2 season and adds the cup, market and fitness', () => {
    const store = useFakeBrowser()
    const base = initialState()
    const v2 = {
      ...base,
      version: 2,
      gold: 777,
      season: { ...base.season, round: 3, index: 2 },
      cards: base.cards.map(({ uid, playerId, level }) => ({ uid, playerId, level })),
    }
    delete (v2 as Partial<typeof v2>).cup
    delete (v2 as Partial<typeof v2>).market
    store.set(SAVE_KEY, JSON.stringify(v2))

    const loaded = loadState()
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.gold).toBe(777)
    expect(loaded.season.round).toBe(3)
    expect(loaded.season.index).toBe(2)
    expect(loaded.cup.teams).toHaveLength(8)
    expect(loaded.market.listings).toEqual([])
    expect(loaded.cards.every((card) => card.condition === MAX_CONDITION)).toBe(true)
  })
})
