import type { SubEvent } from './autoSub'
import { applyMatchWear, recoveryCost, treatmentCost, MAX_CONDITION } from './condition'
import { createCup, cupReward, resolveCupRound } from './cup'
import {
  DAILY_MISSIONS,
  missionClaimable,
  rollOver,
  todayKey,
  type DailyState,
  type MissionId,
} from './daily'
import { FORMATIONS, emptySlots } from './formations'
import { FUSION_FEE, checkFusion } from './fusion'
import {
  addExperience,
  applyExperience,
  limitBreak as raiseLimit,
  materialExp,
  matchRatings,
  trainingFee,
  type PlayerRating,
} from './growth'
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
import { getPlayer, levelCap } from './players'
import { autoFill } from './squad'
import { releaseValue, type ShardOffer } from './shards'
import { TOTAL_MATCHDAYS } from './schedule'
import type { TacticKey } from './tactics'
import { initialState, newCard, newUid } from './storage'
import type { Card, FormationKey, GameState, MatchResult, PlayerDef, Squad } from './types'

export interface RoundResult {
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

/** What the UI played the match with, after any automatic substitutions. */
export interface MatchLineup {
  squad: Squad
  subs: SubEvent[]
}

export type Action =
  | { type: 'hydrate'; state: GameState }
  | { type: 'refreshDaily' }
  | { type: 'addCards'; cards: Card[]; cost: number; free?: boolean; pity?: number }
  | { type: 'exchangeShards'; offer: ShardOffer; player: PlayerDef }
  | { type: 'sell'; uids: string[] }
  | { type: 'trainCard'; uid: string; materialUids: string[] }
  | { type: 'limitBreak'; uid: string; materialUid: string }
  | { type: 'fuse'; uids: string[]; player: PlayerDef }
  | { type: 'assign'; slotId: string; uid: string }
  | { type: 'clearSlot'; slotId: string }
  | { type: 'assignBench'; index: number; uid: string }
  | { type: 'clearBench'; index: number }
  | { type: 'setFormation'; formation: FormationKey }
  | { type: 'setTactic'; tactic: TacticKey }
  | { type: 'setAutoSub'; enabled: boolean }
  | { type: 'autoFill' }
  | {
      type: 'match'
      result: MatchResult
      fixture: Fixture
      others: RoundResult[]
      lineup: MatchLineup
    }
  | { type: 'cupMatch'; result: MatchResult; myRating: number; lineup: MatchLineup }
  | { type: 'skipMatchday' }
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

function withoutCards(state: GameState, uids: Set<string>): GameState {
  const slots = { ...state.squad.slots }
  for (const slotId of Object.keys(slots)) {
    if (slots[slotId] && uids.has(slots[slotId]!)) slots[slotId] = null
  }
  const bench = state.squad.bench.map((uid) => (uid && uids.has(uid) ? null : uid))
  return {
    ...state,
    cards: state.cards.filter((card) => !uids.has(card.uid)),
    squad: { ...state.squad, slots, bench },
  }
}

/** Marks the starters, banks their experience and tires them out. */
function afterMatch(
  state: GameState,
  result: MatchResult,
  lineup: MatchLineup,
): { cards: Card[]; ratings: PlayerRating[] } {
  const formation = FORMATIONS[lineup.squad.formation] ?? FORMATIONS['4-3-3']
  const byUid = new Map(state.cards.map((card) => [card.uid, card]))

  const starters = formation.slots.flatMap((slot) => {
    const uid = lineup.squad.slots[slot.id]
    const card = uid ? byUid.get(uid) : undefined
    const player = card ? getPlayer(card.playerId) : undefined
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
      const byRarity = { ...state.pulls.byRarity }
      for (const card of action.cards) {
        collected.add(card.playerId)
        const player = getPlayer(card.playerId)
        if (player) byRarity[player.rarity] += 1
      }
      const daily = bumpMission(state, 'draw', action.cards.length)
      return {
        ...state,
        gold: Math.max(0, state.gold - action.cost),
        cards: [...state.cards, ...action.cards],
        collected: Array.from(collected),
        pity: action.pity ?? state.pity,
        pulls: { total: state.pulls.total + action.cards.length, byRarity },
        daily: action.free ? { ...daily, freeDrawUsed: true } : daily,
      }
    }

    case 'exchangeShards': {
      const { offer, player } = action
      if (state.shards < offer.cost) return state
      return {
        ...state,
        shards: state.shards - offer.cost,
        cards: [...state.cards, newCard(player.id)],
        collected: Array.from(new Set([...state.collected, player.id])),
      }
    }

    case 'sell': {
      const uids = new Set(action.uids)
      const released = state.cards.filter((card) => uids.has(card.uid))
      const { gold, shards } = releaseValue(released)
      const next = withoutCards(state, uids)
      return { ...next, gold: state.gold + gold, shards: state.shards + shards }
    }

    case 'trainCard': {
      const target = state.cards.find((item) => item.uid === action.uid)
      if (!target || action.materialUids.length === 0) return state
      if (action.materialUids.includes(action.uid)) return state

      const materials = state.cards.filter((card) => action.materialUids.includes(card.uid))
      if (materials.length !== action.materialUids.length) return state

      const fee = trainingFee(target) * materials.length
      if (state.gold < fee) return state

      const exp = materials.reduce((sum, card) => sum + materialExp(card), 0)
      const trained = addExperience(target, exp)
      const consumed = new Set(action.materialUids)
      const next = withoutCards(state, consumed)

      return {
        ...next,
        gold: state.gold - fee,
        cards: next.cards.map((card) => (card.uid === action.uid ? trained.card : card)),
        daily: bumpMission(state, 'train', 1),
      }
    }

    case 'limitBreak': {
      const target = state.cards.find((item) => item.uid === action.uid)
      const material = state.cards.find((item) => item.uid === action.materialUid)
      if (!target || !material || target.uid === material.uid) return state
      // Only a copy of the very same player can raise the ceiling.
      if (target.playerId !== material.playerId) return state

      const player = getPlayer(target.playerId)
      if (!player || target.limit >= levelCap(player)) return state

      const raised = raiseLimit(target)
      if (!raised.raised) return state

      const next = withoutCards(state, new Set([material.uid]))
      return {
        ...next,
        cards: next.cards.map((card) => (card.uid === action.uid ? raised.card : card)),
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
      const bench = [...state.squad.bench]
      const previousSlot = Object.keys(slots).find((slotId) => slots[slotId] === action.uid)
      const benchIndex = bench.indexOf(action.uid)
      const displaced = slots[action.slotId] ?? null

      slots[action.slotId] = action.uid
      if (previousSlot && previousSlot !== action.slotId) slots[previousSlot] = displaced
      else if (benchIndex >= 0) bench[benchIndex] = displaced

      return { ...state, squad: { ...state.squad, slots, bench } }
    }

    case 'clearSlot': {
      const uid = state.squad.slots[action.slotId]
      const bench = [...state.squad.bench]
      const free = bench.indexOf(null)
      if (uid && free >= 0) bench[free] = uid
      return {
        ...state,
        squad: { ...state.squad, slots: { ...state.squad.slots, [action.slotId]: null }, bench },
      }
    }

    case 'assignBench': {
      const bench = [...state.squad.bench]
      const slots = { ...state.squad.slots }
      const previousIndex = bench.indexOf(action.uid)
      const startingSlot = Object.keys(slots).find((slotId) => slots[slotId] === action.uid)
      const displaced = bench[action.index] ?? null

      bench[action.index] = action.uid
      if (previousIndex >= 0 && previousIndex !== action.index) bench[previousIndex] = displaced
      else if (startingSlot) slots[startingSlot] = displaced

      return { ...state, squad: { ...state.squad, slots, bench } }
    }

    case 'clearBench': {
      const bench = [...state.squad.bench]
      bench[action.index] = null
      return { ...state, squad: { ...state.squad, bench } }
    }

    case 'setFormation': {
      if (action.formation === state.squad.formation) return state
      const slots = emptySlots(action.formation)
      const bench = [...state.squad.bench]
      for (const slotId of Object.keys(slots)) {
        const existing = state.squad.slots[slotId]
        if (existing && state.cards.some((card) => card.uid === existing)) slots[slotId] = existing
      }
      // Anyone who lost their slot drops to the bench if there is room.
      const kept = new Set(Object.values(slots).filter(Boolean) as string[])
      for (const uid of Object.values(state.squad.slots)) {
        if (!uid || kept.has(uid) || bench.includes(uid)) continue
        const free = bench.indexOf(null)
        if (free >= 0) bench[free] = uid
      }
      return { ...state, squad: { formation: action.formation, slots, bench } }
    }

    case 'setTactic':
      return { ...state, tactic: action.tactic }

    case 'setAutoSub':
      return { ...state, autoSub: action.enabled }

    case 'autoFill':
      return { ...state, squad: autoFill(state.cards, state.squad, state.season.division) }

    case 'match': {
      const { result, fixture, others, lineup } = action
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

      const withLineup = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(withLineup, result, lineup)

      return {
        ...withLineup,
        gold: state.gold + result.reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        season,
        matchday: Math.min(TOTAL_MATCHDAYS, state.matchday + 1),
        daily: result.result === 'W' ? bumpMission(state, 'win', 1) : today(state),
        history: logMatch(state, 'league', result, result.reward),
      }
    }

    case 'cupMatch': {
      const { result, myRating, lineup } = action
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

      const withLineup = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(withLineup, result, lineup)

      return {
        ...withLineup,
        gold: state.gold + reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        cup,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        matchday: Math.min(TOTAL_MATCHDAYS, state.matchday + 1),
        trophies: wonTheCup ? { ...state.trophies, cup: state.trophies.cup + 1 } : state.trophies,
        daily: result.result === 'W' ? bumpMission(state, 'win', 1) : today(state),
        history: logMatch(state, 'cup', result, reward),
      }
    }

    case 'skipMatchday':
      // Used when a cup date comes round after the club is already out.
      return { ...state, matchday: Math.min(TOTAL_MATCHDAYS, state.matchday + 1) }

    case 'newSeason': {
      if (!state.season.finished) return state
      const outcome = seasonOutcome(state.season)
      const index = state.season.index + 1
      return {
        ...state,
        gold: state.gold + outcome.reward,
        season: createSeason(outcome.nextDivision, index, state.club),
        cup: createCup(outcome.nextDivision, index, state.club),
        matchday: 0,
        market: { ...state.market, date: '' },
        trophies: outcome.promoted
          ? { ...state.trophies, promotions: state.trophies.promotions + 1 }
          : state.trophies,
        cards: state.cards.map((card) => ({ ...card, condition: MAX_CONDITION, injuredFor: 0 })),
        lastRatings: [],
        lastSubs: [],
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
