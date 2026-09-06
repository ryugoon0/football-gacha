import type { SubEvent } from './autoSub'
import { applyDiscipline, applyMatchWear, isSidelined, recoveryCost, treatmentCost, MAX_CONDITION } from './condition'
import { recordSeasonStats } from './seasonStats'
import { createCup, cupReward, resolveCupRound } from './cup'
import {
  DAILY_MISSIONS,
  MINI_GAME_LIMIT,
  casualModeLocked,
  missionClaimable,
  pvpMatchesLeft,
  rollOver,
  todayKey,
  type DailyState,
  type MissionId,
} from './daily'
import { FORMATIONS, emptySlots } from './formations'
import { FUSION_FEE, checkFusion } from './fusion'
import { tune } from './tuning'
import {
  ITEMS,
  applyToCard,
  boughtToday,
  itemCount,
  priceOf,
  purchaseProblem,
  type Currency,
  type ItemId,
} from './items'
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
import { applyWear, type WearRow } from './weeklyWear'
import { autoFill, lineupDivisionOf } from './squad'
import { costOf, releaseValue, type ShardOffer } from './shards'
import { TOTAL_MATCHDAYS } from './schedule'
import type { TacticSetup } from './tactics'
import { paramsFromSetup } from './tactics/bridge'
import { normalizePhased, phasedFrom, type PhasedTactics } from './tactics/phases'
import { initialState, newCard, newUid } from './storage'
import { CAPACITY_STEP, canExpand, expandCost, hasRoomFor } from './vault'
import type { Card, FormationKey, GameState, LineupBase, MatchResult, PlayerDef, SavedLineup, Squad } from './types'

/** How many lineups the manager can keep on the shelf (듀얼 스쿼드). */
export const SAVED_LINEUP_SLOTS = 3

/** A copy of the working lineup, detached from the state it came from. */
export function lineupBaseOf(state: Pick<GameState, 'squad' | 'tactic' | 'plan'>): LineupBase {
  return {
    squad: { formation: state.squad.formation, slots: { ...state.squad.slots }, bench: [...state.squad.bench] },
    tactic: { ...state.tactic },
    plan: state.plan,
  }
}

/** Whether the working lineup differs from the confirmed one (no confirmed one = nothing to differ from). */
export function lineupDirty(state: GameState): boolean {
  const base = state.lineupBase
  if (!base) return false
  return (
    base.squad.formation !== state.squad.formation ||
    JSON.stringify(base.squad.slots) !== JSON.stringify(state.squad.slots) ||
    JSON.stringify(base.squad.bench) !== JSON.stringify(state.squad.bench) ||
    JSON.stringify(base.tactic) !== JSON.stringify(state.tactic) ||
    JSON.stringify(base.plan) !== JSON.stringify(state.plan)
  )
}

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
  | { type: 'toggleLock'; uid: string }
  | { type: 'trainCard'; uid: string; materialUids: string[] }
  | { type: 'limitBreak'; uid: string; materialUid: string }
  | { type: 'fuse'; uids: string[]; player: PlayerDef }
  | { type: 'fuseMany'; batches: { uids: string[]; player: PlayerDef }[] }
  | { type: 'assign'; slotId: string; uid: string }
  | { type: 'clearSlot'; slotId: string }
  | { type: 'assignBench'; index: number; uid: string }
  | { type: 'clearBench'; index: number }
  | { type: 'setFormation'; formation: FormationKey }
  | { type: 'setTactic'; tactic: TacticSetup }
  | { type: 'setPlan'; plan: PhasedTactics }
  | { type: 'setAutoSub'; enabled: boolean }
  | { type: 'autoFill'; preferClub?: string }
  /**
   * The whole working lineup at once — undoing unsaved edits, or loading a kept
   * lineup. `commit` also makes it the confirmed lineup (lineupBase).
   */
  | { type: 'restoreLineup'; squad: Squad; tactic: TacticSetup; plan?: PhasedTactics; commit?: boolean }
  /** 저장: the working lineup becomes the confirmed one. */
  | { type: 'commitLineup' }
  /** Puts the working lineup on shelf `index` (0..SAVED_LINEUP_SLOTS-1). */
  | { type: 'saveLineup'; index: number; name: string }
  | { type: 'deleteLineup'; index: number }
  | {
      type: 'match'
      result: MatchResult
      fixture: Fixture
      others: RoundResult[]
      lineup: MatchLineup
    }
  | { type: 'cupMatch'; result: MatchResult; myRating: number; lineup: MatchLineup }
  | { type: 'miniGame'; result: MatchResult; lineup: MatchLineup }
  | { type: 'pvpMatch'; result: MatchResult; lineup: MatchLineup }
  | { type: 'skipMatchday' }
  | { type: 'newSeason' }
  | { type: 'ensureMarket'; date: string }
  | { type: 'refreshMarket'; listings: Listing[]; cost: number }
  | { type: 'buy'; listing: Listing }
  | { type: 'treat'; uid: string }
  | { type: 'recover'; uid: string }
  | { type: 'careMany'; uids: string[]; treat: boolean; recover: boolean }
  | { type: 'dismissNotice' }
  | { type: 'setWeeklyTier'; tier: number | null }
  | { type: 'buyItem'; id: ItemId; currency: Currency; count: number }
  | { type: 'spendItemOnCard'; id: ItemId; uid: string }
  | { type: 'spendItemOnClub'; id: ItemId; listings?: Listing[] }
  | { type: 'claimMission'; id: MissionId }
  /** Gold the server already decided (weekly league rewards) reaching the save. */
  | { type: 'grantGold'; amount: number }
  /** Items the server granted (히든 카드 from a league week or cup final) reaching the save. */
  | { type: 'grantItems'; items: { id: ItemId; count: number }[] }
  | { type: 'grantCards'; playerIds: string[] }
  | { type: 'applyWeeklyWear'; rows: WearRow[] }
  /** One item spent somewhere the server already accepted it (a 히든 카드 played before kick-off). */
  | { type: 'consumeItem'; id: ItemId }
  | { type: 'finishGuide' }
  | { type: 'renameClub'; club: string }
  | { type: 'expandVault' }
  | { type: 'reset' }

function today(state: GameState): DailyState {
  return rollOver(state.daily, todayKey())
}

function bumpMission(state: GameState, id: MissionId, amount: number): DailyState {
  const daily = today(state)
  return { ...daily, progress: { ...daily.progress, [id]: (daily.progress[id] ?? 0) + amount } }
}

/** Counts a casual-mode league or cup match against the daily cap. */
function bumpCasualMatch(daily: DailyState): DailyState {
  return { ...daily, casualMatches: (daily.casualMatches ?? 0) + 1 }
}

function logMatch(
  state: GameState,
  competition: 'league' | 'cup' | 'friendly' | 'pvp',
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
      seed: result.seed,
      engineVersion: result.engineVersion,
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
  // The confirmed lineup loses the same cards, so selling one never reads as
  // an unsaved edit and never comes back on 되돌리기.
  const base = state.lineupBase
  const baseSlots = base ? { ...base.squad.slots } : null
  if (base && baseSlots) {
    for (const slotId of Object.keys(baseSlots)) {
      if (baseSlots[slotId] && uids.has(baseSlots[slotId]!)) baseSlots[slotId] = null
    }
  }
  return {
    ...state,
    cards: state.cards.filter((card) => !uids.has(card.uid)),
    squad: { ...state.squad, slots, bench },
    lineupBase:
      base && baseSlots
        ? { ...base, squad: { ...base.squad, slots: baseSlots, bench: base.squad.bench.map((uid) => (uid && uids.has(uid) ? null : uid)) } }
        : base,
  }
}

/** Marks the starters, banks their experience and tires them out. */
function afterMatch(
  state: GameState,
  result: MatchResult,
  lineup: MatchLineup,
  /** PvP costs condition but never causes an injury. */
  allowInjuries = true,
  /** 데일리 미니게임 sets this false: experience and ratings, no wear at all. */
  wear = true,
): { cards: Card[]; ratings: PlayerRating[] } {
  const formation = FORMATIONS[lineup.squad.formation] ?? FORMATIONS['4-3-3']
  const byUid = new Map(state.cards.map((card) => [card.uid, card]))

  const starters = formation.slots.flatMap((slot) => {
    const uid = lineup.squad.slots[slot.id]
    const card = uid ? byUid.get(uid) : undefined
    const player = card ? getPlayer(card.playerId) : undefined
    if (!card || !player || isSidelined(card)) return []
    return [{ uid: card.uid, player, position: slot.position as string }]
  })

  const ratings = matchRatings(
    starters,
    { result: result.result, scoreAgainst: result.scoreAgainst },
    result.scorerUids,
    Math.random,
    { assistUids: result.assistUids, yellowUids: result.yellowUids, redUids: result.redUids },
  )
  const grown = applyExperience(state.cards, ratings)
  const worn = wear
    ? applyMatchWear(
        grown.cards,
        starters.map((starter) => starter.uid),
        Math.random,
        allowInjuries,
      )
    : { cards: grown.cards, injuries: [] }
  // Bookings from this match: bans start, yellows pile up (friendlies excepted).
  const disciplined = allowInjuries ? applyDiscipline(worn.cards, result, Math.random) : worn.cards
  return {
    cards: disciplined,
    ratings: ratings.map((rating) => ({
      ...rating,
      levelUp: grown.levelUps.some((levelUp) => levelUp.uid === rating.uid),
    })),
  }
}

/**
 * A card game routinely holds duplicates of a player, but a squad cannot
 * field or bench the same person twice. Whenever a card lands somewhere in
 * the squad, every other copy of that player — starting or benched — is
 * dropped outright rather than shuffled elsewhere, so the invariant holds
 * unconditionally instead of only for the one slot pair being edited.
 */
function dropOtherCopies(
  cards: Card[],
  slots: Record<string, string | null>,
  bench: (string | null)[],
  playerId: string,
  keepSlotId?: string,
  keepBenchIndex?: number,
): void {
  // The same person behind a different card (a 월드 season card of a squad
  // player, say) counts as a copy too — lib/personKey.ts.
  const person = getPlayer(playerId)?.person ?? playerId
  const samePerson = (uid: string) => {
    const other = cards.find((card) => card.uid === uid)
    if (!other) return false
    return other.playerId === playerId || (getPlayer(other.playerId)?.person ?? other.playerId) === person
  }
  for (const slotId of Object.keys(slots)) {
    if (slotId === keepSlotId) continue
    const uid = slots[slotId]
    if (uid && samePerson(uid)) slots[slotId] = null
  }
  for (let i = 0; i < bench.length; i++) {
    if (i === keepBenchIndex) continue
    const uid = bench[i]
    if (uid && samePerson(uid)) bench[i] = null
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
      // The vault is the hard limit on how many cards can be held.
      if (!hasRoomFor(state.cards.length, state.capacity, action.cards.length)) return state
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
      // Charge what the counter asks now, not the price the screen was showing.
      // An operator changing it while a tab sits open should not sell a card at
      // yesterday's rate.
      const cost = costOf(offer.rarity)
      if (state.shards < cost) return state
      if (!hasRoomFor(state.cards.length, state.capacity, 1)) return state
      return {
        ...state,
        shards: state.shards - cost,
        cards: [...state.cards, newCard(player.id)],
        collected: Array.from(new Set([...state.collected, player.id])),
      }
    }

    case 'toggleLock': {
      if (!state.cards.some((card) => card.uid === action.uid)) return state
      return {
        ...state,
        cards: state.cards.map((card) => (card.uid === action.uid ? { ...card, locked: card.locked ? undefined : true } : card)),
      }
    }

    case 'sell': {
      // A locked card is never sold, even inside a bulk release.
      const uids = new Set(action.uids.filter((uid) => !state.cards.find((card) => card.uid === uid)?.locked))
      if (uids.size === 0) return state
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
      if (materials.some((card) => card.locked)) return state

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
      if (material.locked) return state
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
      if (state.cards.some((card) => action.uids.includes(card.uid) && card.locked)) return state
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

    case 'fuseMany': {
      // 일괄 합성: each batch is checked against the state the previous one
      // left (gold shrinks, cards leave), and a batch that no longer passes is
      // skipped rather than failing the run.
      let next = state
      const fee = tune('fusionFee')
      for (const batch of action.batches) {
        if (next.cards.some((card) => batch.uids.includes(card.uid) && card.locked)) continue
        const check = checkFusion(next.cards, batch.uids, next.squad, next.gold)
        if (!check.ok) continue
        const without = withoutCards(next, new Set(batch.uids))
        next = {
          ...without,
          gold: next.gold - fee,
          cards: [...without.cards, newCard(batch.player.id)],
          collected: Array.from(new Set([...next.collected, batch.player.id])),
        }
      }
      return next
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

      const incomingPlayerId = state.cards.find((card) => card.uid === action.uid)?.playerId
      if (incomingPlayerId) dropOtherCopies(state.cards, slots, bench, incomingPlayerId, action.slotId)

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

      const incomingPlayerId = state.cards.find((card) => card.uid === action.uid)?.playerId
      if (incomingPlayerId) dropOtherCopies(state.cards, slots, bench, incomingPlayerId, undefined, action.index)

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

    case 'setPlan':
      // The detailed plan is what the engine reads; the four dials stay as they
      // are so the quick controls keep showing what the manager last chose.
      return { ...state, plan: normalizePhased(action.plan) }

    case 'setTactic':
      return {
        ...state,
        tactic: action.tactic,
        plan: phasedFrom(paramsFromSetup(action.tactic), state.plan?.byPhase),
      }

    case 'setAutoSub':
      return { ...state, autoSub: action.enabled }

    case 'autoFill':
      return { ...state, squad: autoFill(state.cards, state.squad, lineupDivisionOf(state), action.preferClub ? { club: action.preferClub } : {}) }

    case 'restoreLineup': {
      // Only cards still owned may stand; a kept lineup can name a card sold since.
      const owned = new Set(state.cards.map((card) => card.uid))
      const slots = emptySlots(action.squad.formation)
      for (const slotId of Object.keys(slots)) {
        const uid = action.squad.slots[slotId]
        slots[slotId] = uid && owned.has(uid) ? uid : null
      }
      const bench = action.squad.bench.map((uid) => (uid && owned.has(uid) ? uid : null))
      const restored = {
        ...state,
        squad: { formation: action.squad.formation, slots, bench },
        tactic: action.tactic,
        plan: action.plan ? normalizePhased(action.plan) : phasedFrom(paramsFromSetup(action.tactic), state.plan?.byPhase),
      }
      return action.commit ? { ...restored, lineupBase: lineupBaseOf(restored) } : restored
    }

    case 'commitLineup':
      return { ...state, lineupBase: lineupBaseOf(state) }

    case 'saveLineup': {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= SAVED_LINEUP_SLOTS) return state
      const shelf: (SavedLineup | null)[] = Array.from({ length: SAVED_LINEUP_SLOTS }, (_, i) => state.savedLineups?.[i] ?? null)
      shelf[action.index] = {
        name: action.name.trim().slice(0, 20) || `라인업 ${action.index + 1}`,
        squad: { formation: state.squad.formation, slots: { ...state.squad.slots }, bench: [...state.squad.bench] },
        tactic: { ...state.tactic },
        plan: state.plan,
        savedAt: Date.now(),
      }
      return { ...state, savedLineups: shelf }
    }

    case 'deleteLineup': {
      if (!state.savedLineups?.[action.index]) return state
      const shelf = [...state.savedLineups]
      shelf[action.index] = null
      return { ...state, savedLineups: shelf }
    }

    case 'match': {
      if (casualModeLocked(today(state))) return state
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

      // Who actually took the field decides wear, injuries and ratings.
      const played = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(played, result, lineup)

      return {
        ...played,
        // The manager comes back to the team sheet they set. A substitution is
        // for that match, not a permanent change to the lineup — and auto
        // substitution runs again at the next kick-off anyway.
        squad: state.squad,
        gold: state.gold + result.reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        seasonStats: recordSeasonStats(state.seasonStats, ratings),
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        season,
        matchday: Math.min(TOTAL_MATCHDAYS, state.matchday + 1),
        daily: {
          ...bumpCasualMatch(result.result === 'W' ? bumpMission(state, 'win', 1) : today(state)),
          // The league season itself ending is what "one season a day"
          // actually keys off — see lib/daily.ts's casualModeLocked.
          seasonEndedToday: season.finished || today(state).seasonEndedToday,
        },
        history: logMatch(state, 'league', result, result.reward),
      }
    }

    case 'miniGame': {
      // 데일리 미니게임: never touches a table, pays gold and experience, and
      // since 2026-09-06 costs no legs — ten a day from the 미니게임 tab.
      const daily = today(state)
      if ((daily.miniGames ?? 0) >= MINI_GAME_LIMIT) return state

      const { result, lineup } = action
      // Who actually took the field decides the ratings.
      const played = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(played, result, lineup, false, false)

      return {
        ...played,
        // The manager comes back to the team sheet they set. A substitution is
        // for that match, not a permanent change to the lineup — and auto
        // substitution runs again at the next kick-off anyway.
        squad: state.squad,
        gold: state.gold + result.reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        daily: { ...daily, miniGames: (daily.miniGames ?? 0) + 1 },
        history: logMatch(state, 'friendly', result, result.reward),
      }
    }

    case 'pvpMatch': {
      // Same shape as miniGame — no league table, no injury risk, up to the
      // daily PvP cap. The server already judged the match and decided the
      // reward; this only books it into the local save.
      const daily = today(state)
      if (pvpMatchesLeft(daily) <= 0) return state

      const { result, lineup } = action
      const played = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(played, result, lineup, false)

      return {
        ...played,
        squad: state.squad,
        gold: state.gold + result.reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        daily: { ...daily, pvpMatches: (daily.pvpMatches ?? 0) + 1 },
        history: logMatch(state, 'pvp', result, result.reward),
      }
    }

    case 'cupMatch': {
      const { result, myRating, lineup } = action
      if (state.cup.eliminated || state.cup.champion) return state
      if (casualModeLocked(today(state))) return state

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

      // Who actually took the field decides wear, injuries and ratings.
      const played = { ...state, squad: lineup.squad }
      const { cards, ratings } = afterMatch(played, result, lineup)

      return {
        ...played,
        // The manager comes back to the team sheet they set. A substitution is
        // for that match, not a permanent change to the lineup — and auto
        // substitution runs again at the next kick-off anyway.
        squad: state.squad,
        gold: state.gold + reward,
        cards,
        lastRatings: ratings,
        lastSubs: lineup.subs,
        seasonStats: recordSeasonStats(state.seasonStats, ratings),
        cup,
        record,
        gf: state.gf + result.scoreFor,
        ga: state.ga + result.scoreAgainst,
        matchday: Math.min(TOTAL_MATCHDAYS, state.matchday + 1),
        trophies: wonTheCup ? { ...state.trophies, cup: state.trophies.cup + 1 } : state.trophies,
        daily: bumpCasualMatch(result.result === 'W' ? bumpMission(state, 'win', 1) : today(state)),
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
        seasonStats: {},
        market: { ...state.market, date: '' },
        trophies: outcome.promoted
          ? { ...state.trophies, promotions: state.trophies.promotions + 1 }
          : state.trophies,
        cards: state.cards.map((card) => ({ ...card, condition: MAX_CONDITION, injuredFor: 0, suspendedFor: 0, yellows: 0 })),
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
      if (!hasRoomFor(state.cards.length, state.capacity, 1)) return state
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

    case 'buyItem': {
      const item = ITEMS[action.id]
      if (!item) return state
      const problem = purchaseProblem({
        item,
        currency: action.currency,
        count: action.count,
        gold: state.gold,
        shards: state.shards,
        buys: state.daily.shopBuys,
      })
      if (problem) return state

      const unit = priceOf(item, action.currency) ?? 0
      const total = unit * action.count
      const daily = item.dailyLimit === null
        ? state.daily
        : {
            ...state.daily,
            shopBuys: {
              ...state.daily.shopBuys,
              [item.id]: boughtToday(state.daily.shopBuys, item.id) + action.count,
            },
          }

      return {
        ...state,
        gold: action.currency === 'gold' ? state.gold - total : state.gold,
        shards: action.currency === 'shards' ? state.shards - total : state.shards,
        items: { ...state.items, [item.id]: itemCount(state.items, item.id) + action.count },
        daily,
      }
    }

    case 'spendItemOnCard': {
      if (itemCount(state.items, action.id) <= 0) return state
      const card = state.cards.find((item) => item.uid === action.uid)
      if (!card) return state
      const next = applyToCard(action.id, card)
      // Null means the item would do nothing — never spend one for no effect.
      if (!next) return state
      return {
        ...state,
        items: { ...state.items, [action.id]: itemCount(state.items, action.id) - 1 },
        cards: state.cards.map((item) => (item.uid === action.uid ? next : item)),
      }
    }

    case 'spendItemOnClub': {
      if (itemCount(state.items, action.id) <= 0) return state
      const spend = { ...state.items, [action.id]: itemCount(state.items, action.id) - 1 }

      switch (action.id) {
        case 'friendlyTicket':
          return {
            ...state,
            items: spend,
            daily: { ...state.daily, extraFriendlies: (state.daily.extraFriendlies ?? 0) + 1 },
          }
        case 'vaultPermit': {
          if (!canExpand(state.capacity)) return state
          return { ...state, items: spend, capacity: state.capacity + CAPACITY_STEP }
        }
        case 'shardPouch':
          return { ...state, items: spend, shards: state.shards + 120 }
        case 'teamCondition': {
          // Never spend one when nobody is tired.
          if (state.cards.every((card) => card.condition >= MAX_CONDITION)) return state
          return { ...state, items: spend, cards: state.cards.map((card) => ({ ...card, condition: MAX_CONDITION })) }
        }
        default:
          return state
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

    case 'careMany': {
      // 일괄 치료·회복: the same two rules as 'treat' and 'recover', card by
      // card in the given order, stopping each kind where the gold runs out.
      const wanted = new Set(action.uids)
      let gold = state.gold
      const cards = state.cards.map((card) => {
        if (!wanted.has(card.uid)) return card
        let next = card
        if (action.treat && next.injuredFor > 0) {
          const cost = treatmentCost(next)
          if (gold >= cost) {
            gold -= cost
            next = { ...next, injuredFor: 0 }
          }
        }
        if (action.recover && next.condition < MAX_CONDITION) {
          const cost = recoveryCost(next)
          if (gold >= cost) {
            gold -= cost
            next = { ...next, condition: MAX_CONDITION }
          }
        }
        return next
      })
      if (gold === state.gold) return state
      return { ...state, gold, cards }
    }

    case 'grantGold': {
      if (!Number.isFinite(action.amount) || action.amount <= 0) return state
      return { ...state, gold: state.gold + Math.round(action.amount) }
    }

    case 'grantItems': {
      const items = { ...state.items }
      for (const line of action.items) {
        if (!ITEMS[line.id] || !Number.isFinite(line.count) || line.count <= 0) continue
        items[line.id] = Math.min(999, itemCount(items, line.id) + Math.floor(line.count))
      }
      return { ...state, items }
    }

    case 'grantCards': {
      // Gifted cards land even past the vault cap — a gift that bounces is
      // worse than a full vault, which only blocks the next scout until tidied.
      const ids = action.playerIds.filter((id) => getPlayer(id)).slice(0, 200)
      if (ids.length === 0) return state
      return {
        ...state,
        cards: [...state.cards, ...ids.map((id) => newCard(id))],
        collected: Array.from(new Set([...state.collected, ...ids])),
      }
    }

    case 'applyWeeklyWear': {
      // 경쟁 리그 legs: the server's ledger of who played in my settled
      // fixtures, drained and rested here so the collection feels the week
      // (lib/weeklyWear.ts). Nothing else changes — no exp, no injuries.
      if (action.rows.length === 0) return state
      return { ...state, cards: applyWear(state.cards, action.rows).cards }
    }

    case 'consumeItem': {
      if (itemCount(state.items, action.id) <= 0) return state
      return { ...state, items: { ...state.items, [action.id]: itemCount(state.items, action.id) - 1 } }
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

    case 'dismissNotice':
      return state.notice ? { ...state, notice: undefined } : state

    case 'setWeeklyTier':
      return (state.weeklyTier ?? null) === action.tier ? state : { ...state, weeklyTier: action.tier }

    case 'expandVault': {
      if (!canExpand(state.capacity)) return state
      const cost = expandCost(state.capacity)
      if (state.gold < cost) return state
      return {
        ...state,
        gold: state.gold - cost,
        capacity: state.capacity + CAPACITY_STEP,
      }
    }

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
