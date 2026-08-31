import {
  DAILY_MISSIONS,
  missionClaimable,
  rollOver,
  todayKey,
  type DailyState,
  type MissionId,
} from './daily'
import { emptySlots } from './formations'
import { FUSION_FEE, checkFusion } from './fusion'
import { MY_TEAM_ID, ROUNDS_PER_SEASON, createSeason, recordResult, seasonOutcome, type Fixture } from './league'
import { getPlayer } from './players'
import { MAX_LEVEL, RARITY_STYLES, trainCost } from './rarity'
import { autoFill } from './squad'
import type { TacticKey } from './tactics'
import { initialState, newUid } from './storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef } from './types'

export interface RoundResult {
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

export type Action =
  | { type: 'hydrate'; state: GameState }
  | { type: 'refreshDaily' }
  | { type: 'addCards'; cards: Card[]; cost: number; free?: boolean }
  | { type: 'sell'; uids: string[] }
  | { type: 'sellSpares' }
  | { type: 'train'; uid: string }
  | { type: 'fuse'; uids: string[]; player: PlayerDef }
  | { type: 'assign'; slotId: string; uid: string }
  | { type: 'clearSlot'; slotId: string }
  | { type: 'setFormation'; formation: FormationKey }
  | { type: 'setTactic'; tactic: TacticKey }
  | { type: 'autoFill' }
  | { type: 'match'; result: MatchResult; fixture: Fixture; others: RoundResult[] }
  | { type: 'newSeason' }
  | { type: 'claimMission'; id: MissionId }
  | { type: 'finishGuide' }
  | { type: 'renameClub'; club: string }
  | { type: 'reset' }

function today(state: GameState): DailyState {
  return rollOver(state.daily, todayKey())
}

function bumpMission(state: GameState, id: MissionId, amount: number): DailyState {
  const daily = today(state)
  return { ...daily, progress: { ...daily.progress, [id]: (daily.progress[id] ?? 0) + amount } }
}

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

function sellPrice(card: Card): number {
  const player = getPlayer(card.playerId)
  if (!player) return 0
  const style = RARITY_STYLES[player.rarity]
  return style.sell + (card.level - 1) * Math.round(style.sell * 0.3)
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'refreshDaily': {
      const daily = today(state)
      return daily === state.daily ? state : { ...state, daily }
    }

    case 'addCards': {
      const collected = new Set(state.collected)
      for (const card of action.cards) collected.add(card.playerId)
      const daily = bumpMission(state, 'draw', action.cards.length)
      return {
        ...state,
        gold: Math.max(0, state.gold - action.cost),
        cards: [...state.cards, ...action.cards],
        collected: Array.from(collected),
        daily: action.free ? { ...daily, freeDrawUsed: true } : daily,
      }
    }

    case 'sell': {
      const uids = new Set(action.uids)
      const income = state.cards
        .filter((card) => uids.has(card.uid))
        .reduce((sum, card) => sum + sellPrice(card), 0)
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
        daily: bumpMission(state, 'train', 1),
      }
    }

    case 'fuse': {
      const check = checkFusion(state.cards, action.uids, state.squad, state.gold)
      if (!check.ok) return state
      const next = withoutCards(state, new Set(action.uids))
      const card: Card = { uid: newUid(), playerId: action.player.id, level: 1 }
      return {
        ...next,
        gold: state.gold - FUSION_FEE,
        cards: [...next.cards, card],
        collected: Array.from(new Set([...state.collected, action.player.id])),
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

    case 'setTactic':
      return { ...state, tactic: action.tactic }

    case 'autoFill':
      return { ...state, squad: autoFill(state.cards, state.squad) }

    case 'match': {
      const { result, fixture, others } = action
      const record = { ...state.record }
      if (result.result === 'W') record.w += 1
      else if (result.result === 'D') record.d += 1
      else record.l += 1

      const iAmHome = fixture.home === MY_TEAM_ID
      let season = recordResult(
        state.season,
        fixture.home,
        fixture.away,
        iAmHome ? result.scoreFor : result.scoreAgainst,
        iAmHome ? result.scoreAgainst : result.scoreFor,
      )
      for (const other of others) {
        season = recordResult(season, other.home, other.away, other.homeGoals, other.awayGoals)
      }
      const round = season.round + 1
      season = { ...season, round, finished: round >= ROUNDS_PER_SEASON }

      return {
        ...state,
        gold: state.gold + result.reward,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        season,
        daily: result.result === 'W' ? bumpMission(state, 'win', 1) : today(state),
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

    case 'newSeason': {
      if (!state.season.finished) return state
      const outcome = seasonOutcome(state.season)
      return {
        ...state,
        gold: state.gold + outcome.reward,
        season: createSeason(outcome.nextDivision, state.season.index + 1, state.club),
      }
    }

    case 'claimMission': {
      const daily = today(state)
      const mission = DAILY_MISSIONS.find((item) => item.id === action.id)
      if (!mission || !missionClaimable(daily, mission)) {
        return daily === state.daily ? state : { ...state, daily }
      }
      return {
        ...state,
        gold: state.gold + mission.reward,
        daily: { ...daily, claimed: [...daily.claimed, mission.id] },
      }
    }

    case 'finishGuide':
      return { ...state, guideDone: true }

    case 'renameClub': {
      const club = action.club.trim().slice(0, 20) || state.club
      const teams = state.season.teams.map((team) =>
        team.id === MY_TEAM_ID ? { ...team, name: club } : team,
      )
      return { ...state, club, season: { ...state.season, teams } }
    }

    case 'reset':
      return initialState()

    default:
      return state
  }
}

/** Sells every spare copy that is not in the starting eleven. */
export function sellSpares(state: GameState): GameState {
  const inSquad = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
  const keptByPlayer = new Map<string, Card>()
  const spares: string[] = []

  for (const card of state.cards) {
    if (inSquad.has(card.uid)) keptByPlayer.set(card.playerId, card)
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
