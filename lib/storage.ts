import { emptySlots } from './formations'
import type { Card, GameState } from './types'

export const SAVE_KEY = 'football-day-save-v1'
export const SAVE_VERSION = 1
export const STARTING_GOLD = 3000

let uidCounter = 0

export function newUid(): string {
  uidCounter += 1
  return `c${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(
    Math.random() * 1296,
  ).toString(36)}`
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

const STARTER_BENCH = ['n01', 'n15', 'n21']

export function initialState(): GameState {
  const cards: Card[] = []
  const slots = emptySlots('4-3-3')

  STARTER_SLOTS.forEach(([slotId, playerId], index) => {
    const uid = `starter-${index + 1}`
    cards.push({ uid, playerId, level: 1 })
    slots[slotId] = uid
  })
  STARTER_BENCH.forEach((playerId, index) => {
    cards.push({ uid: `starter-b${index + 1}`, playerId, level: 1 })
  })

  return {
    version: SAVE_VERSION,
    club: '내 클럽 FC',
    gold: STARTING_GOLD,
    cards,
    squad: { formation: '4-3-3', slots },
    record: { w: 0, d: 0, l: 0 },
    gf: 0,
    ga: 0,
    points: 0,
    division: 5,
    collected: Array.from(new Set(cards.map((card) => card.playerId))),
    history: [],
  }
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return initialState()
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<GameState>
    if (!parsed || parsed.version !== SAVE_VERSION || !Array.isArray(parsed.cards)) {
      return initialState()
    }
    return { ...initialState(), ...parsed } as GameState
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
