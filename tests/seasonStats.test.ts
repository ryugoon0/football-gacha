import { describe, expect, it } from 'vitest'
import type { PlayerRating } from '../lib/growth'
import { matchMvpOf, recordSeasonStats, seasonLeaders } from '../lib/seasonStats'

const mark = (uid: string, rating: number, goals = 0, assists = 0): PlayerRating => ({
  uid,
  name: `선수${uid}`,
  rating,
  goals,
  assists,
  exp: 10,
})

describe('season individual records', () => {
  it('tallies goals, assists and the club MVP across matches, then ranks them', () => {
    let stats = recordSeasonStats({}, [mark('a', 8.1, 2, 0), mark('b', 7.4, 0, 2), mark('c', 6.0)])
    stats = recordSeasonStats(stats, [mark('a', 6.2), mark('b', 8.8, 1, 1), mark('c', 6.5, 0, 1)])
    expect(matchMvpOf([mark('x', 7, 1), mark('y', 7, 0, 2)])!.uid).toBe('x')

    const leaders = seasonLeaders(stats)
    expect(leaders.scorers.map((r) => r.uid)).toEqual(['a', 'b'])
    expect(leaders.assisters.map((r) => r.uid)).toEqual(['b', 'c'])
    // One MVP each; the higher average mark (b: 8.1 vs a: 7.15) breaks the tie.
    expect(leaders.mvps.map((r) => r.uid)).toEqual(['b', 'a'])
    expect(stats.a.matches).toBe(2)
    expect(stats.b.assists).toBe(3)
    expect(stats.c.mvps).toBe(0)
  })

  it('starts empty and survives an undefined save field', () => {
    expect(seasonLeaders(undefined)).toEqual({ scorers: [], assisters: [], mvps: [] })
    expect(Object.keys(recordSeasonStats(undefined, []))).toHaveLength(0)
  })
})
