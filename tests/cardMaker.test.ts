import { describe, expect, it } from 'vitest'
import {
  OVR_RANGE,
  POSITION_CHOICES,
  emptyDraft,
  nameTaken,
  nextId,
  previewCard,
  rosterLine,
  validateDraft,
} from '../lib/cardMaker'
import { PLAYERS, ROSTER } from '../lib/players'

const draft = (over = {}) => ({ ...emptyDraft(), name: '테스트선수', ...over })

describe('making a new card', () => {
  it('refuses a card that would collide with one that exists', () => {
    expect(nameTaken(PLAYERS[0].name)).toBe(true)
    expect(validateDraft(draft({ name: PLAYERS[0].name }))).toContain('이미 있습니다')
  })

  it('refuses a name that would break the generated code', () => {
    // The line is pasted into a TypeScript file inside single quotes.
    expect(validateDraft(draft({ name: "오'브라이언" }))).toContain('작은따옴표')
  })

  it('refuses an overall outside what the game can build', () => {
    expect(validateDraft(draft({ ovr: OVR_RANGE.max + 1 }))).toContain('사이여야')
    expect(validateDraft(draft({ ovr: 70.5 }))).toContain('사이여야')
  })

  it('accepts a sound card', () => {
    expect(validateDraft(draft())).toBeNull()
  })

  it('gives the card the next free number in its rarity', () => {
    for (const rarity of ['Normal', 'Rare', 'Legend'] as const) {
      const id = nextId(rarity)
      expect(PLAYERS.some((player) => player.id === id)).toBe(false)
      expect(id).toMatch(/^[A-Za-z]+\d{2,}$/)
    }
  })

  it('previews the card the game would really build, not the number typed', () => {
    // Stats are shaped by position then normalised, so the result can differ.
    const card = previewCard(draft({ position: 'GK', ovr: 80 }))
    expect(card.position).toBe('GK')
    expect(Math.abs(card.ovr - 80)).toBeLessThanOrEqual(3)
    expect(card.stats.def).toBeGreaterThan(card.stats.sho)
  })

  it('writes a roster line in the same shape as the ones already there', () => {
    const line = rosterLine(draft({ name: '손차범', position: 'ST', ovr: 88 }))
    expect(line.trim()).toMatch(/^\['손차범', 'ST', 88, '.+', '.+'\],$/)
  })

  it('offers only positions the roster actually uses', () => {
    const used = new Set(Object.values(ROSTER).flat().map((row) => row[1]))
    for (const position of used) expect(POSITION_CHOICES).toContain(position)
  })
})
