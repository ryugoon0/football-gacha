import {
  DAILY_MISSIONS,
  missionClaimable,
  rollOver,
  todayKey,
  type DailyState,
  type MissionId,
} from './daily'
import { applyMatchWear, recoveryCost, treatmentCost, MAX_CONDITION } from './condition'
import { createCup, cupReward, resolveCupRound } from './cup'
import { emptySlots } from './formations'
import { FUSION_FEE, checkFusion } from './fusion'
import { applyExperience, matchRatings, maxLevelOf, type PlayerRating } from './growth'
import {
  MY_TEAM_ID,
  ROUNDS_PER_SEASON,
  createSeason,
  recordResult,
  seasonOutcome,
  simulateAiMatch,
  type Fixture,
} from './league'
import { dailyMarket, type Listing } from './market'
import { FORMATIONS } from './formations'
import { getPlayer } from './players'
import { RARITY_STYLES, trainCost } from './rarity'
import { autoFill } from './squad'
import type { TacticKey } from './tactics'
import { initialState, newCard, newUid } from './storage'
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
  | { type: 'cupMatch'; result: MatchResult; myRating: number }
  | { type: 'newSeason' }
  | { type: 'ensureMarket'; date: string }
  | { type: 'refreshMarket'; listings: Listing[]; cost: number }
  | { type: 'buy'; listing: Listing }
  | { type: 'treat'; uid: string }
  | { type: 'recover'; uid: string }
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

function logMatch(
  state: GameState,
  competition: 'league' | 'cup',
  result: MatchResult,
  reward: number,
): GameState['history'] {
  return [
    {
      id: newUid(),
      competition,
      opponent: result.opponent,
      scoreFor: result.scoreFor,
      scoreAgainst: result.scoreAgainst,
      result: result.result,
      reward,
      at: Date.now(),
    },
    ...state.history,
  ].slice(0, 20)
}

/** Marks the starters, banks their experience and tires them out. */
function afterMatch(
  state: GameState,
  result: MatchResult,
): { cards: Card[]; ratings: PlayerRating[] } {
  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const byUid = new Map(state.cards.map((card) => [card.uid, card]))

  const starters = formation.slots.flatMap((slot) => {
    const uid = state.squad.slots[slot.id]
    const card = uid ? byUid.get(uid) : undefined
    const player = card ? getPlayer(card.playerId) : undefined
    // An injured player did not actually take the pitch.
    if (!card || !player || card.injuredFor > 0) return []
    return [{ uid: card.uid, player, position: slot.position as string }]
  })

  const ratings = matchRatings(
    starters,
    { result: result.result, scoreAgainst: result.scoreAgainst },
    result.scorerUids,
  )
  const grown = applyExperience(state.cards, ratings)
  const worn = applyMatchWear(
    grown.cards,
    starters.map((starter) => starter.uid),
  )
  return {
    cards: worn.cards,
    ratings: ratings.map((rating) => ({
      ...rating,
      levelUp: grown.levelUps.some((levelUp) => levelUp.uid === rating.uid),
    })),
  }
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
      // Potential caps how far a card can be trained.
      if (!card || !player || card.level >= maxLevelOf(player)) return state
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
      const card = newCard(action.player.id)
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

      const { cards, ratings } = afterMatch(state, result)

      return {
        ...state,
        gold: state.gold + result.reward,
        cards,
        lastRatings: ratings,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        season,
        daily: result.result === 'W' ? bumpMission(state, 'win', 1) : today(state),
        history: logMatch(state, 'league', result, result.reward),
      }
    }

    case 'cupMatch': {
      const { result, myRating } = action
      if (state.cup.eliminated || state.cup.champion) return state

      const round = state.cup.round
      const { cup, advanced } = resolveCupRound(
        state.cup,
        result.scoreFor,
        result.scoreAgainst,
        myRating,
        simulateAiMatch,
      )
      const reward = cupReward(round, advanced)
      const wonTheCup = cup.champion === MY_TEAM_ID
      const record = { ...state.record }
      if (result.result === 'W') record.w += 1
      else if (result.result === 'D') record.d += 1
      else record.l += 1

      const { cards, ratings } = afterMatch(state, result)

      return {
        ...state,
        gold: state.gold + reward,
        cards,
        lastRatings: ratings,
        cup,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        trophies: wonTheCup ? { ...state.trophies, cup: state.trophies.cup + 1 } : state.trophies,
        daily: result.result === 'W' ? bumpMission(state, 'win', 1) : today(state),
        history: logMatch(state, 'cup', result, reward),
      }
    }

    case 'ensureMarket':
      if (state.market.date === action.date) return state
      return { ...state, market: dailyMarket(action.date, state.season.division) }

    case 'refreshMarket': {
      if (state.gold < action.cost) return state
      return {
        ...state,
        gold: state.gold - action.cost,
        market: { ...state.market, listings: action.listings },
      }
    }

    case 'buy': {
      const { listing } = action
      if (state.gold < listing.price) return state
      if (!state.market.listings.some((item) => item.id === listing.id)) return state
      return {
        ...state,
        gold: state.gold - listing.price,
        cards: [...state.cards, newCard(listing.playerId)],
        collected: Array.from(new Set([...state.collected, listing.playerId])),
        market: {
          ...state.market,
          listings: state.market.listings.filter((item) => item.id !== listing.id),
        },
      }
    }

    case 'treat': {
      const card = state.cards.find((item) => item.uid === action.uid)
      if (!card || card.injuredFor === 0) return state
      const cost = treatmentCost(card)
      if (state.gold < cost) return state
      return {
        ...state,
        gold: state.gold - cost,
        cards: state.cards.map((item) =>
          item.uid === action.uid ? { ...item, injuredFor: 0 } : item,
        ),
      }
    }

    case 'recover': {
      const card = state.cards.find((item) => item.uid === action.uid)
      if (!card || card.condition >= MAX_CONDITION) return state
      const cost = recoveryCost(card)
      if (state.gold < cost) return state
      return {
        ...state,
        gold: state.gold - cost,
        cards: state.cards.map((item) =>
          item.uid === action.uid ? { ...item, condition: MAX_CONDITION } : item,
        ),
      }
    }

    case 'newSeason': {
      if (!state.season.finished) return state
      const outcome = seasonOutcome(state.season)
      const index = state.season.index + 1
      return {
        ...state,
        gold: state.gold + outcome.reward,
        season: createSeason(outcome.nextDivision, index, state.club),
        cup: createCup(outcome.nextDivision, index, state.club),
        market: { ...state.market, date: '' },
        trophies: outcome.promoted
          ? { ...state.trophies, promotions: state.trophies.promotions + 1 }
          : state.trophies,
        // Everyone comes back fresh for the new campaign.
        cards: state.cards.map((card) => ({ ...card, condition: MAX_CONDITION, injuredFor: 0 })),
        lastRatings: [],
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
      const rename = <T extends { id: string; name: string }>(team: T): T =>
        team.id === MY_TEAM_ID ? { ...team, name: club } : team
      return {
        ...state,
        club,
        season: { ...state.season, teams: state.season.teams.map(rename) },
        cup: { ...state.cup, teams: state.cup.teams.map(rename) },
      }
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
