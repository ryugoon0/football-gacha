import { describe, expect, it } from 'vitest'
import { isFreshSave, planSync, progressScore, summarize } from '../lib/cloudSave'
import { initialState } from '../lib/storage'
import type { GameState } from '../lib/types'

const played = (state: GameState, wins: number): GameState => ({
  ...state,
  record: { ...state.record, w: wins },
})

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
