import { describe, expect, it } from 'vitest'
import { aiClubById, aiClubId, aiClubsForDivision, isAiClubId } from '../lib/aiClub'
import { BOTTOM_DIVISION, CLUB_POOL, TOP_DIVISION, divisionBaseRating } from '../lib/league'
import { getPlayer } from '../lib/players'

describe('AI club generation', () => {
  it('fields one entry per pool club, each with a full XI', () => {
    const clubs = aiClubsForDivision(TOP_DIVISION)
    expect(clubs).toHaveLength(CLUB_POOL.length)
    for (const club of clubs) {
      const starters = club.lineup.filter((member) => member.role === 'starter')
      expect(starters).toHaveLength(11)
      for (const member of club.lineup) {
        expect(getPlayer(member.playerId)).toBeDefined()
      }
    }
  })

  it('is deterministic — the same division and name always builds the same club', () => {
    const [name] = CLUB_POOL[0]
    const a = aiClubById(aiClubId(3, name))
    const b = aiClubById(aiClubId(3, name))
    expect(a).toEqual(b)
  })

  it('rates higher divisions higher on average', () => {
    const top = aiClubsForDivision(TOP_DIVISION)
    const bottom = aiClubsForDivision(BOTTOM_DIVISION)
    const avg = (rows: typeof top) => rows.reduce((sum, row) => sum + row.rating, 0) / rows.length
    expect(avg(top)).toBeGreaterThan(avg(bottom))
    expect(divisionBaseRating(TOP_DIVISION)).toBeGreaterThan(divisionBaseRating(BOTTOM_DIVISION))
  })

  it('round-trips through the id the directory links use', () => {
    const [name] = CLUB_POOL[CLUB_POOL.length - 1]
    const id = aiClubId(5, name)
    expect(isAiClubId(id)).toBe(true)
    expect(isAiClubId('29055632-ef5e-4eee-aaab-a382fb43f5dd')).toBe(false)
    const club = aiClubById(id)
    expect(club?.club_name).toBe(name)
    expect(club?.division).toBe(5)
  })

  it('refuses an id for a club that is not in the pool', () => {
    expect(aiClubById(aiClubId(3, '없는 클럽 FC'))).toBeNull()
    expect(aiClubById('not-an-ai-id')).toBeNull()
  })
})
