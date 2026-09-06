import { describe, expect, it } from 'vitest'
import { CLUB_REQUIRED, albumProgress, albumReward, albumSetPayload, buildAlbumSets, isAlbumClubCard, ownedPlayerIds } from '../lib/album'
import { KNOBS } from '../lib/tuning'
import { PLAYERS } from '../lib/players'
import type { Card } from '../lib/types'

const sets = buildAlbumSets()
const clubs = sets.filter((set) => set.kind === 'club')
const leagues = sets.filter((set) => set.kind === 'league')

const cardOf = (playerId: string, uid = playerId): Card =>
  ({ uid, playerId, level: 1, limit: 2, exp: 0, condition: 100, injuredFor: 0 }) as unknown as Card

describe('앨범 묶음', () => {
  it('builds one club set per released real squad, judged at eleven players', () => {
    expect(clubs.length).toBeGreaterThan(100)
    for (const set of clubs) {
      expect(set.playerIds.length).toBeGreaterThan(0)
      expect(set.required).toBe(Math.min(CLUB_REQUIRED, set.playerIds.length))
      for (const id of set.playerIds) {
        const player = PLAYERS.find((p) => p.id === id)!
        expect(player.club).toBe(set.title)
        expect(isAlbumClubCard(player)).toBe(true)
      }
    }
    // Unreleased pilots, limited and world cards never count towards a club.
    expect(PLAYERS.filter((p) => p.unreleased || p.limited || p.rarity === 'World').some((p) => clubs.some((set) => set.playerIds.includes(p.id)))).toBe(false)
  })

  it('groups clubs into league sets that complete only when every club does', () => {
    const league = leagues[0]
    expect(league.childIds.length).toBe(league.required)
    const children = league.childIds.map((id) => sets.find((set) => set.id === id)!)
    // Own eleven of every club but one.
    const cards = children.slice(1).flatMap((child) => child.playerIds.slice(0, CLUB_REQUIRED).map((id) => cardOf(id)))
    // A sold card stays registered: the collection log counts alongside the cards in hand.
    expect(ownedPlayerIds([], ['x1', 'x2']).has('x1')).toBe(true)
    expect(ownedPlayerIds([cardOf('y1')], ['x1']).size).toBe(2)
    const owned = ownedPlayerIds(cards)
    const partial = albumProgress(league, owned, sets)
    expect(partial.have).toBe(children.length - 1)
    expect(partial.complete).toBe(false)
    const full = ownedPlayerIds([...cards, ...children[0].playerIds.slice(0, CLUB_REQUIRED).map((id) => cardOf(id))])
    expect(albumProgress(league, full, sets).complete).toBe(true)
  })

  it('counts distinct players, so duplicates of one card do not fill an album', () => {
    const set = clubs[0]
    const dupes = Array.from({ length: 15 }, (_, i) => cardOf(set.playerIds[0], `u${i}`))
    expect(albumProgress(set, ownedPlayerIds(dupes), sets)).toEqual({ have: 1, need: set.required, complete: false })
    const eleven = set.playerIds.slice(0, CLUB_REQUIRED).map((id) => cardOf(id))
    expect(albumProgress(set, ownedPlayerIds(eleven), sets).complete).toBe(set.required <= CLUB_REQUIRED)
  })

  it('has a world set that needs every released world card', () => {
    const world = sets.find((set) => set.id === 'special:world')!
    expect(world.required).toBe(world.playerIds.length)
    expect(world.playerIds.length).toBeGreaterThan(0)
  })

  it('pays by kind from the knobs and ships the same ids to the server', () => {
    expect(albumReward('club')).toEqual({ gold: KNOBS.albumClubGold.default, tickets: 0 })
    expect(albumReward('league')).toEqual({ gold: KNOBS.albumLeagueGold.default, tickets: KNOBS.albumLeagueTickets.default })
    expect(albumReward('special', { albumSpecialGold: 1234 })).toEqual({ gold: 1234, tickets: KNOBS.albumSpecialTickets.default })
    const payload = albumSetPayload(sets)
    expect(payload.map((row) => row.id)).toEqual(sets.map((set) => set.id))
    expect(new Set(payload.map((row) => row.id)).size).toBe(payload.length)
  })
})
