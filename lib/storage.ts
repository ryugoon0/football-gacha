import { MAX_CONDITION } from './condition'
import { createCup } from './cup'
import { freshDaily } from './daily'
import { emptySlots } from './formations'
import { newCardLevel } from './growth'
import { BOTTOM_DIVISION, createSeason } from './league'
import { emptyMarket } from './market'
import { getPlayer } from './players'
import { DEFAULT_TACTIC, normalizeTactic } from './tactics'
import { BASE_CAPACITY, normalizeCapacity } from './vault'
import { BENCH_SIZE } from './squad'
import type { Card, GameState } from './types'

/**
 * The card and season model changed shape, so this save lives under a new key:
 * older games start fresh rather than loading into a broken state.
 */
export const SAVE_KEY = 'football-day-save-v2'
export const SAVE_VERSION = 8
export const STARTING_GOLD = 3000
export const DEFAULT_CLUB = '내 클럽 FC'

let uidCounter = 0

export function newUid(): string {
  uidCounter += 1
  return `c${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(
    Math.random() * 1296,
  ).toString(36)}`
}

export function newCard(playerId: string): Card {
  const player = getPlayer(playerId)
  const { level, limit } = player ? newCardLevel(player) : { level: 1, limit: 2 }
  return {
    uid: newUid(),
    playerId,
    level,
    limit,
    condition: MAX_CONDITION,
    injuredFor: 0,
    exp: 0,
  }
}

/** Older saves are missing fields; fill them in defensively. */
export function normalizeCards(cards: Card[]): Card[] {
  return cards.map((card) => {
    const player = getPlayer(card.playerId)
    const defaults = player ? newCardLevel(player) : { level: 1, limit: 2 }
    return {
      uid: card.uid,
      playerId: card.playerId,
      level: typeof card.level === 'number' ? card.level : defaults.level,
      limit: typeof card.limit === 'number' ? card.limit : defaults.limit,
      condition: typeof card.condition === 'number' ? card.condition : MAX_CONDITION,
      injuredFor: typeof card.injuredFor === 'number' ? card.injuredFor : 0,
      exp: typeof card.exp === 'number' ? card.exp : 0,
    }
  })
}

/** The squad every new manager starts with, so a first match is playable. */
const STARTER_SLOTS: [slotId: string, playerId: string][] = [
  ['gk', 'n02'],
  ['d1', 'n07'],
  ['d2', 'n04'],
  ['d3', 'n05'],
  ['d4', 'n09'],
  ['m1', 'n13'],
  ['m2', 'n11'],
  ['m3', 'n14'],
  ['f1', 'n18'],
  ['f2', 'n20'],
  ['f3', 'n19'],
]

const STARTER_BENCH = ['n01', 'n15', 'n21', 'n03', 'n16']

function starterCard(playerId: string, uid: string): Card {
  const player = getPlayer(playerId)
  const { level, limit } = player ? newCardLevel(player) : { level: 2, limit: 3 }
  return { uid, playerId, level, limit, condition: MAX_CONDITION, injuredFor: 0, exp: 0 }
}

export function initialState(): GameState {
  const cards: Card[] = []
  const slots = emptySlots('4-3-3')
  const bench: (string | null)[] = []

  STARTER_SLOTS.forEach(([slotId, playerId], index) => {
    const uid = `starter-${index + 1}`
    cards.push(starterCard(playerId, uid))
    slots[slotId] = uid
  })
  STARTER_BENCH.forEach((playerId, index) => {
    const uid = `starter-b${index + 1}`
    cards.push(starterCard(playerId, uid))
    bench.push(uid)
  })
  while (bench.length < BENCH_SIZE) bench.push(null)

  return {
    version: SAVE_VERSION,
    club: DEFAULT_CLUB,
    gold: STARTING_GOLD,
    cards,
    squad: { formation: '4-3-3', slots, bench },
    tactic: DEFAULT_TACTIC,
    autoSub: true,
    season: createSeason(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    cup: createCup(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    matchday: 0,
    market: emptyMarket(),
    trophies: { cup: 0, promotions: 0 },
    shards: 0,
    capacity: BASE_CAPACITY,
    pity: 0,
    pulls: { total: 0, byRarity: { Normal: 0, Rare: 0, Legend: 0, Live: 0, World: 0 } },
    lastRatings: [],
    lastSubs: [],
    // The real day is stamped on the client after hydration, so server and
    // browser render the same empty mission board.
    daily: freshDaily(''),
    guideDone: false,
    record: { w: 0, d: 0, l: 0 },
    gf: 0,
    ga: 0,
    collected: Array.from(new Set(cards.map((card) => card.playerId))),
    history: [],
  }
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return initialState()
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<GameState> & { version?: number }
    if (!parsed || !Array.isArray(parsed.cards)) return initialState()
    // Version 6 stored the tactic as a single string and 7 had no vault size;
    // both migrate forward without losing a card.
    if (![SAVE_VERSION, 7, 6].includes(parsed.version ?? 0)) return initialState()

    const state = { ...initialState(), ...parsed } as GameState
    return {
      ...state,
      version: SAVE_VERSION,
      cards: normalizeCards(state.cards),
      tactic: normalizeTactic(state.tactic),
      capacity: normalizeCapacity(state.capacity),
    }
  } catch {
    return initialState()
  }
}

export function saveState(state: GameState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked; the game still works for this session.
  }
}

export function clearSave(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
