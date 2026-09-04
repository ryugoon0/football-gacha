import { describe, expect, it } from 'vitest'
import { ITEMS } from '../lib/items'
import { initialState } from '../lib/storage'
import { DEFAULT_PARAMS } from '../lib/tactics/params'
import { buildWeeklyMatchSetup, weeklyAiSquad } from '../lib/weeklyLeague/liveMatch'
import { replayFixture, type LiveCommand, type LiveSnapshot } from '../lib/weeklyLeague/liveReplay'
import { TACTIC_CARDS, TACTIC_CARD_IDS, applyCardOverlay } from '../lib/weeklyLeague/tacticCards'

function snapshotOf(): LiveSnapshot {
  const state = initialState()
  const ai = weeklyAiSquad(3, 1, 62)
  const home = { cards: state.cards, squad: state.squad, division: 5, autoSub: false }
  const away = { cards: ai.cards, squad: ai.squad, division: 5, autoSub: false }
  const setup = buildWeeklyMatchSetup({
    groupId: 3,
    home: { slot: 0, kind: 'user', clubName: state.club, rating: 70 },
    away: { slot: 1, kind: 'ai', clubName: 'AI', rating: 62 },
    homeInput: home,
    awayInput: away,
    neutralVenue: false,
  })
  return { setup, home, away }
}

describe('작전카드 definitions', () => {
  it('every card is a shop item usable before a weekly match, with a price attached', () => {
    for (const id of TACTIC_CARD_IDS) {
      const item = ITEMS[id]
      expect(item).toBeDefined()
      expect(item.target).toBe('match')
      expect(item.gold ?? 0).toBeGreaterThan(0)
      const card = TACTIC_CARDS[id]
      expect(Object.keys(card.effect).length).toBeGreaterThan(0)
      // No free lunch: each card also costs something.
      expect(Object.values(card.tradeoff).some((value) => (value ?? 0) < 0)).toBe(true)
      expect(card.durationMinutes).toBeGreaterThan(0)
    }
  })

  it('moves the parameters by effect and tradeoff and stays inside 0–100', () => {
    const card = TACTIC_CARDS.cardAllOutAttack
    const next = applyCardOverlay(DEFAULT_PARAMS, card)
    expect(next.forwardRunFrequency).toBe(Math.min(100, DEFAULT_PARAMS.forwardRunFrequency + 25))
    expect(next.restDefence).toBe(Math.max(0, DEFAULT_PARAMS.restDefence - 30))
    for (const value of Object.values(next)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})

describe('작전카드 in a live fixture', () => {
  it('plays at kick-off, shows in the feed, and wears off on the clock', () => {
    const snapshot = snapshotOf()
    const command: LiveCommand = { id: 1, side: 'home', minute: 0, payload: { kind: 'card', cardId: 'cardQuickCounter' } }
    const during = replayFixture(snapshot, 'card-1', [command], 5)
    expect(during.cardPlayed.home).toBe('cardQuickCounter')
    expect(during.applied).toHaveLength(1)
    expect(during.applied[0].appliedMinute).toBe(0)
    expect(during.setup.params?.counterAttackIntensity).toBeGreaterThan(DEFAULT_PARAMS.counterAttackIntensity)

    const after = replayFixture(snapshot, 'card-1', [command], 30)
    expect(after.setup.params?.counterAttackIntensity).toBe(DEFAULT_PARAMS.counterAttackIntensity)
    expect(after.state.events.some((event) => event.type === 'note' && event.text.includes('효과 종료'))).toBe(true)
  })

  it('refuses a card after kick-off and a second card', () => {
    const snapshot = snapshotOf()
    const late: LiveCommand = { id: 1, side: 'home', minute: 12, payload: { kind: 'card', cardId: 'cardCalmDefence' } }
    const first: LiveCommand = { id: 2, side: 'away', minute: 0, payload: { kind: 'card', cardId: 'cardCalmDefence' } }
    const second: LiveCommand = { id: 3, side: 'away', minute: 0, payload: { kind: 'card', cardId: 'cardAllOutAttack' } }
    const result = replayFixture(snapshot, 'card-2', [late, first, second], 90)
    expect(result.rejected.some((item) => item.id === 1)).toBe(true)
    expect(result.rejected.some((item) => item.id === 3)).toBe(true)
    expect(result.cardPlayed.away).toBe('cardCalmDefence')
    expect(result.cardPlayed.home).toBeNull()
  })

  it('changes the match compared with the same seed and no card', () => {
    const snapshot = snapshotOf()
    const command: LiveCommand = { id: 1, side: 'home', minute: 0, payload: { kind: 'card', cardId: 'cardAllOutAttack' } }
    let differed = 0
    for (let seed = 0; seed < 6; seed++) {
      const plain = replayFixture(snapshot, `card-3-${seed}`, [], 90)
      const carded = replayFixture(snapshot, `card-3-${seed}`, [command], 90)
      if (plain.state.events.length !== carded.state.events.length || plain.state.scoreFor !== carded.state.scoreFor) differed += 1
    }
    expect(differed).toBeGreaterThan(0)
  })
})
