import { describe, expect, it } from 'vitest'
import {
  ASSISTANTS,
  BRIEFING_WINDOW_MS,
  assistantForTab,
  assistantImage,
  assistantLine,
  assistantSpeech,
  minutesToNextKickoff,
  type AssistantId,
} from '../lib/assistant'
import { initialState } from '../lib/storage'

describe('assistants', () => {
  it('gives every screen at most one voice, and the money screens to the same one', () => {
    expect(assistantForTab('home')).toBe('hanareum')
    expect(assistantForTab('match')).toBe('hanareum')
    expect(assistantForTab('pvp')).toBe('hanareum')
    expect(assistantForTab('squad')).toBe('seojian')
    expect(assistantForTab('club')).toBe('seojian')
    expect(assistantForTab('weekly')).toBe('baeksoyeon')
    expect(assistantForTab('market')).toBe(assistantForTab('items'))
    expect(assistantForTab('gacha')).toBeNull()
    expect(assistantForTab('board')).toBeNull()
  })

  it('always has something to say on its own screens, in each mode', () => {
    const state = initialState()
    for (const tab of ['home', 'match', 'pvp', 'squad', 'club', 'weekly', 'market', 'items']) {
      const id = assistantForTab(tab) as AssistantId
      const line = assistantLine(id, { tab, state, hourKst: 10, squadGaps: { empty: 0, injured: 0 } })
      expect(line.length).toBeGreaterThan(5)
      expect(assistantImage(id, 'open')).toMatch(/^\/assistants\/open\//)
      expect(assistantImage(id, 'safe', 'full')).toBe(`/assistants/safe/${id}.webp`)
    }
  })

  it('reads the save — an empty slot is called out before anything else', () => {
    const state = initialState()
    const line = assistantLine('hanareum', { tab: 'home', state, hourKst: 10, squadGaps: { empty: 2, injured: 0 } })
    expect(line).toContain('빈 자리')
    const analyst = assistantLine('seojian', { tab: 'squad', state, hourKst: 10, squadGaps: { empty: 1, injured: 0 } })
    expect(analyst).toContain('비어')
    expect(Object.keys(ASSISTANTS)).toHaveLength(3)
  })

  it('briefs a match that just ended, with a face to match, then lets it go', () => {
    const state = initialState()
    const now = 1_800_000_000_000
    const base = { id: 'm1', competition: 'league' as const, opponent: '강북 FC', reward: 300, at: now - 60_000 }
    state.history = [{ ...base, scoreFor: 4, scoreAgainst: 0, result: 'W' }]
    const win = assistantSpeech('hanareum', { tab: 'home', state, hourKst: 10, nowMs: now })
    expect(win.text).toContain('4:0')
    expect(win.expression).toBe('determined')

    state.history = [{ ...base, scoreFor: 1, scoreAgainst: 2, result: 'L' }]
    const loss = assistantSpeech('hanareum', { tab: 'match', state, hourKst: 10, nowMs: now })
    expect(loss.text).toContain('1:2')
    expect(loss.expression).toBe('sad')

    const stale = assistantSpeech('hanareum', { tab: 'home', state, hourKst: 10, nowMs: now + BRIEFING_WINDOW_MS + 1 })
    expect(stale.text).not.toContain('1:2')
  })

  it('counts down to the next weekly kick-off only inside the schedule', () => {
    expect(minutesToNextKickoff(14, 52)).toBe(8)
    expect(minutesToNextKickoff(14, 30)).toBeNull()
    expect(minutesToNextKickoff(23, 55)).toBeNull() // 00:00 has no fixture
    expect(minutesToNextKickoff(7, 55)).toBeNull() // 08:00 has no fixture
    expect(minutesToNextKickoff(8, 57)).toBe(3)
    const state = initialState()
    const line = assistantLine('hanareum', { tab: 'home', state, hourKst: 14, minuteKst: 57, squadGaps: { empty: 0, injured: 0 } })
    expect(line).toContain('3분 뒤')
  })
})
