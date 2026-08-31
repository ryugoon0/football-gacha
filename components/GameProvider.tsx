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
import { todayKey, type MissionId } from '../lib/daily'
import { FUSION_FEE, FUSION_SIZE, checkFusion, fusionResult } from '../lib/fusion'
import { reducer, type RoundResult } from '../lib/gameReducer'
import type { Fixture } from '../lib/league'
import { REFRESH_COST, rollListings, type Listing } from '../lib/market'
import { exchangeResult, type ShardOffer } from '../lib/shards'
import type { TacticKey } from '../lib/tactics'
import { clearSave, initialState, loadState, newCard, saveState } from '../lib/storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef } from '../lib/types'

export interface GameApi {
  state: GameState
  ready: boolean
  addCards: (players: PlayerDef[], options?: AddCardsOptions) => Card[]
  exchangeShards: (offer: ShardOffer) => PlayerDef | null
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
  finishCupMatch: (result: MatchResult, myRating: number) => void
  startNewSeason: () => void
  buyListing: (listing: Listing) => void
  refreshMarket: () => void
  treatInjury: (uid: string) => void
  restoreCondition: (uid: string) => void
  claimMission: (id: MissionId) => void
  finishGuide: () => void
  renameClub: (club: string) => void
  reset: () => void
}

export interface AddCardsOptions {
  cost?: number
  free?: boolean
  /** Pity counter after this pull. */
  pity?: number
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
    dispatch({ type: 'ensureMarket', date: todayKey() })
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  const addCards = useCallback((players: PlayerDef[], options: AddCardsOptions = {}) => {
    const cards = players.map((player) => newCard(player.id))
    dispatch({
      type: 'addCards',
      cards,
      cost: options.cost ?? 0,
      free: options.free,
      pity: options.pity,
    })
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
      exchangeShards: (offer: ShardOffer) => {
        if (state.shards < offer.cost) return null
        const player = exchangeResult(offer.rarity)
        dispatch({ type: 'exchangeShards', offer, player })
        return player
      },
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
      finishCupMatch: (result: MatchResult, myRating: number) =>
        dispatch({ type: 'cupMatch', result, myRating }),
      startNewSeason: () => dispatch({ type: 'newSeason' }),
      buyListing: (listing: Listing) => dispatch({ type: 'buy', listing }),
      refreshMarket: () =>
        dispatch({
          type: 'refreshMarket',
          listings: rollListings(state.season.division),
          cost: REFRESH_COST,
        }),
      treatInjury: (uid: string) => dispatch({ type: 'treat', uid }),
      restoreCondition: (uid: string) => dispatch({ type: 'recover', uid }),
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
