import { describe, expect, it } from 'vitest'
import { buildStamp } from '../lib/build'

describe('naming a deploy', () => {
  it('shows the build time in KST, the timezone this is built for', () => {
    // 2026-09-02T00:03:18Z is 09:03 the same day in KST.
    expect(buildStamp('2026-09-02T00:03:18Z')).toBe('2026-09-02 09:03 KST')
  })

  it('rolls the date forward when UTC evening is the next day in Seoul', () => {
    expect(buildStamp('2026-09-01T16:30:00Z')).toBe('2026-09-02 01:30 KST')
  })

  it('says nothing rather than something wrong when the stamp is missing', () => {
    expect(buildStamp('')).toBe('')
    expect(buildStamp('not a date')).toBe('')
  })
})
