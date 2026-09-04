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
import { advance, createMatch, type LiveMatchState, type MatchSetup } from '../matchEngine'
import { hashString, seededRandom } from '../random'
import { evaluateSquad } from '../squad'
import { normalizeTactic, type TacticSetup } from '../tactics'
import { paramsFromSetup } from '../tactics/bridge'
import type { Card, Squad } from '../types'
import { SQUAD_RULES } from './config'

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
}

/** Everything fixed at kick-off. Stored as JSON in weekly_fixture_engine_state. */
export interface LiveSnapshot {
  setup: MatchSetup
  home: LiveSideMaterial
  away: LiveSideMaterial
}

export type LiveCommandPayload =
  | { kind: 'tactic'; tactic: TacticSetup }
  | { kind: 'substitution'; slotId: string; inUid: string }

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
  /** The setup as it stands after every applied command. */
  setup: MatchSetup
  home: LiveSideMaterial
  away: LiveSideMaterial
  applied: AppliedCommand[]
  rejected: RejectedCommand[]
  subsUsed: Record<LiveSide, number>
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

/** Puts one command into the setup. Returns the text to show, or a rejection reason. */
function applyCommand(
  command: LiveCommand,
  setup: MatchSetup,
  home: LiveSideMaterial,
  away: LiveSideMaterial,
  subsUsed: Record<LiveSide, number>,
): { setup: MatchSetup; home: LiveSideMaterial; away: LiveSideMaterial; text?: string; reason?: string } {
  const side = command.side
  const material = side === 'home' ? home : away

  if (command.payload.kind === 'tactic') {
    const tactic = normalizeTactic(command.payload.tactic)
    // The four dials only take effect when no full phased plan overrides
    // them (phased > params > tactic in the engine), so a live order clears
    // that side's plan. That is the point of the order: the manager wants
    // *this* setting now.
    // The away side has no `tactic` field of its own — the engine reads its
    // plan from opponentTactics (phased > params > default), so the four dials
    // go in as the same params the home dials would translate to.
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
    return { setup: next, home, away, text: `전술 변경 — ${tactic.plan}/${tactic.pressing}/${tactic.line}/${tactic.tempo}` }
  }

  if (subsUsed[side] >= SQUAD_RULES.maxSubsPerMatch) {
    return { setup, home, away, reason: `교체 인원을 모두 썼습니다 (${SQUAD_RULES.maxSubsPerMatch}명)` }
  }
  const swapped = applySub(material.squad, command.payload.slotId, command.payload.inUid)
  if (!swapped) return { setup, home, away, reason: '교체 대상이 유효하지 않습니다' }

  const rating = evaluateSquad(material.cards, swapped.squad, material.division)
  const nextMaterial = { ...material, squad: swapped.squad }
  const sideSetup = side === 'home' ? setup.team : setup.opponentSquad ?? setup.team
  const text = `교체 — ${nameOf(material, swapped.outUid, sideSetup)} → ${nameOf(nextMaterial, command.payload.inUid, rating)}`
  if (side === 'home') {
    return {
      setup: { ...setup, team: rating, traits: rating.traits },
      home: nextMaterial,
      away,
      text,
    }
  }
  return {
    setup: { ...setup, opponentSquad: rating, opponentTraits: rating.traits },
    home,
    away: nextMaterial,
    text,
  }
}

/**
 * Replays the fixture from kick-off to `targetMinute` (or full time), applying
 * each command at the first stoppage on or after the minute it was received.
 * Commands are applied in id order (= receipt order), so two managers'
 * orders at the same stoppage resolve the same way for every viewer.
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
  const pending = [...commands].sort((a, b) => a.id - b.id)
  const applied: AppliedCommand[] = []
  const rejected: RejectedCommand[] = []
  const subsUsed: Record<LiveSide, number> = { home: 0, away: 0 }

  const flush = () => {
    while (pending.length && pending[0].minute <= state.minute) {
      const command = pending.shift()!
      const result = applyCommand(command, setup, home, away, subsUsed)
      if (result.reason) {
        rejected.push({ id: command.id, side: command.side, reason: result.reason })
        continue
      }
      setup = result.setup
      home = result.home
      away = result.away
      if (command.payload.kind === 'substitution') subsUsed[command.side] += 1
      applied.push({ id: command.id, side: command.side, appliedMinute: state.minute, text: result.text ?? '' })
      state = {
        ...state,
        events: [
          ...state.events,
          { minute: state.minute, type: 'note', side: command.side, text: result.text ?? '' },
        ],
      }
    }
  }

  const limit = Math.max(0, Math.min(LIVE_MATCH_MINUTES, Math.floor(targetMinute)))
  // The final whistle is the tick *after* minute 90 (advance() adds the
  // 'full' event when the next minute would be 91), so a full replay runs
  // until finished — exactly what runToEnd does — not merely to minute 90.
  const toFullTime = limit >= LIVE_MATCH_MINUTES
  while (!state.finished && (toFullTime || state.minute < limit)) {
    state = advance(state, setup, rng)
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
  return { state, setup, home, away, applied, rejected, subsUsed }
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
