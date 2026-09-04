import { describe, expect, it } from 'vitest'
import { runToEnd } from '../lib/matchEngine'
import { hashString, seededRandom } from '../lib/random'
import { initialState } from '../lib/storage'
import { buildWeeklyMatchSetup, weeklyAiSquad } from '../lib/weeklyLeague/liveMatch'
import {
  LIVE_WINDOW_SECONDS,
  lineupViewOf,
  liveWindowEnded,
  matchMinuteAt,
  replayFixture,
  type LiveCommand,
  type LiveSnapshot,
} from '../lib/weeklyLeague/liveReplay'
import { getPlayer } from '../lib/players'
import { evaluateSquad } from '../lib/squad'
import type { Card, Squad } from '../lib/types'

const evaluateSquadFor = (cards: Card[], squad: Squad) => evaluateSquad(cards, squad, 5)

function snapshotOf(): LiveSnapshot {
  const state = initialState()
  const ai = weeklyAiSquad(7, 3, 62)
  // Automatic substitution off by default so the tests below see exactly the
  // orders they send; the one test about it turns it on explicitly.
  const home = { cards: state.cards, squad: state.squad, division: 5, autoSub: false }
  const away = { cards: ai.cards, squad: ai.squad, division: 5, autoSub: false }
  const setup = buildWeeklyMatchSetup({
    groupId: 7,
    home: { slot: 2, kind: 'user', clubName: state.club, rating: 70 },
    away: { slot: 3, kind: 'ai', clubName: 'AI 클럽', rating: 62 },
    homeInput: home,
    awayInput: away,
    neutralVenue: false,
  })
  return { setup, home, away }
}

describe('live clock', () => {
  it('maps ten real seconds to one match minute and stops at ninety', () => {
    const kickoff = Date.UTC(2026, 8, 4, 1, 0, 0)
    expect(matchMinuteAt(kickoff, kickoff - 5000)).toBe(0)
    expect(matchMinuteAt(kickoff, kickoff + 10_000)).toBe(1)
    expect(matchMinuteAt(kickoff, kickoff + 45 * 10_000)).toBe(45)
    expect(matchMinuteAt(kickoff, kickoff + 2 * LIVE_WINDOW_SECONDS * 1000)).toBe(90)
    expect(liveWindowEnded(kickoff, kickoff + LIVE_WINDOW_SECONDS * 1000 - 1)).toBe(false)
    expect(liveWindowEnded(kickoff, kickoff + LIVE_WINDOW_SECONDS * 1000)).toBe(true)
  })
})

describe('replaying a live fixture', () => {
  it('with no commands reproduces runToEnd exactly for the same seed', () => {
    const snapshot = snapshotOf()
    const seed = 'live-seed-1'
    const replay = replayFixture(snapshot, seed, [], 90)
    const direct = runToEnd(snapshot.setup, seededRandom(hashString(seed)))
    expect(replay.state.scoreFor).toBe(direct.scoreFor)
    expect(replay.state.scoreAgainst).toBe(direct.scoreAgainst)
    expect(replay.state.events).toEqual(direct.events)
    expect(replay.state.finished).toBe(true)
  })

  it('stops at the target minute and is a prefix of the full replay', () => {
    const snapshot = snapshotOf()
    const partial = replayFixture(snapshot, 'seed-2', [], 30)
    const full = replayFixture(snapshot, 'seed-2', [], 90)
    expect(partial.state.minute).toBe(30)
    expect(partial.state.finished).toBe(false)
    expect(full.state.events.slice(0, partial.state.events.length)).toEqual(partial.state.events)
  })

  it('applies a substitution at the first stoppage on or after its minute, never before', () => {
    const snapshot = snapshotOf()
    const slotId = Object.keys(snapshot.home.squad.slots).find((id) => snapshot.home.squad.slots[id])!
    const inUid = snapshot.home.squad.bench.find((uid): uid is string => Boolean(uid))!
    const command: LiveCommand = {
      id: 1,
      side: 'home',
      minute: 20,
      payload: { kind: 'substitution', slotId, inUid },
    }
    const result = replayFixture(snapshot, 'seed-3', [command], 90)
    expect(result.rejected).toEqual([])
    expect(result.applied).toHaveLength(1)
    expect(result.applied[0].appliedMinute).toBeGreaterThanOrEqual(20)
    expect(result.home.squad.slots[slotId]).toBe(inUid)
    expect(result.setup.team.evaluations.some((item) => item.card?.uid === inUid)).toBe(true)
    expect(result.subsUsed.home).toBe(1)
    // Before its minute the eleven is untouched.
    const early = replayFixture(snapshot, 'seed-3', [command], 15)
    expect(early.applied).toEqual([])
    expect(early.home.squad.slots[slotId]).not.toBe(inUid)
  })

  it('refuses a sixth substitution and an invalid swap', () => {
    const snapshot = snapshotOf()
    const slots = Object.keys(snapshot.home.squad.slots).filter((id) => snapshot.home.squad.slots[id])
    const bench = snapshot.home.squad.bench.filter((uid): uid is string => Boolean(uid))
    const count = Math.min(6, slots.length, bench.length)
    const commands: LiveCommand[] = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      side: 'home',
      minute: 5,
      payload: { kind: 'substitution', slotId: slots[i], inUid: bench[i] },
    }))
    commands.push({ id: 99, side: 'home', minute: 6, payload: { kind: 'substitution', slotId: 'nope', inUid: 'nobody' } })
    const result = replayFixture(snapshot, 'seed-4', commands, 90)
    expect(result.subsUsed.home).toBeLessThanOrEqual(5)
    expect(result.rejected.some((item) => item.id === 99)).toBe(true)
    if (count === 6) expect(result.rejected.some((item) => item.id === 6)).toBe(true)
  })

  it('turns an autosub order down when nobody is tired yet', () => {
    const snapshot = snapshotOf()
    const command: LiveCommand = { id: 1, side: 'home', minute: 1, payload: { kind: 'autosub' } }
    const result = replayFixture(snapshot, 'seed-8', [command], 20)
    expect(result.rejected.some((item) => item.id === 1)).toBe(true)
    expect(result.subsUsed.home).toBe(0)
  })

  it('swaps exhausted starters on its own when automatic substitution is on', () => {
    const snapshot = snapshotOf()
    const slotId = Object.keys(snapshot.home.squad.slots).find((id) => snapshot.home.squad.slots[id])!
    const uid = snapshot.home.squad.slots[slotId]!
    // Run the starter's legs down so the tired rule fires at the first stoppage.
    const cards = snapshot.home.cards.map((card) => (card.uid === uid ? { ...card, condition: 12 } : card))
    const setup = { ...snapshot.setup, team: evaluateSquadFor(cards, snapshot.home.squad) }
    const on = replayFixture({ ...snapshot, setup, home: { ...snapshot.home, cards, autoSub: true } }, 'seed-9', [], 90)
    const off = replayFixture({ ...snapshot, setup, home: { ...snapshot.home, cards, autoSub: false } }, 'seed-9', [], 90)
    expect(on.subsUsed.home).toBeGreaterThan(0)
    expect(on.home.squad.slots[slotId]).not.toBe(uid)
    expect(off.subsUsed.home).toBe(0)
  })

  it('lets the away side change tactics and records it in the feed', () => {
    const snapshot = snapshotOf()
    const command: LiveCommand = {
      id: 1,
      side: 'away',
      minute: 10,
      payload: { kind: 'tactic', tactic: { plan: 'attack', pressing: 'high', line: 'high', tempo: 'fast' } },
    }
    const result = replayFixture(snapshot, 'seed-5', [command], 90)
    expect(result.applied).toHaveLength(1)
    expect(result.setup.opponentTactics?.params).toBeDefined()
    expect(result.state.events.some((event) => event.type === 'note' && event.side === 'away')).toBe(true)
  })

  it('is deterministic: the same inputs give the same match twice', () => {
    const snapshot = snapshotOf()
    const commands: LiveCommand[] = [
      { id: 1, side: 'home', minute: 12, payload: { kind: 'tactic', tactic: { plan: 'defend', pressing: 'low', line: 'deep', tempo: 'slow' } } },
    ]
    const a = replayFixture(snapshot, 'seed-6', commands, 90)
    const b = replayFixture(snapshot, 'seed-6', commands, 90)
    expect(a.state.events).toEqual(b.state.events)
    expect(a.applied).toEqual(b.applied)
  })

  it('shows a manager their eleven, bench and substitutions left', () => {
    const snapshot = snapshotOf()
    const result = replayFixture(snapshot, 'seed-7', [], 30)
    const view = lineupViewOf(result, 'home', (id) => getPlayer(id)?.name ?? id)
    expect(view.slots.length).toBeGreaterThanOrEqual(11)
    expect(view.bench.length).toBeGreaterThan(0)
    expect(view.subsLeft).toBe(5)
    expect(view.slots.every((slot) => slot.uid === null || typeof slot.stamina === 'number')).toBe(true)
  })
})
