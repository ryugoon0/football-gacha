import { describe, expect, it } from 'vitest'
import { archetypeParams } from '../lib/tactics/archetypes'
import { EXAMPLE_PLANS } from '../lib/tactics/plans'
import { DEFAULT_PARAMS, withParams } from '../lib/tactics/params'
import {
  PHASE_KEYS,
  normalizePhased,
  paramsForPhase,
  phaseDiffers,
  phasedFrom,
} from '../lib/tactics/phases'
import { profileFrom } from '../lib/tactics/profile'
import { runToEnd, type MatchSetup } from '../lib/matchEngine'
import { seededRandom } from '../lib/players'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import { DEFAULT_TACTIC } from '../lib/tactics'

const setupOf = (over: Partial<MatchSetup> = {}): MatchSetup => {
  const state = initialState()
  const rating = evaluateSquad(state.cards, state.squad, 5)
  return {
    team: rating,
    teamName: state.club,
    opponent: { id: 'sim', name: '시뮬 상대', badge: 'SM', rating: 60 },
    division: 5,
    venue: 'neutral',
    tactic: DEFAULT_TACTIC,
    traits: rating.traits,
    opponentTactics: { params: DEFAULT_PARAMS, profile: profileFrom({ overall: 60 }) },
    ...over,
  }
}

const average = (setup: MatchSetup, runs = 100, seed = 3) => {
  let highTurnovers = 0
  let xgAgainst = 0
  let countersAgainst = 0
  let staminaUsed = 0
  for (let i = 0; i < runs; i++) {
    const state = runToEnd(setup, seededRandom(seed * 811 + i))
    highTurnovers += state.metrics.home.highTurnovers
    xgAgainst += state.metrics.away.xg
    countersAgainst += state.metrics.away.counterAttacks
    staminaUsed += state.metrics.home.staminaUsed
  }
  return {
    highTurnovers: highTurnovers / runs,
    xgAgainst: xgAgainst / runs,
    countersAgainst: countersAgainst / runs,
    staminaUsed: staminaUsed / runs,
  }
}

describe('phase separation', () => {
  it('only lets a phase change the dials it owns', () => {
    const plan = phasedFrom(DEFAULT_PARAMS, {
      // defensiveLine belongs to the settled defence, not to the transition.
      DEFENSIVE_TRANSITION: { counterPressIntensity: 95, defensiveLine: 5 },
    })
    const transition = paramsForPhase(plan, 'DEFENSIVE_TRANSITION')
    expect(transition.counterPressIntensity).toBe(95)
    expect(transition.defensiveLine).toBe(DEFAULT_PARAMS.defensiveLine)
  })

  it('falls back to the base plan for anything a phase does not set', () => {
    const base = withParams(DEFAULT_PARAMS, { tempo: 80, defensiveLine: 30 })
    const plan = phasedFrom(base, { OUT_OF_POSSESSION: { blockHeight: 20 } })
    expect(paramsForPhase(plan, 'IN_POSSESSION')).toEqual(base)
    expect(paramsForPhase(plan, 'OUT_OF_POSSESSION').blockHeight).toBe(20)
    expect(paramsForPhase(plan, 'OUT_OF_POSSESSION').tempo).toBe(80)
  })

  it('reports which situations are played differently', () => {
    const plan = phasedFrom(DEFAULT_PARAMS, { DEFENSIVE_TRANSITION: { counterPressIntensity: 95 } })
    expect(phaseDiffers(plan, 'DEFENSIVE_TRANSITION')).toBe(true)
    expect(phaseDiffers(plan, 'IN_POSSESSION')).toBe(false)
  })

  it('repairs a hand edited plan', () => {
    const plan = normalizePhased({
      base: { tempo: 900, nonsense: 5 },
      byPhase: { OUT_OF_POSSESSION: { blockHeight: -20 }, NOT_A_PHASE: { tempo: 10 } },
    })
    expect(plan.base.tempo).toBe(100)
    expect(paramsForPhase(plan, 'OUT_OF_POSSESSION').blockHeight).toBe(0)
    expect(Object.keys(plan.byPhase ?? {})).toEqual(['OUT_OF_POSSESSION'])
  })

  it('gives every phase at least one dial of its own', () => {
    for (const keys of Object.values(PHASE_KEYS)) expect(keys.length).toBeGreaterThan(2)
  })
})

describe('phases change how the match plays', () => {
  const base = archetypeParams('MID_BLOCK_BALANCED')

  it('counter pressing only in the transition wins the ball back more', () => {
    const flat = average(setupOf({ phased: phasedFrom(base) }))
    const hunting = average(
      setupOf({
        phased: phasedFrom(base, {
          DEFENSIVE_TRANSITION: { counterPressIntensity: 95, regroupPriority: 10, restDefence: 30 },
        }),
      }),
    )
    expect(hunting.highTurnovers).toBeGreaterThan(flat.highTurnovers)
  })

  it('dropping the line only once the opponent settles concedes less from open play', () => {
    const high = average(
      setupOf({ phased: phasedFrom(withParams(base, { defensiveLine: 85, blockHeight: 85 })) }),
    )
    const dropping = average(
      setupOf({
        phased: phasedFrom(withParams(base, { defensiveLine: 85, blockHeight: 85 }), {
          OUT_OF_POSSESSION: { defensiveLine: 30, blockHeight: 35, pressingCompactness: 85 },
        }),
      }),
    )
    expect(dropping.xgAgainst).toBeLessThan(high.xgAgainst)
  })

  it('runs the worked examples end to end', () => {
    for (const example of EXAMPLE_PLANS) {
      const state = runToEnd(setupOf({ phased: example.plan }), seededRandom(9))
      expect(state.finished).toBe(true)
      expect(state.metrics.home.shots + state.metrics.away.shots).toBeGreaterThan(0)
    }
  })
})
