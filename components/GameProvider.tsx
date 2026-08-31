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
import { type MissionId } from '../lib/daily'
import { FUSION_FEE, FUSION_SIZE, checkFusion, fusionResult } from '../lib/fusion'
import { reducer, type RoundResult } from '../lib/gameReducer'
import type { Fixture } from '../lib/league'
import type { TacticKey } from '../lib/tactics'
import { clearSave, initialState, loadState, newUid, saveState } from '../lib/storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef } from '../lib/types'

export interface GameApi {
  state: GameState
  ready: boolean
  addCards: (players: PlayerDef[], cost: number, free?: boolean) => Card[]
  sell: (uids: string[]) => void
  sellDuplicates: () => void
  train: (uid: string) => void
  fuse: (uids: string[]) => PlayerDef | null
  assign: (slotId: string, uid: string) => void
  clearSlot: (slotId: string) => void
  setFormation: (formation: FormationKey) => void
  setTactic: (tactic: TacticKey) => void
  autoFillSquad: () => void
  finishMatch: (result: MatchResult, fixture: Fixture, others: RoundResult[]) => void
  startNewSeason: () => void
  claimMission: (id: MissionId) => void
  finishGuide: () => void
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
    dispatch({ type: 'refreshDaily' })
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  const addCards = useCallback((players: PlayerDef[], cost: number, free = false) => {
    const cards = players.map((player) => ({ uid: newUid(), playerId: player.id, level: 1 }))
    dispatch({ type: 'addCards', cards, cost, free })
    return cards
  }, [])

  const fuse = useCallback(
    (uids: string[]) => {
      const check = checkFusion(state.cards, uids, state.squad, state.gold)
      if (!check.ok || !check.to) return null
      const player = fusionResult(check.to)
      dispatch({ type: 'fuse', uids, player })
      return player
    },
    [state.cards, state.squad, state.gold],
  )

  const api = useMemo<GameApi>(
    () => ({
      state,
      ready,
      addCards,
      fuse,
      sell: (uids: string[]) => dispatch({ type: 'sell', uids }),
      sellDuplicates: () => dispatch({ type: 'sellSpares' }),
      train: (uid: string) => dispatch({ type: 'train', uid }),
      assign: (slotId: string, uid: string) => dispatch({ type: 'assign', slotId, uid }),
      clearSlot: (slotId: string) => dispatch({ type: 'clearSlot', slotId }),
      setFormation: (formation: FormationKey) => dispatch({ type: 'setFormation', formation }),
      setTactic: (tactic: TacticKey) => dispatch({ type: 'setTactic', tactic }),
      autoFillSquad: () => dispatch({ type: 'autoFill' }),
      finishMatch: (result: MatchResult, fixture: Fixture, others: RoundResult[]) =>
        dispatch({ type: 'match', result, fixture, others }),
      startNewSeason: () => dispatch({ type: 'newSeason' }),
      claimMission: (id: MissionId) => dispatch({ type: 'claimMission', id }),
      finishGuide: () => dispatch({ type: 'finishGuide' }),
      renameClub: (club: string) => dispatch({ type: 'renameClub', club }),
      reset: () => {
        clearSave()
        dispatch({ type: 'reset' })
      },
    }),
    [state, ready, addCards, fuse],
  )

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside <GameProvider>')
  return context
}

export { FUSION_FEE, FUSION_SIZE }
export type { RoundResult }
