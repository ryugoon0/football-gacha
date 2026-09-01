import { describe, expect, it } from 'vitest'
import { normalizeSupabaseUrl } from '../lib/supabase'

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
