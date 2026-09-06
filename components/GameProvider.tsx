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
import type { Currency, ItemId } from '../lib/items'
import { loadTuning } from '../lib/configSync'
import { todayKey, type MissionId } from '../lib/daily'
import { FUSION_FEE, FUSION_SIZE, checkFusion, fusionResult } from '../lib/fusion'
import { reducer, type MatchLineup, type RoundResult } from '../lib/gameReducer'
import type { Fixture } from '../lib/league'
import { REFRESH_COST, rollListings, type Listing } from '../lib/market'
import { exchangeResult, type ShardOffer } from '../lib/shards'
import type { TacticSetup } from '../lib/tactics'
import type { PhasedTactics } from '../lib/tactics/phases'
import { clearSave, initialState, loadState, newCard, saveState } from '../lib/storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef, Squad } from '../lib/types'
import { useAccountSync, type AccountApi } from './useAccountSync'

export interface GameApi {
  state: GameState
  ready: boolean
  addCards: (players: PlayerDef[], options?: AddCardsOptions) => Card[]
  exchangeShards: (offer: ShardOffer) => PlayerDef | null
  sell: (uids: string[]) => void
  /** Locks or unlocks a card — a locked card cannot be sold, released, fused, or used as material. */
  toggleLock: (uid: string) => void
  trainCard: (uid: string, materialUids: string[]) => void
  limitBreakCard: (uid: string, materialUid: string) => void
  fuse: (uids: string[]) => PlayerDef | null
  assign: (slotId: string, uid: string) => void
  clearSlot: (slotId: string) => void
  setFormation: (formation: FormationKey) => void
  setTactic: (tactic: TacticSetup) => void
  setPlan: (plan: PhasedTactics) => void
  buyItem: (id: ItemId, currency: Currency, count: number) => void
  spendItemOnCard: (id: ItemId, uid: string) => void
  spendItemOnClub: (id: ItemId, listings?: Listing[]) => void
  setAutoSub: (enabled: boolean) => void
  assignBench: (index: number, uid: string) => void
  clearBench: (index: number) => void
  /** Rebuilds the line-up; with a club, that club's players are placed first. */
  autoFillSquad: (preferClub?: string) => void
  /** Replace the working lineup wholesale — undo, or load a kept lineup (`commit` confirms it too). */
  restoreLineup: (squad: Squad, tactic: TacticSetup, plan?: PhasedTactics, commit?: boolean) => void
  /** 저장: the working lineup becomes the confirmed one. */
  commitLineup: () => void
  saveLineup: (index: number, name: string) => void
  deleteLineup: (index: number) => void
  finishMatch: (
    result: MatchResult,
    fixture: Fixture,
    others: RoundResult[],
    lineup: MatchLineup,
  ) => void
  finishCupMatch: (result: MatchResult, myRating: number, lineup: MatchLineup) => void
  skipMatchday: () => void
  playMiniGame: (result: MatchResult, lineup: MatchLineup) => void
  playPvpMatch: (result: MatchResult, lineup: MatchLineup) => void
  startNewSeason: () => void
  buyListing: (listing: Listing) => void
  refreshMarket: () => void
  treatInjury: (uid: string) => void
  restoreCondition: (uid: string) => void
  claimMission: (id: MissionId) => void
  grantGold: (amount: number) => void
  grantItems: (items: { id: ItemId; count: number }[]) => void
  /** Adds gifted cards (by player id) to the collection — used by the 선물함. */
  grantCards: (playerIds: string[]) => void
  consumeItem: (id: ItemId) => void
  finishGuide: () => void
  renameClub: (club: string) => void
  expandVault: () => void
  reset: () => void
  /** Account, cloud save and board sign in. Off until Supabase is configured. */
  account: AccountApi
}

export interface AddCardsOptions {
  cost?: number
  free?: boolean
  /** Pity counter after this pull. */
  pity?: number
}

const GameContext = createContext<GameApi | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  // The operator's balance settings, read once before anything is played.
  // If the server cannot be reached the compiled defaults stand.
  useEffect(() => {
    void loadTuning()
  }, [])

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

  const hydrate = useCallback((next: GameState) => dispatch({ type: 'hydrate', state: next }), [])
  const account = useAccountSync(state, hydrate, ready)

  const api = useMemo<GameApi>(
    () => ({
      state,
      ready,
      account,
      addCards,
      fuse,
      exchangeShards: (offer: ShardOffer) => {
        if (state.shards < offer.cost) return null
        const player = exchangeResult(offer.rarity)
        dispatch({ type: 'exchangeShards', offer, player })
        return player
      },
      sell: (uids: string[]) => dispatch({ type: 'sell', uids }),
      toggleLock: (uid: string) => dispatch({ type: 'toggleLock', uid }),
      trainCard: (uid: string, materialUids: string[]) =>
        dispatch({ type: 'trainCard', uid, materialUids }),
      limitBreakCard: (uid: string, materialUid: string) =>
        dispatch({ type: 'limitBreak', uid, materialUid }),
      assign: (slotId: string, uid: string) => dispatch({ type: 'assign', slotId, uid }),
      clearSlot: (slotId: string) => dispatch({ type: 'clearSlot', slotId }),
      setFormation: (formation: FormationKey) => dispatch({ type: 'setFormation', formation }),
      setTactic: (tactic: TacticSetup) => dispatch({ type: 'setTactic', tactic }),
      setPlan: (plan: PhasedTactics) => dispatch({ type: 'setPlan', plan }),
      setAutoSub: (enabled: boolean) => dispatch({ type: 'setAutoSub', enabled }),
      buyItem: (id: ItemId, currency: Currency, count: number) =>
        dispatch({ type: 'buyItem', id, currency, count }),
      spendItemOnCard: (id: ItemId, uid: string) => dispatch({ type: 'spendItemOnCard', id, uid }),
      spendItemOnClub: (id: ItemId, listings?: Listing[]) =>
        dispatch({ type: 'spendItemOnClub', id, listings }),
      assignBench: (index: number, uid: string) => dispatch({ type: 'assignBench', index, uid }),
      clearBench: (index: number) => dispatch({ type: 'clearBench', index }),
      autoFillSquad: (preferClub?: string) => dispatch({ type: 'autoFill', preferClub }),
      restoreLineup: (squad: Squad, tactic: TacticSetup, plan?: PhasedTactics, commit?: boolean) =>
        dispatch({ type: 'restoreLineup', squad, tactic, plan, commit }),
      commitLineup: () => dispatch({ type: 'commitLineup' }),
      saveLineup: (index: number, name: string) => dispatch({ type: 'saveLineup', index, name }),
      deleteLineup: (index: number) => dispatch({ type: 'deleteLineup', index }),
      finishMatch: (
        result: MatchResult,
        fixture: Fixture,
        others: RoundResult[],
        lineup: MatchLineup,
      ) => dispatch({ type: 'match', result, fixture, others, lineup }),
      finishCupMatch: (result: MatchResult, myRating: number, lineup: MatchLineup) =>
        dispatch({ type: 'cupMatch', result, myRating, lineup }),
      playMiniGame: (result: MatchResult, lineup: MatchLineup) =>
        dispatch({ type: 'miniGame', result, lineup }),
      playPvpMatch: (result: MatchResult, lineup: MatchLineup) =>
        dispatch({ type: 'pvpMatch', result, lineup }),
      skipMatchday: () => dispatch({ type: 'skipMatchday' }),
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
      grantGold: (amount: number) => dispatch({ type: 'grantGold', amount }),
      grantItems: (items: { id: ItemId; count: number }[]) => dispatch({ type: 'grantItems', items }),
      grantCards: (playerIds: string[]) => dispatch({ type: 'grantCards', playerIds }),
      consumeItem: (id: ItemId) => dispatch({ type: 'consumeItem', id }),
      finishGuide: () => dispatch({ type: 'finishGuide' }),
      renameClub: (club: string) => dispatch({ type: 'renameClub', club }),
      expandVault: () => dispatch({ type: 'expandVault' }),
      reset: () => {
        clearSave()
        dispatch({ type: 'reset' })
      },
    }),
    [state, ready, account, addCards, fuse],
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
