import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TACTIC,
  TACTIC_PRESETS,
  normalizeTactic,
  presetOf,
  tacticEffects,
  tacticSummary,
} from '../lib/tactics'

describe('tactic presets', () => {
  it('every preset is a complete, valid setup', () => {
    for (const preset of TACTIC_PRESETS) {
      expect(normalizeTactic(preset.setup)).toEqual(preset.setup)
      expect(tacticSummary(preset.setup).split(' · ')).toHaveLength(4)
    }
  })

  it('recognises the setup a preset produces', () => {
    for (const preset of TACTIC_PRESETS) {
      expect(presetOf(preset.setup)).toBe(preset.key)
    }
    expect(presetOf(DEFAULT_TACTIC)).toBe('balanced')
  })

  it('reports no preset for a hand tuned setup', () => {
    expect(presetOf({ ...DEFAULT_TACTIC, pressing: 'high', tempo: 'slow' })).toBeNull()
  })

  it('trades attack for defence across the presets', () => {
    const allOut = tacticEffects(TACTIC_PRESETS.find((item) => item.key === 'allOut')!.setup)
    const lock = tacticEffects(TACTIC_PRESETS.find((item) => item.key === 'lock')!.setup)
    expect(allOut.chance).toBeGreaterThan(lock.chance)
    expect(allOut.att).toBeGreaterThan(lock.att)
    expect(lock.def).toBeGreaterThan(allOut.def)
    expect(lock.fatigue).toBeLessThan(allOut.fatigue)
  })

  it('keeps the counter preset aggressive without a high line', () => {
    const counter = TACTIC_PRESETS.find((item) => item.key === 'counter')!
    expect(counter.setup.line).toBe('deep')
    expect(tacticEffects(counter.setup).counterRisk).toBeLessThan(
      tacticEffects(TACTIC_PRESETS.find((item) => item.key === 'allOut')!.setup).counterRisk,
    )
  })
})
