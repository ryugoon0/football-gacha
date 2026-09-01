import { describe, expect, it } from 'vitest'
import {
  MAX_SAVE_BYTES,
  isFreshSave,
  isSaveTooBig,
  planSync,
  progressScore,
  readCloudSave,
  saveSize,
  summarize,
} from '../lib/cloudSave'
import { initialState } from '../lib/storage'
import type { GameState } from '../lib/types'

const played = (state: GameState, wins: number): GameState => ({
  ...state,
  record: { ...state.record, w: wins },
})

const NOW = '2026-09-01T00:00:00Z'

describe('cloud save sync', () => {
  it('treats a brand new save as disposable', () => {
    expect(isFreshSave(initialState())).toBe(true)
    expect(isFreshSave(played(initialState(), 1))).toBe(false)
  })

  it('scores progress by cards, matches, seasons and cups', () => {
    const base = initialState()
    expect(progressScore(played(base, 3))).toBeGreaterThan(progressScore(base))
    expect(
      progressScore({ ...base, season: { ...base.season, index: 4 } }),
    ).toBeGreaterThan(progressScore(base))
  })

  it('uploads the local save when there is nothing in the cloud', () => {
    expect(planSync(played(initialState(), 2), null)).toEqual({
      choice: 'useLocal',
      needsPrompt: false,
    })
  })

  it('pulls the cloud save down onto an untouched browser', () => {
    const cloud = { state: played(initialState(), 5), updatedAt: '2026-01-01T00:00:00Z' }
    expect(planSync(initialState(), cloud)).toEqual({ choice: 'useCloud', needsPrompt: false })
  })

  it('keeps local progress when the cloud save is empty', () => {
    const cloud = { state: initialState(), updatedAt: '2026-01-01T00:00:00Z' }
    expect(planSync(played(initialState(), 5), cloud)).toEqual({
      choice: 'useLocal',
      needsPrompt: false,
    })
  })

  it('asks the player when both sides have real progress', () => {
    const cloud = { state: played(initialState(), 9), updatedAt: '2026-01-01T00:00:00Z' }
    const plan = planSync(played(initialState(), 4), cloud)
    expect(plan.needsPrompt).toBe(true)
    expect(plan.choice).toBe('noConflict')
  })

  it('describes a save well enough to choose between two', () => {
    const summary = summarize(played(initialState(), 3))
    expect(summary.record).toBe('3승 0무 0패')
    expect(summary.cards).toBeGreaterThan(0)
    expect(summary.club).toBe(initialState().club)
  })
})

describe('cloud save hardening', () => {
  it('rejects anything that is not a save', () => {
    expect(readCloudSave(null, NOW)).toBeNull()
    expect(readCloudSave('hello', NOW)).toBeNull()
    expect(readCloudSave({ cards: 'not an array' }, NOW)).toBeNull()
    expect(readCloudSave({ version: 999, cards: [] }, NOW)).toBeNull()
  })

  it('accepts and migrates a real save', () => {
    const save = readCloudSave(initialState(), NOW)
    expect(save?.state.club).toBe(initialState().club)
    expect(save?.updatedAt).toBe(NOW)
  })

  it('refuses a save far larger than any real one', () => {
    const bloated = {
      ...initialState(),
      history: Array.from({ length: 20000 }, (_, index) => ({
        id: `h${index}`,
        competition: 'league' as const,
        opponent: '가짜 상대 이름을 길게 늘려 용량을 부풀립니다',
        scoreFor: 1,
        scoreAgainst: 0,
        result: 'W' as const,
        reward: 100,
        at: 1_756_684_800_000,
      })),
    }
    expect(isSaveTooBig(bloated)).toBe(true)
    expect(readCloudSave(bloated, NOW)).toBeNull()
    expect(isSaveTooBig(initialState())).toBe(false)
    expect(saveSize(initialState())).toBeLessThan(MAX_SAVE_BYTES)
  })
})
