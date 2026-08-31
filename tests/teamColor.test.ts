import { describe, expect, it } from 'vitest'
import { PLAYERS, PLAYERS_BY_RARITY, LEAGUE_OF_CLUB, CLUBS } from '../lib/players'
import { COLOR_CAPS, COLOR_TIERS, colorName, teamColors } from '../lib/teamColor'
import type { PlayerDef } from '../lib/types'

const fake = (index: number, club: string, league: string, nation: string): PlayerDef => ({
  ...PLAYERS[0],
  id: `x${index}`,
  club,
  league,
  nation,
})

const squad = (
  spec: { club: string; league: string; nation: string }[],
): PlayerDef[] => spec.map((item, index) => fake(index, item.club, item.league, item.nation))

/** Players who share nothing with anyone, used to pad a squad out to eleven. */
const filler = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    club: `무소속${index}`,
    league: `무리그${index}`,
    nation: `무국적${index}`,
  }))

describe('club and league data', () => {
  it('gives every player a club that belongs to a league', () => {
    for (const player of PLAYERS) {
      expect(LEAGUE_OF_CLUB[player.club]).toBe(player.league)
    }
  })

  it('has at least four clubs in every league so a league colour is reachable', () => {
    const perLeague = new Map<string, number>()
    for (const club of CLUBS) perLeague.set(club.league, (perLeague.get(club.league) ?? 0) + 1)
    for (const count of perLeague.values()) expect(count).toBeGreaterThanOrEqual(4)
  })
})

describe('team colours', () => {
  it('stays quiet for a squad with nothing in common', () => {
    const players = squad(
      Array.from({ length: 11 }, (_, index) => ({
        club: `클럽${index}`,
        league: `리그${index}`,
        nation: `나라${index}`,
      })),
    )
    const colors = teamColors(players)
    expect(colors.active).toHaveLength(0)
    expect(colors.bonus).toEqual({ rating: 0, chemistry: 0 })
  })

  it('fires the club colour at three players', () => {
    const players = squad([
      ...Array.from({ length: 3 }, () => ({ club: '한강 FC', league: 'K리그', nation: '대한민국' })),
      ...filler(8),
    ])
    const colors = teamColors(players)
    const club = colors.active.find((color) => color.kind === 'club')!

    expect(club.key).toBe('한강 FC')
    expect(club.count).toBe(3)
    expect(club.tier).toEqual(COLOR_TIERS.club[0])
    expect(club.next?.missing).toBe(2)
    expect(colors.bonus.rating).toBeGreaterThan(0)
  })

  it('upgrades to the higher tier with more players', () => {
    const seven = squad([
      ...Array.from({ length: 7 }, () => ({ club: '한강 FC', league: 'K리그', nation: '대한민국' })),
      ...filler(4),
    ])
    const club = teamColors(seven).active.find((color) => color.kind === 'club')!
    expect(club.tier).toEqual(COLOR_TIERS.club[2])
    expect(club.next).toBeNull()
  })

  it('stacks club, league and nation but never past the cap', () => {
    const players = squad(
      Array.from({ length: 11 }, () => ({ club: '한강 FC', league: 'K리그', nation: '대한민국' })),
    )
    const colors = teamColors(players)
    expect(colors.active.map((color) => color.kind).sort()).toEqual(['club', 'league', 'nation'])
    expect(colors.bonus.rating).toBeLessThanOrEqual(COLOR_CAPS.rating)
    expect(colors.bonus.chemistry).toBeLessThanOrEqual(COLOR_CAPS.chemistry)
  })

  it('points out the colours that are one or two players away', () => {
    const players = squad([
      ...Array.from({ length: 2 }, () => ({ club: '한강 FC', league: 'K리그', nation: '대한민국' })),
      ...filler(9),
    ])
    const hint = teamColors(players).hints.find((item) => item.key === '한강 FC')!
    expect(hint.missing).toBe(1)
    expect(teamColors(players).active).toHaveLength(0)
  })

  it('names a colour the way the UI shows it', () => {
    expect(colorName({ kind: 'club', key: '한강 FC' })).toBe('한강 FC 클럽')
    expect(colorName({ kind: 'nation', key: '브라질' })).toBe('브라질 국가')
    // The suffix is dropped when the name already carries it.
    expect(colorName({ kind: 'league', key: 'K리그' })).toBe('K리그')
    expect(colorName({ kind: 'league', key: '아메리카 리그' })).toBe('아메리카 리그')
  })

  it('raises a real squad rating when the colour fires', async () => {
    const { evaluateSquad } = await import('../lib/squad')
    const { initialState } = await import('../lib/storage')
    const state = initialState()
    const plain = evaluateSquad(state.cards, state.squad)

    // Rebuild the eleven out of players from one club and country.
    const club = PLAYERS_BY_RARITY.Normal[0].club
    const mates = PLAYERS.filter((player) => player.club === club).slice(0, 11)
    if (mates.length >= 3) {
      const cards = mates.map((player, index) => ({
        uid: `c${index}`,
        playerId: player.id,
        level: 1,
        condition: 100,
        injuredFor: 0,
        exp: 0,
      }))
      const slots = Object.keys(state.squad.slots)
      const squadWithColor = {
        ...state.squad,
        slots: Object.fromEntries(slots.map((slot, index) => [slot, cards[index]?.uid ?? null])),
      }
      const colored = evaluateSquad(cards, squadWithColor)
      expect(colored.colors.active.length).toBeGreaterThan(0)
      expect(colored.colors.bonus.rating).toBeGreaterThan(0)
    }
    expect(plain.colors).toBeDefined()
  })
})
