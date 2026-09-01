import { describe, expect, it } from 'vitest'
import { applyAutoSubs, SUB_READY_CONDITION, TIRED_SUB_THRESHOLD } from '../lib/autoSub'
import { MARKET_RARITIES, rollListings } from '../lib/market'
import { getPlayer, seededRandom } from '../lib/players'
import { SEASON_SCHEDULE, TOTAL_MATCHDAYS, buildSchedule } from '../lib/schedule'
import { CUP_ROUNDS } from '../lib/cup'
import { ROUNDS_PER_SEASON, TEAMS_PER_LEAGUE } from '../lib/league'
import { autoFill, evaluateSquad, lineupCapOf, BENCH_SIZE } from '../lib/squad'
import { initialState } from '../lib/storage'
import type { Card } from '../lib/types'

describe('lineup level cap', () => {
  it('gives every division a budget that grows towards the top', () => {
    expect(lineupCapOf(2)).toBe(89)
    expect(lineupCapOf(1)).toBe(110)
    expect(lineupCapOf(5)).toBeLessThan(lineupCapOf(2))
  })

  it('flags a line-up that goes over the division budget', () => {
    const state = initialState()
    const under = evaluateSquad(state.cards, state.squad, 5)
    expect(under.levelTotal).toBe(
      Object.values(state.squad.slots).filter(Boolean).length * 2,
    )
    expect(under.overCap).toBe(false)

    const stacked = state.cards.map((card) => ({ ...card, level: 10 }))
    const over = evaluateSquad(stacked, state.squad, 5)
    expect(over.levelTotal).toBe(110)
    expect(over.overCap).toBe(true)
  })

  it('keeps the auto line-up inside the budget when it can', () => {
    const state = initialState()
    const squad = autoFill(state.cards, state.squad, 5)
    const rating = evaluateSquad(state.cards, squad, 5)

    expect(rating.levelTotal).toBeLessThanOrEqual(lineupCapOf(5))
    expect(squad.bench.length).toBe(BENCH_SIZE)
  })

  it('still fields eleven when nobody fits the budget, and says so', () => {
    const state = initialState()
    const strong: Card[] = state.cards.map((card) => ({ ...card, level: 8, limit: 8 }))
    const squad = autoFill(strong, state.squad, 5)
    const rating = evaluateSquad(strong, squad, 5)

    // An empty slot cannot play at all; an over budget eleven can be fixed by
    // swapping one player down, and the screen warns about it.
    expect(rating.evaluations.filter((item) => item.card)).toHaveLength(11)
    expect(rating.overCap).toBe(true)
    expect(squad.bench.length).toBe(BENCH_SIZE)
  })

  it('prefers proper fits and only asks anyone to play out of position last', () => {
    const state = initialState()
    const squad = autoFill(state.cards, state.squad, 5)
    const rating = evaluateSquad(state.cards, squad, 5)
    for (const slot of rating.evaluations) {
      if (!slot.player) continue
      expect(slot.fit).not.toBe('out')
    }
  })

  it('fills a position nobody plays rather than leaving it empty', () => {
    const state = initialState()
    // Only two players left, neither a keeper: the eleven is still filled.
    const outfield = state.cards
      .filter((card) => getPlayer(card.playerId)?.position !== 'GK')
      .slice(0, 11)
    const squad = autoFill(outfield, state.squad, 5)
    const rating = evaluateSquad(outfield, squad, 5)

    expect(rating.evaluations.filter((item) => item.card)).toHaveLength(11)
    const keeper = rating.evaluations.find((item) => item.slotPosition === 'GK')
    expect(keeper?.card).toBeTruthy()
    expect(keeper?.fit).toBe('out')
  })
})

describe('auto substitution', () => {
  const withBench = () => {
    const state = initialState()
    return { ...state, squad: { ...state.squad } }
  }

  it('replaces an injured starter with a fit substitute', () => {
    const state = withBench()
    const starterUid = state.squad.slots.f2!
    const cards = state.cards.map((card) =>
      card.uid === starterUid ? { ...card, injuredFor: 2 } : card,
    )

    const { squad, subs } = applyAutoSubs(cards, state.squad, 5)
    expect(subs.length).toBeGreaterThan(0)
    expect(squad.slots.f2).not.toBe(starterUid)
    // The injured player drops to the bench rather than vanishing.
    expect(squad.bench).toContain(starterUid)
  })

  it('replaces an exhausted starter', () => {
    const state = withBench()
    const starterUid = state.squad.slots.m1!
    const cards = state.cards.map((card) =>
      card.uid === starterUid ? { ...card, condition: TIRED_SUB_THRESHOLD - 1 } : card,
    )

    const { subs } = applyAutoSubs(cards, state.squad, 5)
    expect(subs.some((sub) => sub.outUid === starterUid && sub.reason === 'fatigue')).toBe(true)
  })

  it('leaves a healthy eleven alone', () => {
    const state = withBench()
    const { squad, subs } = applyAutoSubs(state.cards, state.squad, 5)
    expect(subs).toHaveLength(0)
    expect(squad.slots).toEqual(state.squad.slots)
  })

  it('will not bring on a substitute who is hurt or spent', () => {
    const state = withBench()
    const starterUid = state.squad.slots.f2!
    const cards = state.cards.map((card) => {
      if (card.uid === starterUid) return { ...card, injuredFor: 1 }
      if (state.squad.bench.includes(card.uid)) {
        return { ...card, condition: SUB_READY_CONDITION - 10 }
      }
      return card
    })

    const { subs } = applyAutoSubs(cards, state.squad, 5)
    expect(subs).toHaveLength(0)
  })
})

describe('combined calendar', () => {
  it('mixes cup ties into the league season', () => {
    expect(TOTAL_MATCHDAYS).toBe(ROUNDS_PER_SEASON + CUP_ROUNDS)
    expect(SEASON_SCHEDULE.filter((day) => day.kind === 'league')).toHaveLength(ROUNDS_PER_SEASON)
    expect(SEASON_SCHEDULE.filter((day) => day.kind === 'cup')).toHaveLength(CUP_ROUNDS)
  })

  it('numbers every competition round exactly once, in order', () => {
    const league = SEASON_SCHEDULE.filter((day) => day.kind === 'league').map((day) => day.round)
    const cup = SEASON_SCHEDULE.filter((day) => day.kind === 'cup').map((day) => day.round)
    expect(league).toEqual(Array.from({ length: ROUNDS_PER_SEASON }, (_, index) => index))
    expect(cup).toEqual(Array.from({ length: CUP_ROUNDS }, (_, index) => index))
  })

  it('does not put two cup ties back to back', () => {
    for (let i = 1; i < SEASON_SCHEDULE.length; i++) {
      const back = SEASON_SCHEDULE[i - 1].kind === 'cup' && SEASON_SCHEDULE[i].kind === 'cup'
      expect(back).toBe(false)
    }
  })

  it('still fits every cup round when the league is short', () => {
    const short = buildSchedule(4, 4)
    expect(short.filter((day) => day.kind === 'cup')).toHaveLength(4)
    expect(short.filter((day) => day.kind === 'league')).toHaveLength(4)
  })
})

describe('league size', () => {
  it('runs a twenty team division', () => {
    expect(TEAMS_PER_LEAGUE).toBe(20)
    expect(ROUNDS_PER_SEASON).toBe(19)
  })
})

describe('transfer market', () => {
  it('only lists 일반 and 실버 players', () => {
    const rng = seededRandom(21)
    for (const division of [5, 3, 1]) {
      for (let i = 0; i < 40; i++) {
        for (const listing of rollListings(division, rng)) {
          const player = getPlayer(listing.playerId)!
          expect(MARKET_RARITIES).toContain(player.rarity)
        }
      }
    }
  })
})
