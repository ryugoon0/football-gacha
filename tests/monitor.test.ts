import { describe, expect, it } from 'vitest'
import { riskOf, SIGNAL_LABELS, type WatchRow } from '../lib/monitor'

const row = (over: Partial<WatchRow>): Pick<WatchRow, 'signals' | 'score' | 'kinds'> => ({
  signals: 1,
  score: 1,
  kinds: ['gold_rate'],
  ...over,
})

describe('reading the watchlist', () => {
  it('does not condemn an account on one ordinary signal', () => {
    expect(riskOf(row({ signals: 1, kinds: ['write_rate'] }))).toBe('low')
    expect(riskOf(row({ signals: 1, kinds: ['spam'] }))).toBe('low')
  })

  it('treats a rejected save as worth a look on its own', () => {
    // The server already decided this state was impossible.
    expect(riskOf(row({ signals: 1, kinds: ['reject'] }))).toBe('medium')
  })

  it('raises the risk when unrelated signals coincide', () => {
    expect(riskOf(row({ signals: 2, kinds: ['gold_rate', 'match_rate'] }))).toBe('medium')
    expect(riskOf(row({ signals: 3, kinds: ['gold_rate', 'match_rate', 'rollback'] }))).toBe('high')
    expect(riskOf(row({ signals: 2, kinds: ['reject', 'rollback'] }))).toBe('high')
  })

  it('survives a row with no signal list', () => {
    expect(riskOf({ signals: 0, score: 0, kinds: null })).toBe('low')
  })

  it('has a Korean label for every signal the database can emit', () => {
    // These must match the union in public.watchlist.
    for (const kind of ['reject', 'write_rate', 'gold_rate', 'match_rate', 'rollback', 'spam']) {
      expect(SIGNAL_LABELS[kind]).toBeTruthy()
    }
  })
})
