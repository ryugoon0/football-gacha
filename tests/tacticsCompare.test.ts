import { describe, expect, it } from 'vitest'
import { archetypeParams } from '../lib/tactics/archetypes'
import { comparePlans, pointsPerMatch, summarisePlan, withSubjectParticle } from '../lib/tactics/compare'
import { DEFAULT_PARAMS } from '../lib/tactics/params'
import { phasedFrom } from '../lib/tactics/phases'
import { profileFrom } from '../lib/tactics/profile'
import { EXAMPLE_PLANS } from '../lib/tactics/plans'
import { planForMode } from '../lib/tactics/mode'
import type { MatchSetup } from '../lib/matchEngine'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import { DEFAULT_TACTIC } from '../lib/tactics'

const setupOf = (): MatchSetup => {
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
  }
}

describe('plan comparison', () => {
  it('is deterministic — the same comparison twice gives the same answer', () => {
    const setup = setupOf()
    const a = phasedFrom(archetypeParams('GEGENPRESS'))
    const b = phasedFrom(archetypeParams('LOW_BLOCK_COUNTER'))

    const first = comparePlans({ setup, a, b, matches: 20 })
    const second = comparePlans({ setup, a, b, matches: 20 })

    expect(first).toEqual(second)
  })

  it('gives an identical plan an identical record — the seeds really are shared', () => {
    const setup = setupOf()
    const plan = phasedFrom(archetypeParams('MID_BLOCK_BALANCED'))

    const { a, b, notes } = comparePlans({ setup, a: plan, b: plan, matches: 24 })

    expect(a).toEqual(b)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('차이가')
  })

  it('separates a pressing plan from a deep one on the pressing numbers', () => {
    const setup = setupOf()
    const press = summarisePlan(setup, phasedFrom(archetypeParams('GEGENPRESS')), 40, 11)
    const deep = summarisePlan(setup, phasedFrom(archetypeParams('LOW_BLOCK_COUNTER')), 40, 11)

    // Lower PPDA means the opponent gets fewer passes per defensive action.
    expect(press.ppda).toBeLessThan(deep.ppda)
    expect(press.highTurnovers).toBeGreaterThan(deep.highTurnovers)
    expect(press.possession).toBeGreaterThan(deep.possession)
  })

  it('reports the two tactics modes of one plan as a real difference', () => {
    const setup = setupOf()
    const plan = EXAMPLE_PLANS[0].plan

    const { notes } = comparePlans({
      setup,
      a: planForMode(plan, 'phased'),
      b: planForMode(plan, 'sliders'),
      nameA: '국면 분리',
      nameB: '슬라이더',
      matches: 40,
    })

    expect(notes.join(' ')).not.toContain('차이가 드러나지')
  })

  it('counts points the way a league table does', () => {
    expect(
      pointsPerMatch({ ...summarisePlan(setupOf(), phasedFrom(DEFAULT_PARAMS), 0, 1), matches: 10, wins: 3, draws: 1, losses: 6 }),
    ).toBeCloseTo(1)
  })
})

describe('reading the comparison out loud', () => {
  it('picks the Korean subject particle by the final consonant', () => {
    // 게겐프레싱 ends on ㅇ, 역습 on ㅂ — both take 이.
    expect(withSubjectParticle('게겐프레싱')).toBe('게겐프레싱이')
    expect(withSubjectParticle('수비 블록 · 역습')).toBe('수비 블록 · 역습이')
    // 슬라이더 and 비교 end on a vowel — both take 가.
    expect(withSubjectParticle('내 계획 · 슬라이더')).toBe('내 계획 · 슬라이더가')
    expect(withSubjectParticle('점유 · 포지셔널')).toBe('점유 · 포지셔널이')
    // Non-Korean names fall back to 가 rather than producing nonsense.
    expect(withSubjectParticle('Plan A')).toBe('Plan A가')
  })

  it('names the better plan with the right particle in the write-up', () => {
    const setup = setupOf()
    const { notes } = comparePlans({
      setup,
      a: phasedFrom(archetypeParams('GEGENPRESS')),
      b: phasedFrom(archetypeParams('LOW_BLOCK_COUNTER')),
      nameA: '게겐프레싱',
      nameB: '수비 블록 · 역습',
      matches: 40,
    })
    const text = notes.join(' ')
    expect(text).toContain('게겐프레싱이')
    expect(text).not.toContain('게겐프레싱가')
  })
})
