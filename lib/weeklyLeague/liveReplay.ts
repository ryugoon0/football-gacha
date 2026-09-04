/**
 * Live weekly fixtures — replaying a match from kickoff with the commands
 * managers sent while it was running. docs/WEEKLY_LIVE_MATCH_DESIGN.md, 2단계.
 *
 * The whole live state is a pure function of (snapshot, seed, commands,
 * target minute): every `get_state` replays from minute 0 — 90 ticks cost
 * about a millisecond — so nothing needs a persisted engine state, a lease,
 * or a CAS. Two viewers replaying the same inputs see the same match; the
 * settlement at the end of the live window is the same replay run to 90.
 * The only shared writes are append-only commands (unique idempotency key)
 * and the final result (advisory lock in commit_weekly_fixture_result).
 *
 * Time model: 10 real seconds per match minute, so a fixture is live for 15
 * minutes after its kick-off time. A command is stamped with the match
 * minute at which the server received it and takes effect at the first
 * stoppage on or after that minute — never retroactively.
 */
import { applyAutoSubs } from '../autoSub'
import { advance, createMatch, shapeFromSquad, type Dot, type LiveMatchState, type MatchSetup } from '../matchEngine'
import { tune } from '../tuning'
import { hashString, seededRandom } from '../random'
import { evaluateSquad } from '../squad'
import { normalizeTactic, type TacticSetup } from '../tactics'
import { paramsFromSetup } from '../tactics/bridge'
import type { Card, Squad } from '../types'
import { SQUAD_RULES } from './config'
import { isHotTime } from './rewards'
import { TACTIC_CARDS, boostLabel, boostRating, isTacticCardId, type CardContext, type TacticCardId } from './tacticCards'

export const LIVE_REAL_SECONDS_PER_MINUTE = 10
export const LIVE_MATCH_MINUTES = 90
export const LIVE_WINDOW_SECONDS = LIVE_MATCH_MINUTES * LIVE_REAL_SECONDS_PER_MINUTE // 900

export type LiveSide = 'home' | 'away'

/** Where the clock stands for a fixture that kicked off at `scheduledAtMs`. */
export function matchMinuteAt(scheduledAtMs: number, nowMs: number): number {
  const elapsed = Math.floor((nowMs - scheduledAtMs) / 1000 / LIVE_REAL_SECONDS_PER_MINUTE)
  return Math.max(0, Math.min(LIVE_MATCH_MINUTES, elapsed))
}

export function liveWindowEnded(scheduledAtMs: number, nowMs: number): boolean {
  return nowMs >= scheduledAtMs + LIVE_WINDOW_SECONDS * 1000
}

/** One side's real material, kept in the snapshot so a substitution can re-rate the eleven. */
export interface LiveSideMaterial {
  cards: Card[]
  squad: Squad
  division: number
  /**
   * The manager's automatic-substitution setting, as in casual mode: when on,
   * a starter whose legs drop under the live tired mark is swapped for a
   * fresh bench player at the next stoppage without an order. Absent on
   * snapshots from before this existed — treated as on, the game's default.
   */
  autoSub?: boolean
}

/** Everything fixed at kick-off. Stored as JSON in weekly_fixture_engine_state. */
export interface LiveSnapshot {
  setup: MatchSetup
  home: LiveSideMaterial
  away: LiveSideMaterial
  /** Kick-off time, for cards that care about the hour (핫타임). Absent on older snapshots. */
  kickoffUtcMs?: number
}

export type LiveCommandPayload =
  | { kind: 'tactic'; tactic: TacticSetup }
  | { kind: 'substitution'; slotId: string; inUid: string }
  /** "Swap whoever is tired" — the casual-mode button, decided server-side from live legs. */
  | { kind: 'autosub' }
  /** A 히든 카드, playable only before kick-off (stamped minute 0); one per side per match. */
  | { kind: 'card'; cardId: TacticCardId }

export interface LiveCommand {
  id: number
  side: LiveSide
  /** Match minute the server stamped on receipt. */
  minute: number
  payload: LiveCommandPayload
}

export interface AppliedCommand {
  id: number
  side: LiveSide
  appliedMinute: number
  text: string
}

export interface RejectedCommand {
  id: number
  side: LiveSide
  reason: string
}

export interface ReplayResult {
  state: LiveMatchState
  /** The setup as it stands after every applied command (without any card boost). */
  setup: MatchSetup
  home: LiveSideMaterial
  away: LiveSideMaterial
  applied: AppliedCommand[]
  rejected: RejectedCommand[]
  subsUsed: Record<LiveSide, number>
  /** The 히든 카드 each side played at kick-off, if any. */
  cardPlayed: Record<LiveSide, TacticCardId | null>
  /** Whether each side's card is on at the target minute. */
  cardActive: Record<LiveSide, boolean>
}

/** Same swap the casual-mode screen does: bench player into a slot, starter out. */
export function applySub(squad: Squad, slotId: string, inUid: string): { squad: Squad; outUid: string } | null {
  const outUid = squad.slots[slotId]
  const benchIndex = squad.bench.indexOf(inUid)
  if (!outUid || benchIndex < 0) return null
  const bench = [...squad.bench]
  bench[benchIndex] = outUid
  return { squad: { ...squad, slots: { ...squad.slots, [slotId]: inUid }, bench }, outUid }
}

function nameOf(material: LiveSideMaterial, uid: string, setupSide: MatchSetup['team']): string {
  const item = setupSide.evaluations.find((entry) => entry.card?.uid === uid)
  if (item?.player) return item.player.name
  const card = material.cards.find((entry) => entry.uid === uid)
  return card ? card.playerId : '선수'
}

interface Applied {
  setup: MatchSetup
  home: LiveSideMaterial
  away: LiveSideMaterial
  text?: string
  reason?: string
  /** Substitutions this step spent — 0, 1, or several for an auto swap. */
  subs: number
}

/** A side's squad changed: re-rate it and put it back into the setup. */
function withSquad(setup: MatchSetup, side: LiveSide, home: LiveSideMaterial, away: LiveSideMaterial, squad: Squad): Applied {
  const material = side === 'home' ? home : away
  const rating = evaluateSquad(material.cards, squad, material.division)
  const nextMaterial = { ...material, squad }
  if (side === 'home') {
    // New starter, new dot: keep the pitch view's labels in step with the eleven.
    const homeShape = setup.homeShape ? shapeFromSquad(squad.formation, rating.evaluations) : undefined
    return { setup: { ...setup, team: rating, traits: rating.traits, homeShape }, home: nextMaterial, away, subs: 0 }
  }
  return { setup: { ...setup, opponentSquad: rating, opponentTraits: rating.traits }, home, away: nextMaterial, subs: 0 }
}

/**
 * Tired-legs substitutions for one side, from the engine's live stamina —
 * the same rule as casual mode's "지친 선수 교체" and its automatic version
 * (lib/autoSub.ts, tune('liveTired')). Nothing to do returns null.
 */
function tiredSubsFor(
  side: LiveSide,
  setup: MatchSetup,
  home: LiveSideMaterial,
  away: LiveSideMaterial,
  state: LiveMatchState,
  subsUsed: Record<LiveSide, number>,
): Applied | null {
  const material = side === 'home' ? home : away
  if (material.cards.length === 0) return null
  const allowance = SQUAD_RULES.maxSubsPerMatch - subsUsed[side]
  if (allowance <= 0) return null
  const stamina = side === 'home' ? state.stamina : state.opponentStamina
  const auto = applyAutoSubs(
    material.cards,
    material.squad,
    material.division,
    (card) => stamina[card.uid] ?? card.condition,
    tune('liveTired'),
    allowance,
  )
  if (auto.subs.length === 0) return null
  const next = withSquad(setup, side, home, away, auto.squad)
  return {
    ...next,
    subs: auto.subs.length,
    text: `지친 선수 교체 — ${auto.subs.map((sub) => `${sub.outName} → ${sub.inName}`).join(', ')}`,
  }
}

/** Puts one command into the setup. Returns the text to show, or a rejection reason. */
function applyCommand(
  command: LiveCommand,
  setup: MatchSetup,
  home: LiveSideMaterial,
  away: LiveSideMaterial,
  subsUsed: Record<LiveSide, number>,
  state: LiveMatchState,
): Applied {
  const side = command.side
  const material = side === 'home' ? home : away

  if (command.payload.kind === 'card') {
    // Cards are handled by replayFixture at kick-off; reaching here means one
    // was sent after it.
    return { setup, home, away, subs: 0, reason: '히든 카드는 킥오프 전에만 쓸 수 있습니다' }
  }

  if (command.payload.kind === 'autosub') {
    if (subsUsed[side] >= SQUAD_RULES.maxSubsPerMatch) {
      return { setup, home, away, subs: 0, reason: `교체 인원을 모두 썼습니다 (${SQUAD_RULES.maxSubsPerMatch}명)` }
    }
    const auto = tiredSubsFor(side, setup, home, away, state, subsUsed)
    if (!auto) return { setup, home, away, subs: 0, reason: '지금 빼야 할 만큼 지친 선수가 없습니다' }
    return auto
  }

  if (command.payload.kind === 'tactic') {
    const tactic = normalizeTactic(command.payload.tactic)
    // The four dials only take effect when no full phased plan overrides
    // them (phased > params > tactic in the engine), so a live order clears
    // that side's plan. That is the point of the order: the manager wants
    // *this* setting now. The away side has no `tactic` field of its own —
    // the engine reads its plan from opponentTactics — so the dials go in as
    // the params the home dials would translate to.
    const next: MatchSetup =
      side === 'home'
        ? { ...setup, tactic, phased: undefined, params: undefined }
        : {
            ...setup,
            opponentTactics: {
              profile: setup.opponentTactics?.profile,
              params: paramsFromSetup(tactic),
              phased: undefined,
            },
          }
    return { setup: next, home, away, subs: 0, text: `전술 변경 — ${tactic.plan}/${tactic.pressing}/${tactic.line}/${tactic.tempo}` }
  }

  if (subsUsed[side] >= SQUAD_RULES.maxSubsPerMatch) {
    return { setup, home, away, subs: 0, reason: `교체 인원을 모두 썼습니다 (${SQUAD_RULES.maxSubsPerMatch}명)` }
  }
  const swapped = applySub(material.squad, command.payload.slotId, command.payload.inUid)
  if (!swapped) return { setup, home, away, subs: 0, reason: '교체 대상이 유효하지 않습니다' }

  const sideSetup = side === 'home' ? setup.team : setup.opponentSquad ?? setup.team
  const next = withSquad(setup, side, home, away, swapped.squad)
  const nextRating = side === 'home' ? next.setup.team : next.setup.opponentSquad ?? next.setup.team
  const nextMaterial = side === 'home' ? next.home : next.away
  return {
    ...next,
    subs: 1,
    text: `교체 — ${nameOf(material, swapped.outUid, sideSetup)} → ${nameOf(nextMaterial, command.payload.inUid, nextRating)}`,
  }
}

/** The match as one side's card sees it this minute. */
function cardContextOf(setup: MatchSetup, state: LiveMatchState, side: LiveSide, kickoffUtcMs: number | undefined): CardContext {
  const home = side === 'home'
  const venue: CardContext['venue'] =
    setup.venue === 'neutral' ? 'neutral' : home ? 'home' : 'away'
  return {
    minute: state.minute,
    myScore: home ? state.scoreFor : state.scoreAgainst,
    theirScore: home ? state.scoreAgainst : state.scoreFor,
    myShots: home ? state.shotsFor : state.shotsAgainst,
    theirShots: home ? state.shotsAgainst : state.shotsFor,
    venue,
    myOverall: home ? setup.team.overall : setup.opponentSquad?.overall ?? setup.opponent.rating,
    theirOverall: home ? setup.opponentSquad?.overall ?? setup.opponent.rating : setup.team.overall,
    hotTime: kickoffUtcMs ? isHotTime(kickoffUtcMs) : false,
  }
}

/**
 * Replays the fixture from kick-off to `targetMinute` (or full time), applying
 * each command at the first stoppage on or after the minute it was received.
 * Commands are applied in receipt order, so two managers' orders at the same
 * stoppage resolve the same way for every viewer. A played 히든 카드 is
 * checked every minute and, while its condition holds, the side is judged
 * `boost` points better — the setup the tick runs on is derived from the
 * commanded setup, never written back into it.
 */
export function replayFixture(
  snapshot: LiveSnapshot,
  seed: string,
  commands: LiveCommand[],
  targetMinute: number = LIVE_MATCH_MINUTES,
): ReplayResult {
  let setup = snapshot.setup
  let home = snapshot.home
  let away = snapshot.away
  const rng = seededRandom(hashString(seed))
  let state = createMatch(setup)
  // Receipt order is minute order in real data (both come from the server
  // clock); sorting by minute first keeps the queue well-formed even if not.
  const pending = [...commands].sort((a, b) => a.minute - b.minute || a.id - b.id)
  const applied: AppliedCommand[] = []
  const rejected: RejectedCommand[] = []
  const subsUsed: Record<LiveSide, number> = { home: 0, away: 0 }
  const cardPlayed: Record<LiveSide, TacticCardId | null> = { home: null, away: null }
  const cardActive: Record<LiveSide, boolean> = { home: false, away: false }

  const note = (side: LiveSide, text: string) => {
    state = { ...state, events: [...state.events, { minute: state.minute, type: 'note', side, text }] }
  }

  const take = (result: Applied, side: LiveSide) => {
    setup = result.setup
    home = result.home
    away = result.away
    subsUsed[side] += result.subs
  }

  const playCard = (command: LiveCommand & { payload: { kind: 'card' } }): string | null => {
    if (command.minute > 0 || state.minute > 0) return '히든 카드는 킥오프 전에만 쓸 수 있습니다'
    if (cardPlayed[command.side]) return '히든 카드는 한 경기에 한 장만 쓸 수 있습니다'
    if (!isTacticCardId(command.payload.cardId)) return '알 수 없는 히든 카드입니다'
    cardPlayed[command.side] = command.payload.cardId
    return null
  }

  const flush = () => {
    while (pending.length && pending[0].minute <= state.minute) {
      const command = pending.shift()!
      if (command.payload.kind === 'card') {
        const reason = playCard(command as LiveCommand & { payload: { kind: 'card' } })
        if (reason) {
          rejected.push({ id: command.id, side: command.side, reason })
          continue
        }
        const card = TACTIC_CARDS[command.payload.cardId]
        const text = `히든 카드 — ${card.name} (${card.when})`
        applied.push({ id: command.id, side: command.side, appliedMinute: 0, text })
        note(command.side, text)
        continue
      }
      const result = applyCommand(command, setup, home, away, subsUsed, state)
      if (result.reason) {
        rejected.push({ id: command.id, side: command.side, reason: result.reason })
        continue
      }
      take(result, command.side)
      applied.push({ id: command.id, side: command.side, appliedMinute: state.minute, text: result.text ?? '' })
      note(command.side, result.text ?? '')
    }
    // Then the automatic version, for managers who left it on — same as the
    // casual-mode screen queuing tired starters at each stoppage. Runs after
    // the manager's own orders so an explicit swap is never doubled.
    for (const side of ['home', 'away'] as LiveSide[]) {
      const material = side === 'home' ? home : away
      if (material.autoSub === false || state.minute === 0) continue
      const auto = tiredSubsFor(side, setup, home, away, state, subsUsed)
      if (!auto) continue
      take(auto, side)
      applied.push({ id: -state.minute, side, appliedMinute: state.minute, text: `자동 ${auto.text ?? ''}` })
      note(side, `자동 ${auto.text ?? ''}`)
    }
  }

  /** The setup this minute runs on: the commanded setup plus whichever cards are on. */
  const setupForTick = (): MatchSetup => {
    let run = setup
    for (const side of ['home', 'away'] as LiveSide[]) {
      const cardId = cardPlayed[side]
      if (!cardId) continue
      const card = TACTIC_CARDS[cardId]
      const on = card.triggers(cardContextOf(setup, state, side, snapshot.kickoffUtcMs))
      if (on && !cardActive[side]) note(side, `히든 카드 발동 — ${card.name} (${boostLabel(card.boost)})`)
      if (!on && cardActive[side]) note(side, `히든 카드 대기 — ${card.name}`)
      cardActive[side] = on
      if (!on) continue
      run =
        side === 'home'
          ? { ...run, team: boostRating(run.team, card.boost) }
          : { ...run, opponentSquad: run.opponentSquad ? boostRating(run.opponentSquad, card.boost) : run.opponentSquad }
    }
    return run
  }

  // Kick-off is a legal moment too: orders sent in the pre-match window
  // (stamped minute 0) shape the eleven and tactics before the first tick.
  flush()

  const limit = Math.max(0, Math.min(LIVE_MATCH_MINUTES, Math.floor(targetMinute)))
  // The final whistle is the tick *after* minute 90 (advance() adds the
  // 'full' event when the next minute would be 91), so a full replay runs
  // until finished — exactly what runToEnd does — not merely to minute 90.
  const toFullTime = limit >= LIVE_MATCH_MINUTES
  while (!state.finished && (toFullTime || state.minute < limit)) {
    // On its own line: setupForTick() may append a note to `state`, and an
    // inline call would be evaluated after the `state` argument was read.
    const run = setupForTick()
    state = advance(state, run, rng)
    // A stoppage is the only moment a manager may step in — same rule as the
    // casual-mode screen (useLiveEngine.canIntervene).
    if (state.stoppage) flush()
  }
  if (state.finished) {
    // Anything still queued never found a stoppage before the whistle.
    for (const command of pending) {
      rejected.push({ id: command.id, side: command.side, reason: '경기가 끝나기 전에 적용할 순간이 없었습니다' })
    }
  }
  return { state, setup, home, away, applied, rejected, subsUsed, cardPlayed, cardActive }
}

/** What a viewer gets: the match as it stands, nothing private (no seed, no other side's plan). */
export interface LivePublicState {
  minute: number
  finished: boolean
  phase: LiveMatchState['phase']
  stoppage: string | null
  scoreHome: number
  scoreAway: number
  shotsHome: number
  shotsAway: number
  possessionHome: number
  events: LiveMatchState['events']
  /** For the pitch view — where everyone stands this minute. */
  ball: { x: number; y: number }
  home: Dot[]
  away: Dot[]
}

export function publicStateOf(state: LiveMatchState): LivePublicState {
  const ticks = state.possessionTicks.home + state.possessionTicks.away
  return {
    minute: state.minute,
    finished: state.finished,
    phase: state.phase,
    stoppage: state.stoppage?.text ?? null,
    scoreHome: state.scoreFor,
    scoreAway: state.scoreAgainst,
    shotsHome: state.shotsFor,
    shotsAway: state.shotsAgainst,
    possessionHome: ticks ? Math.round((state.possessionTicks.home / ticks) * 100) : 50,
    events: state.events,
    ball: state.ball,
    home: state.home,
    away: state.away,
  }
}

/** One side's eleven and bench as the manager needs to see them to order a substitution. */
export interface LiveLineupView {
  slots: { slotId: string; position: string; uid: string | null; name: string; stamina: number | null }[]
  bench: { uid: string; name: string; condition: number }[]
  subsLeft: number
}

export function lineupViewOf(
  result: ReplayResult,
  side: LiveSide,
  playerNameOf: (playerId: string) => string,
): LiveLineupView {
  const material = side === 'home' ? result.home : result.away
  const rating = side === 'home' ? result.setup.team : result.setup.opponentSquad ?? result.setup.team
  const stamina = side === 'home' ? result.state.stamina : result.state.opponentStamina
  const slots = rating.evaluations.map((item) => ({
    slotId: item.slotId,
    position: item.slotPosition,
    uid: item.card?.uid ?? null,
    name: item.player?.name ?? '빈 자리',
    stamina: item.card ? stamina[item.card.uid] ?? null : null,
  }))
  const bench = material.squad.bench
    .filter((uid): uid is string => Boolean(uid))
    .map((uid) => {
      const card = material.cards.find((entry) => entry.uid === uid)
      return { uid, name: card ? playerNameOf(card.playerId) : '선수', condition: card?.condition ?? 0 }
    })
  return { slots, bench, subsLeft: Math.max(0, SQUAD_RULES.maxSubsPerMatch - result.subsUsed[side]) }
}
