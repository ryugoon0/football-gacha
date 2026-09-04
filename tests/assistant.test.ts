import { describe, expect, it } from 'vitest'
import { ASSISTANTS, assistantForTab, assistantImage, assistantLine, type AssistantId } from '../lib/assistant'
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
})
