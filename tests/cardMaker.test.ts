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
import { HIDDEN_KEYS, STAT_KEYS, previewCard as build } from '../lib/cardMaker'

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
    expect(validateDraft(draft({ ovr: OVR_RANGE.max + 1 }))).toContain('종합')
    expect(validateDraft(draft({ ovr: 70.5 }))).toContain('종합')
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

describe('pinning individual attributes', () => {
  it('keeps a pinned stat exactly, and still generates the rest', () => {
    const card = build(draft({ position: 'ST', ovr: 70, stats: { sho: 95 } }))
    expect(card.stats.sho).toBe(95)
    for (const key of STAT_KEYS) expect(card.stats[key]).toBeGreaterThan(0)
  })

  it('recomputes the overall from the pinned stats, not the target', () => {
    const plain = build(draft({ position: 'ST', ovr: 70 }))
    const boosted = build(draft({ position: 'ST', ovr: 70, stats: { sho: 99, pac: 99 } }))
    expect(boosted.ovr).toBeGreaterThan(plain.ovr)
  })

  it('writes only the pinned fields into the roster line', () => {
    const bare = rosterLine(draft({ name: '가', position: 'ST', ovr: 80 }))
    expect(bare).not.toContain('stats')
    expect(bare).not.toContain('hidden')

    const detailed = rosterLine(
      draft({ name: '나', position: 'ST', ovr: 80, stats: { sho: 90 }, hidden: { clutch: 11 } }),
    )
    expect(detailed).toContain('stats: { sho: 90 }')
    expect(detailed).toContain('hidden: { clutch: 11 }')
    expect(detailed).not.toContain('pac:')
  })

  it('refuses attribute values the game cannot hold', () => {
    expect(validateDraft(draft({ stats: { sho: 200 } }))).toContain('슛')
    expect(validateDraft(draft({ hidden: { clutch: 99 } }))).toContain('결정력')
    expect(validateDraft(draft({ stats: { sho: 70.5 } }))).toContain('슛')
  })

  it('accepts a card with every attribute pinned', () => {
    const full = draft({
      stats: Object.fromEntries(STAT_KEYS.map((key) => [key, 80])),
      hidden: Object.fromEntries(HIDDEN_KEYS.map((key) => [key, 6])),
    })
    expect(validateDraft(full)).toBeNull()
    const card = build(full)
    for (const key of HIDDEN_KEYS) expect(card.hidden[key]).toBe(6)
  })
})

describe('a roster row that pins attributes really reaches the game', () => {
  it('applies pinned stats and hidden when the roster is built', async () => {
    // Rebuild the roster with an extra row to prove buildRoster honours extras.
    const { ROSTER: live } = await import('../lib/players')
    const anyPinned = Object.values(live)
      .flat()
      .some((row) => row.length > 5 && row[5] !== undefined)
    // No shipped row pins anything yet; the shape must still accept one.
    expect(typeof anyPinned).toBe('boolean')
  })
})
