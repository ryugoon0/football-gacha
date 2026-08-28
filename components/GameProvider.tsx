'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { emptySlots } from '../lib/formations'
import { getPlayer } from '../lib/players'
import { MAX_LEVEL, RARITY_STYLES, trainCost } from '../lib/rarity'
import { PROMOTION_POINTS, TOP_DIVISION } from '../lib/match'
import { autoFill } from '../lib/squad'
import { clearSave, initialState, loadState, newUid, saveState } from '../lib/storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef } from '../lib/types'

type Action =
  | { type: 'hydrate'; state: GameState }
  | { type: 'addCards'; cards: Card[]; cost: number }
  | { type: 'sell'; uids: string[] }
  | { type: 'sellSpares' }
  | { type: 'train'; uid: string }
  | { type: 'assign'; slotId: string; uid: string }
  | { type: 'clearSlot'; slotId: string }
  | { type: 'setFormation'; formation: FormationKey }
  | { type: 'autoFill' }
  | { type: 'match'; result: MatchResult }
  | { type: 'renameClub'; club: string }
  | { type: 'reset' }

function withoutCards(state: GameState, uids: Set<string>): GameState {
  const slots = { ...state.squad.slots }
  for (const slotId of Object.keys(slots)) {
    if (slots[slotId] && uids.has(slots[slotId]!)) slots[slotId] = null
  }
  return {
    ...state,
    cards: state.cards.filter((card) => !uids.has(card.uid)),
    squad: { ...state.squad, slots },
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'addCards': {
      const cards = [...state.cards, ...action.cards]
      const collected = new Set(state.collected)
      for (const card of action.cards) collected.add(card.playerId)
      return {
        ...state,
        gold: Math.max(0, state.gold - action.cost),
        cards,
        collected: Array.from(collected),
      }
    }

    case 'sell': {
      const uids = new Set(action.uids)
      const income = state.cards
        .filter((card) => uids.has(card.uid))
        .reduce((sum, card) => {
          const player = getPlayer(card.playerId)
          if (!player) return sum
          const style = RARITY_STYLES[player.rarity]
          return sum + style.sell + (card.level - 1) * Math.round(style.sell * 0.3)
        }, 0)
      const next = withoutCards(state, uids)
      return { ...next, gold: state.gold + income }
    }

    case 'sellSpares':
      return sellSpares(state)

    case 'train': {
      const card = state.cards.find((item) => item.uid === action.uid)
      const player = card ? getPlayer(card.playerId) : undefined
      if (!card || !player || card.level >= MAX_LEVEL) return state
      const cost = trainCost(player.rarity, card.level)
      if (state.gold < cost) return state
      return {
        ...state,
        gold: state.gold - cost,
        cards: state.cards.map((item) =>
          item.uid === action.uid ? { ...item, level: item.level + 1 } : item,
        ),
      }
    }

    case 'assign': {
      const slots = { ...state.squad.slots }
      const previousSlot = Object.keys(slots).find((slotId) => slots[slotId] === action.uid)
      const displaced = slots[action.slotId] ?? null
      slots[action.slotId] = action.uid
      // Moving a player already on the pitch swaps the two slots.
      if (previousSlot && previousSlot !== action.slotId) slots[previousSlot] = displaced
      return { ...state, squad: { ...state.squad, slots } }
    }

    case 'clearSlot':
      return {
        ...state,
        squad: { ...state.squad, slots: { ...state.squad.slots, [action.slotId]: null } },
      }

    case 'setFormation': {
      if (action.formation === state.squad.formation) return state
      const slots = emptySlots(action.formation)
      // Keep whoever was already lined up in a slot the new shape still has.
      for (const slotId of Object.keys(slots)) {
        const existing = state.squad.slots[slotId]
        if (existing && state.cards.some((card) => card.uid === existing)) slots[slotId] = existing
      }
      return { ...state, squad: { formation: action.formation, slots } }
    }

    case 'autoFill':
      return { ...state, squad: autoFill(state.cards, state.squad) }

    case 'match': {
      const { result } = action
      const record = { ...state.record }
      if (result.result === 'W') record.w += 1
      else if (result.result === 'D') record.d += 1
      else record.l += 1

      let points = state.points + (result.result === 'W' ? 3 : result.result === 'D' ? 1 : 0)
      let division = state.division
      if (points >= PROMOTION_POINTS && division > TOP_DIVISION) {
        division -= 1
        points -= PROMOTION_POINTS
      }

      return {
        ...state,
        gold: state.gold + result.reward,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        points,
        division,
        history: [
          {
            id: newUid(),
            opponent: result.opponent,
            scoreFor: result.scoreFor,
            scoreAgainst: result.scoreAgainst,
            result: result.result,
            reward: result.reward,
            at: Date.now(),
          },
          ...state.history,
        ].slice(0, 20),
      }
    }

    case 'renameClub':
      return { ...state, club: action.club.slice(0, 20) || state.club }

    case 'reset':
      return initialState()

    default:
      return state
  }
}

export interface GameApi {
  state: GameState
  ready: boolean
  addCards: (players: PlayerDef[], cost: number) => Card[]
  sell: (uids: string[]) => void
  sellDuplicates: () => void
  train: (uid: string) => void
  assign: (slotId: string, uid: string) => void
  clearSlot: (slotId: string) => void
  setFormation: (formation: FormationKey) => void
  autoFillSquad: () => void
  finishMatch: (result: MatchResult) => void
  renameClub: (club: string) => void
  reset: () => void
}

const GameContext = createContext<GameApi | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [ready, setReady] = useState(false)

  // The saved game only exists in the browser, so it is read after mount to
  // keep the server-rendered markup and the first client render identical.
  useEffect(() => {
    dispatch({ type: 'hydrate', state: loadState() })
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  const addCards = useCallback((players: PlayerDef[], cost: number) => {
    const cards = players.map((player) => ({ uid: newUid(), playerId: player.id, level: 1 }))
    dispatch({ type: 'addCards', cards, cost })
    return cards
  }, [])

  const api = useMemo<GameApi>(
    () => ({
      state,
      ready,
      addCards,
      sell: (uids: string[]) => dispatch({ type: 'sell', uids }),
      sellDuplicates: () => dispatch({ type: 'sellSpares' }),
      train: (uid: string) => dispatch({ type: 'train', uid }),
      assign: (slotId: string, uid: string) => dispatch({ type: 'assign', slotId, uid }),
      clearSlot: (slotId: string) => dispatch({ type: 'clearSlot', slotId }),
      setFormation: (formation: FormationKey) => dispatch({ type: 'setFormation', formation }),
      autoFillSquad: () => dispatch({ type: 'autoFill' }),
      finishMatch: (result: MatchResult) => dispatch({ type: 'match', result }),
      renameClub: (club: string) => dispatch({ type: 'renameClub', club }),
      reset: () => {
        clearSave()
        dispatch({ type: 'reset' })
      },
    }),
    [state, ready, addCards],
  )

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

/** Sells every spare copy that is not in the starting eleven. */
function sellSpares(state: GameState): GameState {
  const inSquad = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
  const keptByPlayer = new Map<string, Card>()
  const spares: string[] = []

  for (const card of state.cards) {
    if (inSquad.has(card.uid)) {
      keptByPlayer.set(card.playerId, card)
    }
  }
  for (const card of state.cards) {
    if (inSquad.has(card.uid)) continue
    const kept = keptByPlayer.get(card.playerId)
    if (!kept) {
      keptByPlayer.set(card.playerId, card)
      continue
    }
    if (!inSquad.has(kept.uid) && card.level > kept.level) {
      keptByPlayer.set(card.playerId, card)
      spares.push(kept.uid)
    } else {
      spares.push(card.uid)
    }
  }

  if (spares.length === 0) return state
  return reducer(state, { type: 'sell', uids: spares })
}

export function useGame(): GameApi {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside <GameProvider>')
  return context
}
