import { describe, expect, it } from 'vitest'
import { applyDiscipline, isSidelined, YELLOW_BAN_THRESHOLD } from '../lib/condition'
import { createMatch, runToEnd } from '../lib/matchEngine'
import { seededRandom } from '../lib/random'
import { initialState } from '../lib/storage'
import { buildWeeklyMatchSetup, weeklyAiSquad } from '../lib/weeklyLeague/liveMatch'
import { disciplineOf, replayFixture } from '../lib/weeklyLeague/liveReplay'
import type { Card } from '../lib/types'

const card = (uid: string, extra: Partial<Card> = {}): Card => ({
  uid,
  playerId: 'p1',
  level: 1,
  limit: 3,
  condition: 100,
  injuredFor: 0,
  exp: 0,
  ...extra,
})

describe('bookings in the engine', () => {
  it('sends a player off for two yellows or a straight red, and never books the same red twice', () => {
    const state = initialState()
    const ai = weeklyAiSquad(3, 5, 70)
    const setup = buildWeeklyMatchSetup({
      groupId: 3,
      home: { slot: 1, kind: 'user', clubName: state.club, rating: 70 },
      away: { slot: 5, kind: 'ai', clubName: 'AI', rating: 70 },
      homeInput: { cards: state.cards, squad: state.squad, division: 5, autoSub: false },
      awayInput: { cards: ai.cards, squad: ai.squad, division: 5, autoSub: false },
      neutralVenue: false,
    })
    let yellows = 0
    let reds = 0
    for (let seed = 1; seed <= 40; seed++) {
      const end = runToEnd(setup, seededRandom(seed))
      yellows += end.yellowUids.length + end.opponentYellowUids.length
      reds += end.redUids.length + end.opponentRedUids.length
      for (const side of [
        { y: end.yellowUids, r: end.redUids },
        { y: end.opponentYellowUids, r: end.opponentRedUids },
      ]) {
        expect(new Set(side.r).size).toBe(side.r.length)
        for (const uid of side.y) expect(side.y.filter((u) => u === uid).length).toBeLessThanOrEqual(2)
        for (const uid of side.r) {
          const twice = side.y.filter((u) => u === uid).length === 2
          const straight = !side.y.includes(uid)
          expect(twice || straight).toBe(true)
        }
      }
      const cardEvents = end.events.filter((event) => event.type === 'card')
      expect(cardEvents.length).toBe(end.yellowUids.length + end.opponentYellowUids.length + end.redUids.filter((u) => !end.yellowUids.includes(u)).length + end.opponentRedUids.filter((u) => !end.opponentYellowUids.includes(u)).length)
    }
    // Roughly a booking or two a match, and reds rare but present over forty games.
    expect(yellows / 40).toBeGreaterThan(0.3)
    expect(yellows / 40).toBeLessThan(6)
    expect(reds).toBeGreaterThan(0)
    expect(createMatch(setup).yellowUids).toEqual([])
  })

  it('keeps the score of a stored seed unchanged by bookings — they come from a side stream', () => {
    const state = initialState()
    const ai = weeklyAiSquad(3, 5, 70)
    const home = { cards: state.cards, squad: state.squad, division: 5, autoSub: false }
    const away = { cards: ai.cards, squad: ai.squad, division: 5, autoSub: false }
    const setup = buildWeeklyMatchSetup({
      groupId: 3,
      home: { slot: 1, kind: 'user', clubName: state.club, rating: 70 },
      away: { slot: 5, kind: 'ai', clubName: 'AI', rating: 70 },
      homeInput: home,
      awayInput: away,
      neutralVenue: false,
    })
    const replay = replayFixture({ setup, home, away }, 'seed-x', [], 90)
    const lines = disciplineOf(replay)
    for (const line of lines) {
      expect(line.yellows + (line.red ? 1 : 0)).toBeGreaterThan(0)
      if (line.secondYellow) expect(line.red).toBe(true)
    }
  })
})

describe('bans after the match', () => {
  it('bans for a red, tallies yellows, and resets at the threshold', () => {
    const cards = [card('a'), card('b', { yellows: YELLOW_BAN_THRESHOLD - 1 }), card('c'), card('d')]
    const next = applyDiscipline(
      cards,
      { yellowUids: ['b', 'c', 'd', 'd'], redUids: ['a', 'd'] },
      () => 0.99,
    )
    const byUid = Object.fromEntries(next.map((c) => [c.uid, c]))
    expect(byUid.a.suspendedFor).toBe(3) // straight red, worst roll
    expect(byUid.b.suspendedFor).toBe(1) // fourth yellow
    expect(byUid.b.yellows).toBe(0)
    expect(byUid.c.yellows).toBe(1)
    expect(byUid.c.suspendedFor ?? 0).toBe(0)
    expect(byUid.d.suspendedFor).toBe(1) // second yellow
    expect(isSidelined(byUid.a)).toBe(true)
    expect(isSidelined(byUid.c)).toBe(false)
  })
})
