import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { publicLineupOf } from '../lib/publicClub'
import { initialState } from '../lib/storage'

describe('public club snapshots', () => {
  it('contains only display-safe player fields', () => {
    const state = initialState()
    const lineup = publicLineupOf(state)

    expect(lineup.filter((member) => member.role === 'starter')).toHaveLength(11)
    expect(lineup.length).toBeGreaterThan(11)
    for (const member of lineup) {
      expect(Object.keys(member).sort()).toEqual(['level', 'playerId', 'role', 'slot'])
      expect(member).not.toHaveProperty('uid')
      expect(member).not.toHaveProperty('condition')
      expect(member).not.toHaveProperty('injuredFor')
    }
  })

  it('drops empty, missing, and unknown cards', () => {
    const state = initialState()
    const firstSlot = Object.keys(state.squad.slots)[0]
    state.squad.slots[firstSlot] = null
    state.squad.bench[0] = 'missing-card'
    state.cards[0] = { ...state.cards[0], playerId: 'unknown-player' }

    const lineup = publicLineupOf(state)
    expect(lineup.some((member) => member.playerId === 'unknown-player')).toBe(false)
    expect(lineup.some((member) => member.slot === firstSlot)).toBe(false)
  })
})

describe('public club database boundary', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260903163726_public_club_squads.sql', import.meta.url),
    'utf8',
  )

  it('keeps writes behind an authenticated RPC', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain('v_user uuid := auth.uid()')
    expect(migration).toContain('revoke all on function public.set_public_club_squad')
    expect(migration).toContain('grant execute on function public.set_public_club_squad')
    expect(migration).toContain('to authenticated')
  })

  it('limits reads to public rows or their owner', () => {
    expect(migration).toContain('for select using (is_public or auth.uid() = user_id)')
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)/i)
  })
})
