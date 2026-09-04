import { describe, expect, it } from 'vitest'
import { movementOf } from '../lib/weeklyLeague/recap'

describe('weekly recap', () => {
  it('reads tier numbers the right way round — 0 is the top', () => {
    expect(movementOf(1, 0)).toBe('up')
    expect(movementOf(0, 1)).toBe('down')
    expect(movementOf(2, 2)).toBe('stay')
  })
})
