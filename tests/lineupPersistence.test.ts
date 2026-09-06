import { describe, expect, it } from 'vitest'
import { reducer } from '../lib/gameReducer'
import { initialState, normalizeSave, SAVE_VERSION } from '../lib/storage'
import type { GameState, MatchResult, Squad } from '../lib/types'

const result = (): MatchResult => ({
  result: 'W',
  scoreFor: 2,
  scoreAgainst: 1,
  opponent: '연습 상대',
  opponentRating: 60,
  reward: 500,
  scorerUids: [],
  opponentScorerUids: [],
  events: [],
  possession: 52,
  shotsFor: 12,
  shotsAgainst: 9,
  seed: 'test-seed',
  engineVersion: 'test',
})

/** The same squad with one starter swapped for a bench player. */
function withSub(squad: Squad): { squad: Squad; slotId: string; benchUid: string } {
  const slotId = Object.keys(squad.slots).find((id) => squad.slots[id])!
  const benchUid = squad.bench.find((uid): uid is string => Boolean(uid))!
  const outUid = squad.slots[slotId]!
  return {
    slotId,
    benchUid,
    squad: {
      ...squad,
      slots: { ...squad.slots, [slotId]: benchUid },
      bench: squad.bench.map((uid) => (uid === benchUid ? outUid : uid)),
    },
  }
}

describe('the team sheet after a match', () => {
  it('comes back as the manager set it, not as the match ended', () => {
    const state = initialState()
    const { squad: swapped, slotId, benchUid } = withSub(state.squad)
    expect(swapped.slots[slotId]).toBe(benchUid)

    const next = reducer(state, {
      type: 'miniGame',
      result: result(),
      lineup: { squad: swapped, subs: [] },
    })

    // The substitute played, but the starter has his place back.
    expect(next.squad.slots[slotId]).toBe(state.squad.slots[slotId])
    expect(next.squad).toEqual(state.squad)
  })

  it('still tires the players who actually took the field (PvP — friendlies no longer cost legs)', () => {
    const state = initialState()
    const { squad: swapped, benchUid } = withSub(state.squad)

    const next = reducer(state, {
      type: 'pvpMatch',
      result: result(),
      lineup: { squad: swapped, subs: [] },
    })

    // The substitute started this match, so he is the one who is tired.
    const sub = next.cards.find((card) => card.uid === benchUid)
    const before = state.cards.find((card) => card.uid === benchUid)
    expect(sub!.condition).toBeLessThan(before!.condition)
  })
})

describe('automatic substitution', () => {
  it('is on for a save written before the setting existed', () => {
    const old = { ...initialState(), version: SAVE_VERSION } as Partial<GameState>
    delete old.autoSub
    expect(normalizeSave(old)?.autoSub).toBe(true)
  })

  it('respects a manager who turned it off on purpose', () => {
    const off = { ...initialState(), autoSub: false }
    expect(normalizeSave(off)?.autoSub).toBe(false)
  })

  it('is on in a fresh save', () => {
    expect(initialState().autoSub).toBe(true)
  })
})
