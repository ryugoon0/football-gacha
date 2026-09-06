import { describe, expect, it } from 'vitest'
import { FORMATIONS } from '../lib/formations'
import { PLAYERS, PLAYERS_BY_RARITY, getPlayer } from '../lib/players'
import { autoFill, evaluateSquad, missingSlots, positionFit, ratingInSlot } from '../lib/squad'
import { initialState } from '../lib/storage'
import type { Card } from '../lib/types'

describe('position fit', () => {
  it('rates a player highest in their own position', () => {
    const player = PLAYERS_BY_RARITY.Legend.find((item) => item.position === 'ST')!
    expect(positionFit(player, 'ST')).toBe('main')
    expect(ratingInSlot(player, 5, 'ST')).toBeGreaterThan(ratingInSlot(player, 5, 'GK'))
  })

  it('collapses the rating outside the listed positions', () => {
    const player = PLAYERS_BY_RARITY.Legend[0]
    const impossible = (['GK', 'CB', 'ST'] as const).find(
      (position) => !player.positions.includes(position),
    )!
    expect(positionFit(player, impossible)).toBe('out')
    expect(ratingInSlot(player, 5, impossible)).toBeLessThan(
      ratingInSlot(player, 5, player.position) * 0.7,
    )
  })

  it('only lightly penalises a listed alternative position', () => {
    const player = PLAYERS.find((item) => item.positions.length > 1)!
    const alt = player.positions[1]
    expect(positionFit(player, alt)).toBe('sub')
    expect(ratingInSlot(player, 4, alt)).toBeGreaterThan(ratingInSlot(player, 4, player.position) * 0.9)
  })
})

describe('squad rating', () => {
  it('rates the starter squad and counts eleven players', () => {
    const state = initialState()
    const rating = evaluateSquad(state.cards, state.squad)
    expect(rating.filled).toBe(11)
    expect(rating.overall).toBeGreaterThan(40)
    expect(rating.chemistry).toBeGreaterThan(80)
  })

  it('drops when a slot is empty', () => {
    const state = initialState()
    const full = evaluateSquad(state.cards, state.squad)
    const gutted = {
      ...state.squad,
      slots: { ...state.squad.slots, f2: null, m1: null },
    }
    expect(evaluateSquad(state.cards, gutted).overall).toBeLessThan(full.overall)
  })
})

describe('fitness', () => {
  it('rates a tired player below a fresh one', () => {
    const state = initialState()
    const fresh = evaluateSquad(state.cards, state.squad)
    const tired = evaluateSquad(
      state.cards.map((card) => ({ ...card, condition: 30 })),
      state.squad,
    )
    expect(tired.overall).toBeLessThan(fresh.overall)
  })

  it('treats an injured player as unavailable', () => {
    const state = initialState()
    const gk = state.squad.slots.gk!
    const injured = state.cards.map((card) =>
      card.uid === gk ? { ...card, injuredFor: 2 } : card,
    )
    const rating = evaluateSquad(injured, state.squad)

    expect(rating.filled).toBe(10)
    expect(rating.evaluations.find((item) => item.slotId === 'gk')!.injured).toBe(true)
    expect(rating.def).toBeLessThan(evaluateSquad(state.cards, state.squad).def)
  })

  it('leaves injured players out of the auto line-up', () => {
    const state = initialState()
    const cards = state.cards.map((card, index) => (index < 3 ? { ...card, injuredFor: 1 } : card))
    const squad = autoFill(cards, state.squad)
    const picked = Object.values(squad.slots).filter(Boolean) as string[]
    for (const card of cards.filter((item) => item.injuredFor > 0)) {
      expect(picked).not.toContain(card.uid)
    }
  })
})

describe('auto fill', () => {
  it('starts the preferred club first when asked, but never out of position', () => {
    const state = initialState()
    const clubs = new Map<string, number>()
    for (const card of state.cards) {
      const club = getPlayer(card.playerId)!.club
      clubs.set(club, (clubs.get(club) ?? 0) + 1)
    }
    const club = [...clubs.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const plain = autoFill(state.cards, state.squad)
    const preferred = autoFill(state.cards, state.squad, undefined, { club })
    const clubCount = (squad: typeof plain) =>
      [...Object.values(squad.slots), ...squad.bench].filter((uid): uid is string => Boolean(uid))
        .filter((uid) => getPlayer(state.cards.find((c) => c.uid === uid)!.playerId)!.club === club).length
    expect(clubCount(preferred)).toBeGreaterThanOrEqual(clubCount(plain))
    // A proper fit from elsewhere still beats an out-of-position club player.
    const formation = FORMATIONS[preferred.formation]
    for (const slot of formation.slots) {
      const uid = preferred.slots[slot.id]
      if (!uid) continue
      const player = getPlayer(state.cards.find((c) => c.uid === uid)!.playerId)!
      if (positionFit(player, slot.position) === 'out') {
        const fits = state.cards.some((c) => positionFit(getPlayer(c.playerId)!, slot.position) !== 'out' && !Object.values(preferred.slots).includes(c.uid))
        expect(fits).toBe(false)
      }
    }
  })

  it('fills the bench with the starters’ club before anyone stronger from elsewhere', () => {
    const state = initialState()
    const starters = autoFill(state.cards, state.squad)
    const startingClubs = new Map<string, number>()
    for (const uid of Object.values(starters.slots)) {
      const card = state.cards.find((c) => c.uid === uid)!
      const club = PLAYERS.find((p) => p.id === card.playerId)!.club
      startingClubs.set(club, (startingClubs.get(club) ?? 0) + 1)
    }
    const mainClub = [...startingClubs.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const mate = PLAYERS.find((p) => p.club === mainClub && !state.cards.some((c) => c.playerId === p.id))
    const stranger = PLAYERS.find((p) => p.club !== mainClub && !state.cards.some((c) => c.playerId === p.id))!
    if (!mate) return
    const cards: Card[] = [
      ...state.cards,
      { uid: 'mate', playerId: mate.id, level: 1, limit: 3, condition: 100, injuredFor: 0, exp: 0 },
      { uid: 'stranger', playerId: stranger.id, level: 5, limit: 6, condition: 100, injuredFor: 0, exp: 0 },
    ]
    const squad = autoFill(cards, state.squad)
    const onPitch = Object.values(squad.slots)
    // If neither made the eleven, the club mate must be on the bench even
    // though the stranger is four levels higher.
    if (!onPitch.includes('mate') && !onPitch.includes('stranger')) {
      expect(squad.bench).toContain('mate')
    }
  })

  it('fills every slot with a different card and prefers stronger players', () => {
    const state = initialState()
    const world = (PLAYERS_BY_RARITY.World[0] ?? PLAYERS_BY_RARITY.Live[0])!
    const cards: Card[] = [
      ...state.cards,
      { uid: 'star', playerId: world.id, level: 5, limit: 6, condition: 100, injuredFor: 0, exp: 0 },
    ]
    const squad = autoFill(cards, state.squad)

    const used = Object.values(squad.slots).filter(Boolean) as string[]
    expect(used).toHaveLength(FORMATIONS[state.squad.formation].slots.length)
    expect(new Set(used).size).toBe(used.length)
    expect(used).toContain('star')
    // A star from another club can cost a team-colour tier, so the fair bar is
    // "no worse than auto-filling without the star", not strictly better.
    expect(evaluateSquad(cards, squad).overall).toBeGreaterThanOrEqual(
      evaluateSquad(state.cards, autoFill(state.cards, state.squad)).overall,
    )
  })

  it('never benches a second copy of a player already starting', () => {
    const state = initialState()
    const striker = PLAYERS.find((p) => p.position === 'ST')!
    // Five copies of the same player: only one can start, and none of the
    // other four should end up on the bench either.
    const copies: Card[] = Array.from({ length: 5 }, (_, i) => ({
      uid: `dup-${i}`,
      playerId: striker.id,
      level: 5,
      limit: 10,
      condition: 90,
      injuredFor: 0,
      exp: 0,
    }))
    const cards = [...state.cards, ...copies]
    const squad = autoFill(cards, state.squad)

    const everywhere = [...Object.values(squad.slots), ...squad.bench].filter(Boolean) as string[]
    const playerIds = everywhere.map((uid) => cards.find((c) => c.uid === uid)!.playerId)
    expect(playerIds.filter((id) => id === striker.id)).toHaveLength(1)
  })

  it('never benches two copies of the same player who never starts', () => {
    const state = initialState()
    // A player nobody already owns, who never wins a starting slot against
    // the default squad — every copy of them only ever competes for the bench.
    const bystander = PLAYERS.find(
      (p) => p.position === 'CB' && !state.cards.some((c) => c.playerId === p.id),
    )!
    const copies: Card[] = Array.from({ length: 3 }, (_, i) => ({
      uid: `bench-dup-${i}`,
      playerId: bystander.id,
      level: 3,
      limit: 10,
      condition: 80,
      injuredFor: 0,
      exp: 0,
    }))
    const cards = [...state.cards, ...copies]
    const squad = autoFill(cards, state.squad)

    const benchPlayerIds = (squad.bench.filter(Boolean) as string[]).map(
      (uid) => cards.find((c) => c.uid === uid)!.playerId,
    )
    expect(benchPlayerIds.filter((id) => id === bystander.id).length).toBeLessThanOrEqual(1)
  })
})

describe('one person, many cards', () => {
  it('shares a person key between a squad card and a 월드 season card of the same footballer', async () => {
    const { PLAYERS: all } = await import('../lib/players')
    const world = all.find((p) => p.id === 'w06')! // 2018-19 PSG season card
    const twins = all.filter((p) => p.person === world.person && p.id !== world.id)
    expect(twins.length).toBeGreaterThan(0)
    expect(twins.some((p) => p.fromSquad)).toBe(true)
    // Two Ronaldo season cards (Real 2013-14, United 2007-08) are one person too.
    const ronaldoReal = all.find((p) => p.id === 'w05')!
    const ronaldoUnited = all.find((p) => p.season === '2007-08' && p.club === '맨체스 레즈' && p.rarity === 'World')!
    expect(ronaldoUnited.person).toBe(ronaldoReal.person)
  })

  it('never fields the same person twice — assigning the other card drops the first, auto-fill skips it, the gap check flags it', async () => {
    const { PLAYERS: all } = await import('../lib/players')
    const { reducer } = await import('../lib/gameReducer')
    const world = all.find((p) => p.id === 'w06')!
    const squadTwin = all.find((p) => p.person === world.person && p.fromSquad)!
    const state = initialState()
    const a: Card = { uid: 'twin-a', playerId: world.id, level: 1, limit: 2, condition: 100, injuredFor: 0, exp: 0 }
    const b: Card = { uid: 'twin-b', playerId: squadTwin.id, level: 1, limit: 2, condition: 100, injuredFor: 0, exp: 0 }
    const withBoth = { ...state, cards: [...state.cards, a, b] }
    const slotIds = Object.keys(withBoth.squad.slots)
    const first = reducer(withBoth, { type: 'assign', slotId: slotIds[9], uid: 'twin-a' })
    const second = reducer(first, { type: 'assign', slotId: slotIds[10], uid: 'twin-b' })
    expect(Object.values(second.squad.slots)).toContain('twin-b')
    expect(Object.values(second.squad.slots)).not.toContain('twin-a')
    expect(second.squad.bench).not.toContain('twin-a')

    const forced = { ...withBoth, squad: { ...withBoth.squad, slots: { ...withBoth.squad.slots, [slotIds[9]]: 'twin-a', [slotIds[10]]: 'twin-b' } } }
    expect(missingSlots(evaluateSquad(forced.cards, forced.squad).evaluations).duplicated.length).toBeGreaterThan(0)

    const auto = autoFill(withBoth.cards, withBoth.squad)
    const persons = [...Object.values(auto.slots), ...auto.bench].filter(Boolean).map((uid) => getPlayer(withBoth.cards.find((c) => c.uid === uid)!.playerId)!.person)
    expect(new Set(persons).size).toBe(persons.length)
  })
})
