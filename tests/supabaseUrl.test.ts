import { describe, expect, it } from 'vitest'
import { normalizeSupabaseUrl, friendlyError, rejectionMessage } from '../lib/supabase'

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

describe('turning a refusal into something a player can act on', () => {
  it('never shows the operator-facing reason on screen', () => {
    // put_save writes its reason for the audit log, not for the phone.
    const message = rejectionMessage('gold out of range: 999999999999999')
    expect(message).not.toContain('gold out of range')
    expect(message).toContain('정상적인 플레이로 만들 수 없는')
  })

  it('says what to do for the refusals a normal player can hit', () => {
    expect(rejectionMessage('not signed in')).toContain('다시 로그인')
    expect(rejectionMessage('save too large')).toContain('보관함')
  })

  it('points at the migration when the save function is missing', () => {
    expect(friendlyError('permission denied for table saves')).toContain('schema.sql')
  })

  it('leaves an unrecognised message alone rather than guessing', () => {
    expect(friendlyError('something else entirely')).toBe('something else entirely')
  })
})
