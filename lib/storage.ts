import { MAX_CONDITION } from './condition'
import { createCup } from './cup'
import { freshDaily } from './daily'
import { emptySlots } from './formations'
import { BOTTOM_DIVISION, createSeason } from './league'
import { emptyMarket } from './market'
import type { Card, GameState } from './types'

export const SAVE_KEY = 'football-day-save-v1'
export const SAVE_VERSION = 3
export const STARTING_GOLD = 3000
export const DEFAULT_CLUB = '내 클럽 FC'

let uidCounter = 0

export function newUid(): string {
  uidCounter += 1
  return `c${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(
    Math.random() * 1296,
  ).toString(36)}`
}

export function newCard(playerId: string, level = 1): Card {
  return { uid: newUid(), playerId, level, condition: MAX_CONDITION, injuredFor: 0 }
}

/** Older saves stored cards without fitness, so fill it in. */
export function normalizeCards(cards: Card[]): Card[] {
  return cards.map((card) => ({
    uid: card.uid,
    playerId: card.playerId,
    level: card.level ?? 1,
    condition: typeof card.condition === 'number' ? card.condition : MAX_CONDITION,
    injuredFor: typeof card.injuredFor === 'number' ? card.injuredFor : 0,
  }))
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
    cards.push({ uid, playerId, level: 1, condition: MAX_CONDITION, injuredFor: 0 })
    slots[slotId] = uid
  })
  STARTER_BENCH.forEach((playerId, index) => {
    cards.push({
      uid: `starter-b${index + 1}`,
      playerId,
      level: 1,
      condition: MAX_CONDITION,
      injuredFor: 0,
    })
  })

  return {
    version: SAVE_VERSION,
    club: DEFAULT_CLUB,
    gold: STARTING_GOLD,
    cards,
    squad: { formation: '4-3-3', slots },
    tactic: 'balanced',
    season: createSeason(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    cup: createCup(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    market: emptyMarket(),
    trophies: { cup: 0, promotions: 0 },
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

interface LegacySave {
  version: 1 | 2
  club?: string
  gold?: number
  cards?: Card[]
  squad?: GameState['squad']
  record?: GameState['record']
  gf?: number
  ga?: number
  division?: number
  tactic?: GameState['tactic']
  season?: GameState['season']
  daily?: GameState['daily']
  guideDone?: boolean
  collected?: string[]
  history?: GameState['history']
}

/**
 * Version 1 had a points ladder instead of a league season; version 2 had no
 * cup, market or player fitness. Both keep their club, cards and gold.
 */
function migrate(save: LegacySave): GameState {
  const base = initialState()
  const club = save.club ?? base.club
  const division = Math.min(
    BOTTOM_DIVISION,
    Math.max(1, save.season?.division ?? save.division ?? BOTTOM_DIVISION),
  )
  const season = save.version === 2 && save.season ? save.season : createSeason(division, 1, club)

  return {
    ...base,
    club,
    gold: save.gold ?? base.gold,
    cards: save.cards?.length ? normalizeCards(save.cards) : base.cards,
    squad: save.squad ?? base.squad,
    tactic: save.tactic ?? base.tactic,
    season,
    cup: createCup(division, season.index, club),
    daily: save.daily ?? base.daily,
    guideDone: true,
    record: save.record ?? base.record,
    gf: save.gf ?? 0,
    ga: save.ga ?? 0,
    collected: save.collected ?? base.collected,
    history: save.history ?? [],
  }
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return initialState()
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<GameState> & { version?: number }
    if (!parsed || !Array.isArray(parsed.cards)) return initialState()
    if (parsed.version === 1 || parsed.version === 2) {
      return migrate(parsed as unknown as LegacySave)
    }
    if (parsed.version !== SAVE_VERSION) return initialState()
    const state = { ...initialState(), ...parsed } as GameState
    return { ...state, cards: normalizeCards(state.cards) }
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
