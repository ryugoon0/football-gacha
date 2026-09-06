import { MAX_CONDITION } from './condition'
import { normalizeInventory } from './items'
import { createCup } from './cup'
import { freshDaily } from './daily'
import { FORMATION_KEYS, emptySlots } from './formations'
import { newCardLevel } from './growth'
import { BOTTOM_DIVISION, createSeason } from './league'
import { emptyMarket } from './market'
import { getPlayer } from './players'
import { DEFAULT_TACTIC, normalizeTactic } from './tactics'
import { paramsFromSetup } from './tactics/bridge'
import { normalizePhased, phasedFrom } from './tactics/phases'
import { BASE_CAPACITY, normalizeCapacity } from './vault'
import { BENCH_SIZE } from './squad'
import { migrateCollection } from './rosterMigration'
import type { Card, FormationKey, GameState, LineupBase, SavedLineup, Squad } from './types'

/**
 * The card and season model changed shape, so this save lives under a new key:
 * older games start fresh rather than loading into a broken state.
 */
export const SAVE_KEY = 'football-day-save-v2'
export const SAVE_VERSION = 10
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
      ...(typeof card.suspendedFor === 'number' ? { suspendedFor: card.suspendedFor } : {}),
      ...(typeof card.yellows === 'number' ? { yellows: card.yellows } : {}),
      ...(card.locked === true ? { locked: true } : {}),
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
    plan: phasedFrom(paramsFromSetup(DEFAULT_TACTIC)),
    autoSub: true,
    season: createSeason(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    cup: createCup(BOTTOM_DIVISION, 1, DEFAULT_CLUB),
    matchday: 0,
    market: emptyMarket(),
    trophies: { cup: 0, promotions: 0 },
    shards: 0,
    items: {},
    capacity: BASE_CAPACITY,
    pity: 0,
    pulls: { total: 0, byRarity: { Normal: 0, Rare: 0, Legend: 0, Live: 0, World: 0 } },
    lastRatings: [],
    lastSubs: [],
    seasonStats: {},
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

/**
 * Rebuilds a usable line-up out of whatever the save claims to hold. A missing
 * or malformed squad used to render a blank screen with no way back, so every
 * field is checked and anything unrecognised falls back to an empty sheet.
 */
export function normalizeSquad(value: unknown): Squad {
  const fallback = { formation: '4-3-3' as FormationKey, slots: emptySlots('4-3-3'), bench: [] }
  const squad = (value && typeof value === 'object' ? value : fallback) as Partial<Squad>

  const formation = FORMATION_KEYS.includes(squad.formation as FormationKey)
    ? (squad.formation as FormationKey)
    : '4-3-3'

  // Only the slots this formation actually has, and only string uids.
  const slots = emptySlots(formation)
  const saved = squad.slots && typeof squad.slots === 'object' ? squad.slots : {}
  for (const slotId of Object.keys(slots)) {
    const uid = (saved as Record<string, unknown>)[slotId]
    slots[slotId] = typeof uid === 'string' ? uid : null
  }

  const savedBench = Array.isArray(squad.bench) ? squad.bench : []
  const bench = Array.from({ length: BENCH_SIZE }, (_, index) => {
    const uid = savedBench[index]
    return typeof uid === 'string' ? uid : null
  })

  return { formation, slots, bench }
}

/**
 * Turns anything claiming to be a save into one this build can run, or null if
 * it is not a save at all. Every entry point — local storage and the cloud copy
 * — goes through here, so a corrupt or hand edited payload cannot reach the UI.
 */
export function normalizeSave(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<GameState> & { version?: number }
  if (!Array.isArray(parsed.cards)) return null
  // Version 6 stored the tactic as a single string and 7 had no vault size;
  // both migrate forward without losing a card.
  if (![SAVE_VERSION, 9, 8, 7, 6].includes(parsed.version ?? 0)) return null

  const state = { ...initialState(), ...parsed } as GameState
  const base = initialState()
  // Retired generated cards become their club's real-squad cards here, so a
  // save read anywhere comes out on the current roster (lib/rosterMigration.ts).
  const migrated = migrateCollection(
    normalizeCards(Array.isArray(state.cards) ? state.cards : []),
    Array.isArray(state.collected) ? state.collected : [],
    normalizeSquad(state.squad),
  )
  state.cards = migrated.cards
  state.collected = migrated.collected
  state.squad = migrated.squad
  const lineupBase = normalizeLineupBase(
    state.lineupBase && migrated.moved > 0
      ? { ...state.lineupBase, squad: migrateCollection(state.cards, [], normalizeSquad(state.lineupBase.squad)).squad }
      : state.lineupBase,
    state.cards,
  )
  return {
    ...state,
    // Unsaved squad edits do not survive a reload: the confirmed lineup stands.
    ...(lineupBase ? { squad: lineupBase.squad, tactic: lineupBase.tactic, plan: lineupBase.plan } : {}),
    lineupBase,
    version: SAVE_VERSION,
    cards: normalizeCards(state.cards),
    tactic: normalizeTactic(lineupBase?.tactic ?? state.tactic),
    // Saves from before the detailed plan existed get one built from their dials.
    plan: lineupBase
      ? lineupBase.plan
      : state.plan
        ? normalizePhased(state.plan)
        : phasedFrom(paramsFromSetup(normalizeTactic(state.tactic))),
    capacity: normalizeCapacity(state.capacity),
    squad: normalizeSquad(lineupBase?.squad ?? state.squad),
    // The rest of the save is only ever written by the game, but a hand edited
    // file should still not be able to take the screen down.
    gold: Number.isFinite(state.gold) ? Math.max(0, Math.floor(state.gold)) : base.gold,
    shards: Number.isFinite(state.shards) ? Math.max(0, Math.floor(state.shards)) : base.shards,
    // Anything the item list does not know about is dropped, so a hand-edited
    // save cannot invent an item the game has no rule for.
    items: normalizeInventory(state.items),
    // Saves from before this setting existed have no value at all, which reads
    // as off. Automatic substitution is the sensible default, so only an
    // explicit "no" turns it off.
    autoSub: state.autoSub !== false,
    matchday: Number.isFinite(state.matchday) ? Math.max(0, Math.floor(state.matchday)) : 0,
    season: state.season && typeof state.season === 'object' ? state.season : base.season,
    cup: state.cup && typeof state.cup === 'object' ? state.cup : base.cup,
    daily: state.daily && typeof state.daily === 'object' ? state.daily : base.daily,
    market: state.market && typeof state.market === 'object' ? state.market : base.market,
    record: state.record && typeof state.record === 'object' ? state.record : base.record,
    trophies: state.trophies && typeof state.trophies === 'object' ? state.trophies : base.trophies,
    history: Array.isArray(state.history) ? state.history : [],
    collected: Array.isArray(state.collected) ? state.collected : [],
    lastRatings: Array.isArray(state.lastRatings) ? state.lastRatings : [],
    lastSubs: Array.isArray(state.lastSubs) ? state.lastSubs : [],
    seasonStats: state.seasonStats && typeof state.seasonStats === 'object' ? state.seasonStats : {},
    savedLineups: normalizeSavedLineups(state.savedLineups),
  }
}

/**
 * The confirmed lineup, checked like the working one; a card sold since is
 * dropped from it. Absent (older saves) stays absent — the squad tab then
 * confirms whatever lineup it finds.
 */
function normalizeLineupBase(value: unknown, cards: unknown): LineupBase | undefined {
  if (!value || typeof value !== 'object') return undefined
  const item = value as Partial<LineupBase>
  if (!item.squad || typeof item.squad !== 'object') return undefined
  const owned = new Set(Array.isArray(cards) ? (cards as { uid?: unknown }[]).map((card) => card?.uid).filter((uid): uid is string => typeof uid === 'string') : [])
  const squad = normalizeSquad(item.squad)
  const slots = Object.fromEntries(Object.entries(squad.slots).map(([slotId, uid]) => [slotId, uid && owned.has(uid) ? uid : null]))
  const tactic = normalizeTactic(item.tactic)
  return {
    squad: { ...squad, slots, bench: squad.bench.map((uid) => (uid && owned.has(uid) ? uid : null)) },
    tactic,
    plan: item.plan ? normalizePhased(item.plan) : phasedFrom(paramsFromSetup(tactic)),
  }
}

/** Three shelves; anything malformed becomes an empty shelf rather than a crash. */
function normalizeSavedLineups(value: unknown): (SavedLineup | null)[] {
  const list = Array.isArray(value) ? value : []
  return Array.from({ length: 3 }, (_, index) => {
    const item = list[index] as Partial<SavedLineup> | null | undefined
    if (!item || typeof item !== 'object' || !item.squad) return null
    return {
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 20) : `라인업 ${index + 1}`,
      squad: normalizeSquad(item.squad),
      tactic: normalizeTactic(item.tactic),
      plan: item.plan ? normalizePhased(item.plan) : undefined,
      savedAt: Number.isFinite(item.savedAt) ? Number(item.savedAt) : 0,
    }
  })
}

export function loadState(): GameState {
  if (typeof window === 'undefined') return initialState()
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return initialState()
    return normalizeSave(JSON.parse(raw)) ?? initialState()
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
