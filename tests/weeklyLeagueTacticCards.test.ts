import { describe, expect, it } from 'vitest'
import { ITEMS } from '../lib/items'
import { initialState } from '../lib/storage'
import { buildWeeklyMatchSetup, weeklyAiSquad } from '../lib/weeklyLeague/liveMatch'
import { replayFixture, type LiveCommand, type LiveSnapshot } from '../lib/weeklyLeague/liveReplay'
import { TACTIC_CARDS, TACTIC_CARD_IDS, boostLabel, boostRating, type CardContext } from '../lib/weeklyLeague/tacticCards'
import { POSITION_GROUP } from '../lib/players'

function snapshotOf(kickoffUtcMs?: number): LiveSnapshot {
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
  return { setup, home, away, kickoffUtcMs }
}

const ctx = (over: Partial<CardContext> = {}): CardContext => ({
  minute: 30,
  myScore: 0,
  theirScore: 0,
  myShots: 3,
  theirShots: 3,
  venue: 'home',
  myOverall: 100,
  theirOverall: 100,
  hotTime: false,
  ...over,
})

describe('히든 카드 definitions', () => {
  it('every card is a shop item playable before a weekly match, with a condition and a boost', () => {
    for (const id of TACTIC_CARD_IDS) {
      const item = ITEMS[id]
      expect(item).toBeDefined()
      expect(item.target).toBe('match')
      expect(item.gold ?? 0).toBeGreaterThan(0)
      const card = TACTIC_CARDS[id]
      expect(card.boost.amount).toBeGreaterThan(0)
      expect(card.when.length).toBeGreaterThan(0)
    }
  })

  it('reads its condition like the original — the underdog card only against a stronger side', () => {
    expect(TACTIC_CARDS.cardUnderdog.triggers(ctx({ myOverall: 90, theirOverall: 95 }))).toBe(true)
    expect(TACTIC_CARDS.cardUnderdog.triggers(ctx({ myOverall: 95, theirOverall: 90 }))).toBe(false)
    expect(TACTIC_CARDS.cardChaser.triggers(ctx({ myScore: 0, theirScore: 1 }))).toBe(true)
    expect(TACTIC_CARDS.cardChaser.triggers(ctx({ myScore: 1, theirScore: 1 }))).toBe(false)
    expect(TACTIC_CARDS.cardFastStart.triggers(ctx({ minute: 10 }))).toBe(true)
    expect(TACTIC_CARDS.cardFastStart.triggers(ctx({ minute: 21 }))).toBe(false)
    expect(TACTIC_CARDS.cardAwayGrit.triggers(ctx({ venue: 'away' }))).toBe(true)
    expect(TACTIC_CARDS.cardHotTime.triggers(ctx({ hotTime: true }))).toBe(true)
    expect(TACTIC_CARDS.cardGoalmouth.triggers(ctx({ theirShots: 8 }))).toBe(true)
  })

  it('lifts only the players and stats the card names, capped at 99', () => {
    const { rating } = weeklyAiSquad(1, 2, 70)
    const all = boostRating(rating, { amount: 5 })
    expect(all.overall).toBe(rating.overall + 5)
    for (let i = 0; i < rating.evaluations.length; i++) {
      const before = rating.evaluations[i]
      const after = all.evaluations[i]
      if (!before.player || !after.player) continue
      expect(after.rating).toBe(Math.min(99, before.rating + 5))
      expect(after.player.stats.pac).toBe(Math.min(99, before.player.stats.pac + 5))
    }

    const narrow = boostRating(rating, { amount: 6, positions: ['FW'], stats: ['sho'] })
    for (let i = 0; i < rating.evaluations.length; i++) {
      const before = rating.evaluations[i]
      const after = narrow.evaluations[i]
      if (!before.player || !after.player) continue
      const isForward = POSITION_GROUP[before.slotPosition] === 'FW'
      expect(after.player.stats.sho).toBe(isForward ? Math.min(99, before.player.stats.sho + 6) : before.player.stats.sho)
      expect(after.player.stats.pas).toBe(before.player.stats.pas)
    }
    // The base is untouched — the card can switch off again.
    expect(rating.evaluations[0].player?.stats).toEqual(weeklyAiSquad(1, 2, 70).rating.evaluations[0].player?.stats)
    expect(boostLabel({ amount: 6, positions: ['FW'], stats: ['sho'] })).toBe('공격 슈팅 +6')
    expect(boostLabel({ amount: 5 })).toBe('전원 모든 능력치 +5')
  })
})

describe('히든 카드 in a live fixture', () => {
  it('is announced at kick-off and marked active while its condition holds', () => {
    const snapshot = snapshotOf()
    const command: LiveCommand = { id: 1, side: 'home', minute: 0, payload: { kind: 'card', cardId: 'cardFastStart' } }
    const early = replayFixture(snapshot, 'card-1', [command], 10)
    expect(early.cardPlayed.home).toBe('cardFastStart')
    expect(early.applied).toHaveLength(1)
    expect(early.cardActive.home).toBe(true)
    expect(early.state.events.some((event) => event.type === 'note' && event.text.includes('발동'))).toBe(true)

    const late = replayFixture(snapshot, 'card-1', [command], 40)
    expect(late.cardActive.home).toBe(false)
    expect(late.state.events.some((event) => event.type === 'note' && event.text.includes('대기'))).toBe(true)
    // The commanded setup never carries the boost.
    expect(late.setup.team.overall).toBe(snapshot.setup.team.overall)
  })

  it('refuses a card after kick-off and a second card', () => {
    const snapshot = snapshotOf()
    const late: LiveCommand = { id: 1, side: 'home', minute: 12, payload: { kind: 'card', cardId: 'cardHomeCrowd' } }
    const first: LiveCommand = { id: 2, side: 'away', minute: 0, payload: { kind: 'card', cardId: 'cardAwayGrit' } }
    const second: LiveCommand = { id: 3, side: 'away', minute: 0, payload: { kind: 'card', cardId: 'cardChaser' } }
    const result = replayFixture(snapshot, 'card-2', [late, first, second], 90)
    expect(result.rejected.some((item) => item.id === 1)).toBe(true)
    expect(result.rejected.some((item) => item.id === 3)).toBe(true)
    expect(result.cardPlayed.away).toBe('cardAwayGrit')
    expect(result.cardActive.away).toBe(true)
    expect(result.cardPlayed.home).toBeNull()
  })

  it('a card that never triggers changes nothing; one that does changes the match', () => {
    const snapshot = snapshotOf()
    const never: LiveCommand = { id: 1, side: 'home', minute: 0, payload: { kind: 'card', cardId: 'cardBigStage' } } // not neutral
    const always: LiveCommand = { id: 1, side: 'home', minute: 0, payload: { kind: 'card', cardId: 'cardHomeCrowd' } }
    let changed = 0
    for (let seed = 0; seed < 5; seed++) {
      const plain = replayFixture(snapshot, `card-3-${seed}`, [], 90)
      const off = replayFixture(snapshot, `card-3-${seed}`, [never], 90)
      const on = replayFixture(snapshot, `card-3-${seed}`, [always], 90)
      // Same dice, same play: only the kick-off note differs.
      expect(off.state.scoreFor).toBe(plain.state.scoreFor)
      expect(off.state.scoreAgainst).toBe(plain.state.scoreAgainst)
      if (on.state.scoreFor !== plain.state.scoreFor || on.state.events.length !== plain.state.events.length + 2) changed += 1
    }
    expect(changed).toBeGreaterThan(0)
  })
})
