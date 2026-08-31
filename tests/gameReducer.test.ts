import { describe, expect, it } from 'vitest'
import { DAILY_MISSIONS, freshDaily, missionClaimable, rollOver, todayKey } from '../lib/daily'
import { FUSION_FEE, FUSION_SIZE, checkFusion, nextRarity } from '../lib/fusion'
import { MAX_CONDITION, treatmentCost, recoveryCost } from '../lib/condition'
import { createCup, myTie } from '../lib/cup'
import { addExperience, expForLevel, materialExp, trainingFee } from '../lib/growth'
import { reducer } from '../lib/gameReducer'
import { MY_TEAM_ID, ROUNDS_PER_SEASON, createSeason, myFixture } from '../lib/league'
import { PLAYERS_BY_RARITY, getPlayer, levelCap } from '../lib/players'
import { rollListings, transferPrice } from '../lib/market'
import { RARITY_STYLES, trainCost } from '../lib/rarity'
import { initialState } from '../lib/storage'
import type { Card, GameState, MatchResult } from '../lib/types'

const start = (): GameState => ({ ...initialState(), daily: freshDaily(todayKey()) })

const card = (uid: string, playerId: string, level = 1): Card => ({
  uid,
  playerId,
  level,
  limit: level + 1,
  condition: 100,
  injuredFor: 0,
  exp: 0,
})

const lineupOf = (state: GameState) => ({ squad: state.squad, subs: [] })

const matchResult = (
  scoreFor: number,
  scoreAgainst: number,
  scorerUids: string[] = [],
): MatchResult => ({
  opponent: '상대',
  scorerUids,
  opponentRating: 55,
  scoreFor,
  scoreAgainst,
  result: scoreFor > scoreAgainst ? 'W' : scoreFor === scoreAgainst ? 'D' : 'L',
  events: [],
  reward: 500,
  possession: 55,
  shotsFor: 10,
  shotsAgainst: 6,
})

describe('drawing', () => {
  it('charges gold, stores the cards and moves the daily mission', () => {
    const state = start()
    const drawn = [card('a', 'n01'), card('b', 'r01')]
    const next = reducer(state, { type: 'addCards', cards: drawn, cost: 600 })

    expect(next.gold).toBe(state.gold - 600)
    expect(next.cards).toHaveLength(state.cards.length + 2)
    expect(next.collected).toContain('r01')
    expect(next.daily.progress.draw).toBe(2)
    expect(next.daily.freeDrawUsed).toBe(false)
  })

  it('marks the free pull as used', () => {
    const next = reducer(start(), { type: 'addCards', cards: [card('a', 'n01')], cost: 0, free: true })
    expect(next.daily.freeDrawUsed).toBe(true)
    expect(next.gold).toBe(start().gold)
  })

  it('resets yesterday\'s mission board before counting', () => {
    const stale = {
      ...start(),
      daily: { date: '1999-01-01', progress: { draw: 9, win: 2, train: 5 }, claimed: ['draw' as const], freeDrawUsed: true },
    }
    const next = reducer(stale, { type: 'addCards', cards: [card('a', 'n01')], cost: 300 })
    expect(next.daily.date).toBe(todayKey())
    expect(next.daily.progress.draw).toBe(1)
    expect(next.daily.claimed).toHaveLength(0)
    expect(next.daily.freeDrawUsed).toBe(false)
  })
})

describe('training', () => {
  it('turns material cards into experience and levels the card up', () => {
    const base = start()
    const target = base.cards[0]
    const materials = [card('m1', 'n03'), card('m2', 'n04')]
    const state = { ...base, cards: [...base.cards, ...materials], gold: 99999 }

    const exp = materials.reduce((sum, item) => sum + materialExp(item), 0)
    const fee = trainingFee(target) * materials.length
    const expected = addExperience(target, exp)

    const next = reducer(state, {
      type: 'trainCard',
      uid: target.uid,
      materialUids: ['m1', 'm2'],
    })

    expect(next.gold).toBe(state.gold - fee)
    // Materials are consumed.
    expect(next.cards.some((item) => item.uid === 'm1' || item.uid === 'm2')).toBe(false)
    const trained = next.cards.find((item) => item.uid === target.uid)!
    expect(trained.level).toBe(expected.card.level)
    expect(trained.exp).toBe(expected.card.exp)
    expect(next.daily.progress.train).toBe(1)
  })

  it('stops levelling at the card limit', () => {
    const base = start()
    const target = { ...base.cards[0], limit: base.cards[0].level }
    const state = {
      ...base,
      gold: 99999,
      cards: [target, ...base.cards.slice(1), card('m1', 'w01')],
    }

    const next = reducer(state, { type: 'trainCard', uid: target.uid, materialUids: ['m1'] })
    const trained = next.cards.find((item) => item.uid === target.uid)!
    expect(trained.level).toBe(target.level)
    expect(trained.exp).toBeLessThan(expForLevel(target.level))
  })

  it('refuses a training session with no materials or not enough gold', () => {
    const base = start()
    const target = base.cards[0]
    const state = { ...base, cards: [...base.cards, card('m1', 'n03')] }

    expect(reducer(state, { type: 'trainCard', uid: target.uid, materialUids: [] })).toBe(state)
    expect(
      reducer({ ...state, gold: 0 }, { type: 'trainCard', uid: target.uid, materialUids: ['m1'] })
        .cards.length,
    ).toBe(state.cards.length)
    // A card cannot eat itself.
    expect(
      reducer(state, { type: 'trainCard', uid: target.uid, materialUids: [target.uid] }),
    ).toBe(state)
  })
})

describe('limit break', () => {
  it('raises the ceiling using a copy of the same player', () => {
    const base = start()
    const target = base.cards[0]
    const copy = card('dup', target.playerId)
    const state = { ...base, cards: [...base.cards, copy] }

    const next = reducer(state, { type: 'limitBreak', uid: target.uid, materialUid: 'dup' })
    const raised = next.cards.find((item) => item.uid === target.uid)!

    expect(raised.limit).toBe(target.limit + 1)
    expect(next.cards.some((item) => item.uid === 'dup')).toBe(false)
  })

  it('refuses a different player as material', () => {
    const base = start()
    const target = base.cards[0]
    const other = card('other', 'n22')
    const state = { ...base, cards: [...base.cards, other] }

    expect(reducer(state, { type: 'limitBreak', uid: target.uid, materialUid: 'other' })).toBe(
      state,
    )
  })

  it('never goes past the rarity cap', () => {
    const base = start()
    const player = getPlayer(base.cards[0].playerId)!
    const capped = { ...base.cards[0], limit: levelCap(player) }
    const copy = card('dup', capped.playerId)
    const state = { ...base, cards: [capped, ...base.cards.slice(1), copy] }

    expect(reducer(state, { type: 'limitBreak', uid: capped.uid, materialUid: 'dup' })).toBe(state)
  })
})

describe('selling', () => {
  it('pays out and empties the slot the player was in', () => {
    const state = start()
    const starter = state.squad.slots.gk!
    const sold = state.cards.find((item) => item.uid === starter)!
    const style = RARITY_STYLES[getPlayer(sold.playerId)!.rarity]
    const price = style.sell + (sold.level - 1) * Math.round(style.sell * 0.3)

    const next = reducer(state, { type: 'sell', uids: [starter] })
    expect(next.gold).toBe(state.gold + price)
    expect(next.squad.slots.gk).toBeNull()
    expect(next.cards.find((item) => item.uid === starter)).toBeUndefined()
  })

  it('never sells a card that is not asked for', () => {
    const state = start()
    const keep = state.cards[1].uid
    const next = reducer(state, { type: 'sell', uids: [state.cards[0].uid] })
    expect(next.cards.some((item) => item.uid === keep)).toBe(true)
  })
})

describe('shards and pull records', () => {
  it('records what came out of a pull and moves the pity counter', () => {
    const state = start()
    const next = reducer(state, {
      type: 'addCards',
      cards: [card('a', 'n01'), card('b', 'lg01')],
      cost: 600,
      pity: 0,
    })

    expect(next.pulls.total).toBe(2)
    expect(next.pulls.byRarity.Normal).toBe(1)
    expect(next.pulls.byRarity.Legend).toBe(1)
    expect(next.pity).toBe(0)

    const later = reducer(next, { type: 'addCards', cards: [card('c', 'n02')], cost: 300, pity: 7 })
    expect(later.pity).toBe(7)
    expect(later.pulls.total).toBe(3)
  })

  it('pays shards when a card is released', async () => {
    const { shardsFor } = await import('../lib/shards')
    const state = start()
    const target = state.cards[0]
    const next = reducer(state, { type: 'sell', uids: [target.uid] })

    expect(next.shards).toBe(state.shards + shardsFor(target))
    expect(next.gold).toBeGreaterThan(state.gold)
  })

  it('exchanges shards for a card of the promised rarity', async () => {
    const { SHARD_OFFERS } = await import('../lib/shards')
    const { PLAYERS_BY_RARITY: pool } = await import('../lib/players')
    const offer = SHARD_OFFERS[1]
    const reward = pool[offer.rarity][0]
    const rich = { ...start(), shards: offer.cost }

    const next = reducer(rich, { type: 'exchangeShards', offer, player: reward })
    expect(next.shards).toBe(0)
    expect(next.cards.some((item) => item.playerId === reward.id)).toBe(true)
    expect(next.collected).toContain(reward.id)

    // Not enough shards left for a second go.
    expect(reducer(next, { type: 'exchangeShards', offer, player: reward })).toBe(next)
  })
})

describe('fusion', () => {
  const spares = (rarity: 'Normal' | 'Rare') =>
    PLAYERS_BY_RARITY[rarity].slice(0, FUSION_SIZE).map((player, index) => card(`f${index}`, player.id))

  it('upgrades three cards of the same rarity', () => {
    const state = start()
    const withSpares = { ...state, cards: [...state.cards, ...spares('Normal')] }
    const uids = ['f0', 'f1', 'f2']
    const check = checkFusion(withSpares.cards, uids, withSpares.squad, withSpares.gold)
    expect(check.ok).toBe(true)
    expect(check.to).toBe('Rare')

    const reward = PLAYERS_BY_RARITY.Rare[0]
    const next = reducer(withSpares, { type: 'fuse', uids, player: reward })
    expect(next.gold).toBe(withSpares.gold - FUSION_FEE)
    expect(next.cards).toHaveLength(withSpares.cards.length - FUSION_SIZE + 1)
    expect(next.cards.some((item) => item.playerId === reward.id)).toBe(true)
    expect(next.collected).toContain(reward.id)
  })

  it('rejects mixed rarities, starters and empty wallets', () => {
    const state = start()
    const mixed = { ...state, cards: [...state.cards, ...spares('Normal'), card('r0', PLAYERS_BY_RARITY.Rare[0].id)] }
    expect(checkFusion(mixed.cards, ['f0', 'f1', 'r0'], mixed.squad, mixed.gold).ok).toBe(false)
    expect(checkFusion(mixed.cards, ['f0', 'f1'], mixed.squad, mixed.gold).ok).toBe(false)
    expect(checkFusion(mixed.cards, ['f0', 'f1', 'f2'], mixed.squad, 0).ok).toBe(false)

    const starter = state.squad.slots.gk!
    expect(checkFusion(mixed.cards, ['f0', 'f1', starter], mixed.squad, mixed.gold).ok).toBe(false)
  })

  it('has no rarity above World', () => {
    expect(nextRarity('Live')).toBe('World')
    expect(nextRarity('World')).toBeNull()
  })
})

describe('playing a season', () => {
  it('records the result on both sides of the table', () => {
    const state = start()
    const fixture = myFixture(state.season)!
    const next = reducer(state, {
      type: 'match',
      result: matchResult(2, 1),
      fixture,
      others: [],
      lineup: lineupOf(state),
    })

    expect(next.gold).toBe(state.gold + 500)
    expect(next.record.w).toBe(1)
    expect(next.gf).toBe(2)
    expect(next.ga).toBe(1)
    expect(next.season.round).toBe(1)
    expect(next.season.table[MY_TEAM_ID].points).toBe(3)
    const opponentId = fixture.home === MY_TEAM_ID ? fixture.away : fixture.home
    expect(next.season.table[opponentId].played).toBe(1)
    expect(next.daily.progress.win).toBe(1)
    expect(next.history).toHaveLength(1)
    expect(next.history[0].competition).toBe('league')
  })

  it('keeps the score the right way round when away', () => {
    const state = start()
    const away = state.season.fixtures.find((fixture) => fixture.away === MY_TEAM_ID)!
    const next = reducer(
      { ...state, season: { ...state.season, round: away.round } },
      {
        type: 'match',
        result: matchResult(3, 0),
        fixture: away,
        others: [],
        lineup: lineupOf(state),
      },
    )
    expect(next.season.table[MY_TEAM_ID]).toMatchObject({ gf: 3, ga: 0, w: 1 })
    expect(next.season.table[away.home]).toMatchObject({ gf: 0, ga: 3, l: 1 })
  })

  it('finishes the season after the last round and starts the next one', () => {
    let state = start()
    for (let round = 0; round < ROUNDS_PER_SEASON; round++) {
      const fixture = myFixture(state.season)!
      state = reducer(state, {
        type: 'match',
        result: matchResult(2, 0),
        fixture,
        others: [],
        lineup: lineupOf(state),
      })
    }
    expect(state.season.finished).toBe(true)
    expect(state.season.table[MY_TEAM_ID].played).toBe(ROUNDS_PER_SEASON)

    const goldBefore = state.gold
    const nextSeason = reducer(state, { type: 'newSeason' })
    expect(nextSeason.gold).toBeGreaterThan(goldBefore)
    expect(nextSeason.season.index).toBe(2)
    expect(nextSeason.season.round).toBe(0)
    expect(nextSeason.season.finished).toBe(false)
    expect(nextSeason.season.division).toBe(4)
    expect(nextSeason.season.table[MY_TEAM_ID].played).toBe(0)
    // Cards and gold carry over between seasons.
    expect(nextSeason.cards).toHaveLength(state.cards.length)
  })

  it('ignores a new season request mid-season', () => {
    const state = start()
    expect(reducer(state, { type: 'newSeason' })).toBe(state)
  })
})

describe('growth after a match', () => {
  it('marks the starters and banks their experience', () => {
    const state = start()
    const fixture = myFixture(state.season)!
    const scorer = state.squad.slots.f2!
    const next = reducer(state, {
      type: 'match',
      result: matchResult(2, 0, [scorer, scorer]),
      fixture,
      others: [],
      lineup: lineupOf(state),
    })

    expect(next.lastRatings).toHaveLength(11)
    const striker = next.lastRatings.find((rating) => rating.uid === scorer)!
    expect(striker.goals).toBe(2)
    expect(striker.rating).toBeGreaterThan(7)
    // Everyone who played banked something.
    expect(next.lastRatings.every((rating) => rating.exp > 0)).toBe(true)
    const before = state.cards.find((card) => card.uid === scorer)!
    const after = next.cards.find((card) => card.uid === scorer)!
    expect(after.exp + (after.level - before.level) * 100).toBeGreaterThan(0)
  })

  it('does not mark a player who is injured', () => {
    const state = start()
    const benched = state.squad.slots.gk!
    const withInjury = {
      ...state,
      cards: state.cards.map((card) =>
        card.uid === benched ? { ...card, injuredFor: 2 } : card,
      ),
    }
    const next = reducer(withInjury, {
      type: 'match',
      result: matchResult(1, 0),
      fixture: myFixture(state.season)!,
      others: [],
      lineup: lineupOf(state),
    })
    expect(next.lastRatings).toHaveLength(10)
    expect(next.lastRatings.some((rating) => rating.uid === benched)).toBe(false)
  })

})

describe('fitness after a match', () => {
  it('tires the starters and rests the bench', () => {
    const state = start()
    const fixture = myFixture(state.season)!
    const starter = state.squad.slots.gk!
    const benched = state.cards.find(
      (card) => !Object.values(state.squad.slots).includes(card.uid),
    )!
    const rested = { ...state, cards: state.cards.map((card) => ({ ...card, condition: 70 })) }

    const next = reducer(rested, {
      type: 'match',
      result: matchResult(1, 0),
      fixture,
      others: [],
      lineup: lineupOf(rested),
    })
    expect(next.cards.find((card) => card.uid === starter)!.condition).toBeLessThan(70)
    expect(next.cards.find((card) => card.uid === benched.uid)!.condition).toBeGreaterThan(70)
  })

  it('treats an injury and restores condition for gold', () => {
    const state = start()
    const uid = state.cards[0].uid
    const hurt = {
      ...state,
      cards: state.cards.map((card) =>
        card.uid === uid ? { ...card, injuredFor: 2, condition: 40 } : card,
      ),
    }
    const injuredCard = hurt.cards.find((card) => card.uid === uid)!

    const treated = reducer(hurt, { type: 'treat', uid })
    expect(treated.gold).toBe(hurt.gold - treatmentCost(injuredCard))
    expect(treated.cards.find((card) => card.uid === uid)!.injuredFor).toBe(0)

    const recovered = reducer(treated, { type: 'recover', uid })
    expect(recovered.gold).toBe(treated.gold - recoveryCost(injuredCard))
    expect(recovered.cards.find((card) => card.uid === uid)!.condition).toBe(MAX_CONDITION)
  })

  it('refuses treatment nobody needs or can afford', () => {
    const state = start()
    expect(reducer(state, { type: 'treat', uid: state.cards[0].uid })).toBe(state)
    expect(reducer(state, { type: 'recover', uid: state.cards[0].uid })).toBe(state)

    const broke = {
      ...state,
      gold: 0,
      cards: state.cards.map((card, index) =>
        index === 0 ? { ...card, injuredFor: 3 } : card,
      ),
    }
    expect(reducer(broke, { type: 'treat', uid: broke.cards[0].uid })).toBe(broke)
  })
})

describe('the cup', () => {
  it('advances, pays out and logs the tie', () => {
    const state = start()
    const next = reducer(state, { type: 'cupMatch', result: matchResult(2, 0), myRating: 80, lineup: lineupOf(state) })

    expect(next.cup.round).toBe(1)
    expect(next.cup.eliminated).toBe(false)
    expect(next.gold).toBeGreaterThan(state.gold)
    expect(next.record.w).toBe(1)
    expect(next.history[0].competition).toBe('cup')
    expect(myTie(next.cup)).not.toBeNull()
  })

  it('ends the run on a defeat and keeps a champion', () => {
    const state = start()
    const next = reducer(state, { type: 'cupMatch', result: matchResult(0, 3), myRating: 80, lineup: lineupOf(state) })

    expect(next.cup.eliminated).toBe(true)
    expect(next.cup.champion).toBeTruthy()
    expect(next.trophies.cup).toBe(0)
    // A knocked out club cannot keep playing cup ties.
    expect(reducer(next, { type: 'cupMatch', result: matchResult(1, 0), myRating: 80, lineup: lineupOf(state) })).toBe(next)
  })

  it('counts a trophy when the final is won', async () => {
    const { CUP_ROUNDS } = await import('../lib/cup')
    let state = start()
    for (let round = 0; round < CUP_ROUNDS; round++) {
      state = reducer(state, { type: 'cupMatch', result: matchResult(3, 0), myRating: 95, lineup: lineupOf(state) })
    }
    expect(state.cup.champion).toBe(MY_TEAM_ID)
    expect(state.trophies.cup).toBe(1)
  })

  it('starts a fresh cup with the new season', () => {
    let state = start()
    state = reducer(state, { type: 'cupMatch', result: matchResult(0, 1), myRating: 80, lineup: lineupOf(state) })
    for (let round = 0; round < ROUNDS_PER_SEASON; round++) {
      const fixture = myFixture(state.season)!
      state = reducer(state, {
        type: 'match',
        result: matchResult(2, 0),
        fixture,
        others: [],
        lineup: lineupOf(state),
      })
    }
    const next = reducer(state, { type: 'newSeason' })

    expect(next.cup.eliminated).toBe(false)
    expect(next.cup.round).toBe(0)
    expect(next.cup.index).toBe(next.season.index)
    expect(next.trophies.promotions).toBe(1)
    // Squads come back fresh.
    expect(next.cards.every((card) => card.condition === MAX_CONDITION)).toBe(true)
    expect(next.cards.every((card) => card.injuredFor === 0)).toBe(true)
  })
})

describe('transfer market', () => {
  it('rolls the daily list once per day', () => {
    const state = start()
    const first = reducer(state, { type: 'ensureMarket', date: '2026-05-05' })
    expect(first.market.listings.length).toBeGreaterThan(0)
    expect(reducer(first, { type: 'ensureMarket', date: '2026-05-05' })).toBe(first)
    expect(
      reducer(first, { type: 'ensureMarket', date: '2026-05-06' }).market.listings,
    ).not.toEqual(first.market.listings)
  })

  it('buys a listing and removes it from the shelf', () => {
    const state = reducer({ ...start(), gold: 99999 }, { type: 'ensureMarket', date: '2026-05-05' })
    const listing = state.market.listings[0]
    const next = reducer(state, { type: 'buy', listing })

    expect(next.gold).toBe(state.gold - listing.price)
    expect(next.cards.some((card) => card.playerId === listing.playerId)).toBe(true)
    expect(next.market.listings.some((item) => item.id === listing.id)).toBe(false)
    expect(next.collected).toContain(listing.playerId)
    // The same listing cannot be bought twice.
    expect(reducer(next, { type: 'buy', listing })).toBe(next)
  })

  it('refuses a signing the club cannot afford', () => {
    const state = reducer({ ...start(), gold: 0 }, { type: 'ensureMarket', date: '2026-05-05' })
    expect(reducer(state, { type: 'buy', listing: state.market.listings[0] })).toBe(state)
  })

  it('charges for a manual refresh', () => {
    const state = reducer(start(), { type: 'ensureMarket', date: '2026-05-05' })
    const listings = rollListings(state.season.division)
    const next = reducer(state, { type: 'refreshMarket', listings, cost: 300 })

    expect(next.gold).toBe(state.gold - 300)
    expect(next.market.listings).toEqual(listings)
    expect(reducer({ ...state, gold: 10 }, { type: 'refreshMarket', listings, cost: 300 }).gold).toBe(10)
  })

  it('prices a listing from the player it sells', () => {
    const state = reducer(start(), { type: 'ensureMarket', date: '2026-05-05' })
    for (const listing of state.market.listings) {
      expect(listing.price).toBe(transferPrice(getPlayer(listing.playerId)!))
    }
  })
})

describe('missions', () => {
  it('pays a completed mission exactly once', () => {
    const mission = DAILY_MISSIONS[0]
    const state = {
      ...start(),
      daily: { ...freshDaily(todayKey()), progress: { draw: mission.target, win: 0, train: 0 } },
    }
    expect(missionClaimable(state.daily, mission)).toBe(true)

    const claimed = reducer(state, { type: 'claimMission', id: mission.id })
    expect(claimed.gold).toBe(state.gold + mission.reward)

    const again = reducer(claimed, { type: 'claimMission', id: mission.id })
    expect(again.gold).toBe(claimed.gold)
  })

  it('does not pay an unfinished mission', () => {
    const state = start()
    expect(reducer(state, { type: 'claimMission', id: 'win' }).gold).toBe(state.gold)
  })

  it('rolls the board over on a new day', () => {
    const yesterday = { ...freshDaily('2020-01-01'), progress: { draw: 5, win: 1, train: 1 } }
    expect(rollOver(yesterday, '2020-01-02').progress.draw).toBe(0)
    expect(rollOver(yesterday, '2020-01-01')).toBe(yesterday)
  })
})

describe('club', () => {
  it('renames the club in the league table too', () => {
    const next = reducer(start(), { type: 'renameClub', club: '한강 로버스' })
    expect(next.club).toBe('한강 로버스')
    expect(next.season.teams.find((team) => team.id === MY_TEAM_ID)!.name).toBe('한강 로버스')
  })

  it('ignores an empty name', () => {
    const state = start()
    expect(reducer(state, { type: 'renameClub', club: '   ' }).club).toBe(state.club)
  })

  it('swaps two players when assigning someone already on the pitch', () => {
    const state = start()
    const gk = state.squad.slots.gk!
    const striker = state.squad.slots.f2!
    const next = reducer(state, { type: 'assign', slotId: 'f2', uid: gk })
    expect(next.squad.slots.f2).toBe(gk)
    expect(next.squad.slots.gk).toBe(striker)
  })

  it('keeps players when the formation still has the slot', () => {
    const state = start()
    const next = reducer(state, { type: 'setFormation', formation: '4-4-2' })
    expect(next.squad.formation).toBe('4-4-2')
    expect(next.squad.slots.gk).toBe(state.squad.slots.gk)
    expect(Object.keys(next.squad.slots)).not.toContain('f3')
  })
})

describe('save shape', () => {
  it('starts with a full eleven and unique card ids', () => {
    const state = initialState()
    const uids = state.cards.map((item) => item.uid)
    expect(new Set(uids).size).toBe(uids.length)
    expect(Object.values(state.squad.slots).filter(Boolean)).toHaveLength(11)
    expect(createSeason(5, 1, state.club).teams[0].id).toBe(MY_TEAM_ID)
  })
})

describe('bulk release', () => {
  it('pays out gold and shards for every card at once', async () => {
    const { releaseValue } = await import('../lib/shards')
    const state = { ...start(), cards: [...start().cards, card('x1', 'n03'), card('x2', 'r01')] }
    const uids = ['x1', 'x2']
    const expected = releaseValue(state.cards.filter((item) => uids.includes(item.uid)))

    const next = reducer(state, { type: 'sell', uids })

    expect(next.gold).toBe(state.gold + expected.gold)
    expect(next.shards).toBe(state.shards + expected.shards)
    expect(next.cards).toHaveLength(state.cards.length - 2)
    expect(next.cards.some((item) => uids.includes(item.uid))).toBe(false)
  })

  it('empties the slot and the bench place of anyone released', () => {
    const state = start()
    const starter = state.squad.slots.gk!
    const benched = state.squad.bench.find(Boolean)!

    const next = reducer(state, { type: 'sell', uids: [starter, benched] })
    expect(next.squad.slots.gk).toBeNull()
    expect(next.squad.bench).not.toContain(benched)
  })

  it('prices a trained card above a fresh one', async () => {
    const { sellPrice } = await import('../lib/shards')
    const fresh = card('a', 'lg01', 4)
    const trained = card('b', 'lg01', 8)
    expect(sellPrice(trained)).toBeGreaterThan(sellPrice(fresh))
  })
})
