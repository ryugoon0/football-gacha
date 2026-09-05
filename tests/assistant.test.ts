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

  it('tells the club where last week sent it, in each voice, before anything else', () => {
    const state = initialState()
    const recap = { weekId: 'regular-2026-09-07', groupId: 7, prevTier: 1, newTier: 0, rank: 2, points: 40, w: 12, d: 4, l: 2, movement: 'up' as const }
    const home = assistantSpeech('hanareum', { tab: 'home', state, hourKst: 10, squadGaps: { empty: 0, injured: 0 }, recap })
    expect(home.text).toContain('승격')
    expect(home.expression).toBe('determined')
    const squad = assistantSpeech('seojian', { tab: 'squad', state, hourKst: 10, squadGaps: { empty: 0, injured: 0 }, recap })
    expect(squad.text).toContain('12승 4무 2패')
    const weekly = assistantSpeech('baeksoyeon', { tab: 'weekly', state, hourKst: 10, unclaimedRewards: 500, recap })
    expect(weekly.text).toContain('승격')
    const down = assistantSpeech('hanareum', { tab: 'home', state, hourKst: 10, squadGaps: { empty: 0, injured: 0 }, recap: { ...recap, prevTier: 0, newTier: 1, rank: 15, movement: 'down' } })
    expect(down.expression).toBe('sad')
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
