import { describe, expect, it } from 'vitest'
import { normalizeSupabaseUrl, friendlyError } from '../lib/supabase'

describe('supabase url', () => {
  const project = 'https://mpndwtqvwmarkepxzhew.supabase.co'

  it('accepts the plain project url', () => {
    expect(normalizeSupabaseUrl(project)).toBe(project)
  })

  it('trims the rest endpoint people copy from the dashboard', () => {
    expect(normalizeSupabaseUrl(`${project}/rest/v1/`)).toBe(project)
    expect(normalizeSupabaseUrl(`${project}/rest/v1`)).toBe(project)
    expect(normalizeSupabaseUrl(`${project}/auth/v1/`)).toBe(project)
  })

  it('tolerates spaces, trailing slashes and a missing scheme', () => {
    expect(normalizeSupabaseUrl(`  ${project}/  `)).toBe(project)
    expect(normalizeSupabaseUrl('mpndwtqvwmarkepxzhew.supabase.co')).toBe(project)
  })

  it('treats a missing value as unconfigured', () => {
    expect(normalizeSupabaseUrl(undefined)).toBe('')
    expect(normalizeSupabaseUrl('   ')).toBe('')
  })
})

describe('turning server errors into something a player can act on', () => {
  it('explains a save the guard refused instead of showing SQL', () => {
    const message = friendlyError('save rejected: gold out of range: 999999999999999')
    expect(message).not.toContain('save rejected')
    expect(message).not.toContain('gold out of range')
    expect(message).toContain('정상적인 플레이로 만들 수 없는')
  })

  it('leaves an unrecognised message alone rather than guessing', () => {
    expect(friendlyError('something else entirely')).toBe('something else entirely')
  })
})
