import { describe, expect, it } from 'vitest'
import { ARCHETYPES, archetypeParams, type ArchetypeKey } from '../lib/tactics/archetypes'
import { passAccuracy, possessionShare, ppda } from '../lib/tactics/metrics'
import { DEFAULT_PARAMS, withParams, type TacticalParams } from '../lib/tactics/params'
import { profileFrom } from '../lib/tactics/profile'
import { runToEnd, type MatchSetup } from '../lib/matchEngine'
import { seededRandom } from '../lib/players'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import { DEFAULT_TACTIC } from '../lib/tactics'

/**
 * Every claim about the tactics engine is checked by simulating matches, not by
 * reading the formulas. A tactic that cannot be seen in the match statistics is
 * not implemented, however good the code looks.
 */

const RUNS = 120

const baseSetup = (over: Partial<MatchSetup> = {}): MatchSetup => {
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
    params: DEFAULT_PARAMS,
    opponentTactics: { params: DEFAULT_PARAMS, profile: profileFrom({ overall: 60 }) },
    ...over,
  }
}

interface Summary {
  goalsFor: number
  goalsAgainst: number
  shots: number
  shotsAgainst: number
  xg: number
  xgAgainst: number
  possession: number
  passAccuracy: number
  ppda: number
  highTurnovers: number
  counters: number
  countersAgainst: number
  turnoversLost: number
  pressBeaten: number
  crosses: number
  throughBalls: number
  finalThird: number
  finalThirdAgainst: number
  passes: number
  staminaUsed: number
  wins: number
  draws: number
}

function simulate(setup: MatchSetup, runs = RUNS, seed = 1): Summary {
  const total: Summary = {
    goalsFor: 0, goalsAgainst: 0, shots: 0, shotsAgainst: 0, xg: 0, xgAgainst: 0,
    possession: 0, passAccuracy: 0, ppda: 0, highTurnovers: 0, counters: 0,
    countersAgainst: 0, turnoversLost: 0, pressBeaten: 0,
    crosses: 0, throughBalls: 0, finalThird: 0, finalThirdAgainst: 0, passes: 0,
    staminaUsed: 0, wins: 0, draws: 0,
  }
  for (let i = 0; i < runs; i++) {
    const state = runToEnd(setup, seededRandom(seed * 1000 + i))
    const m = state.metrics
    total.goalsFor += state.scoreFor
    total.goalsAgainst += state.scoreAgainst
    total.shots += m.home.shots
    total.shotsAgainst += m.away.shots
    total.xg += m.home.xg
    total.xgAgainst += m.away.xg
    total.possession += possessionShare(m, 'home')
    total.passAccuracy += passAccuracy(m.home)
    total.ppda += ppda(m, 'home')
    total.highTurnovers += m.home.highTurnovers
    total.counters += m.home.counterAttacks
    total.countersAgainst += m.away.counterAttacks
    total.turnoversLost += m.home.turnoversLost
    total.pressBeaten += m.home.pressBeaten
    total.crosses += m.home.crosses
    total.throughBalls += m.home.throughBalls
    total.finalThird += m.home.finalThirdEntries
    total.finalThirdAgainst += m.away.finalThirdEntries
    total.passes += m.home.passes
    total.staminaUsed += m.home.staminaUsed
    if (state.scoreFor > state.scoreAgainst) total.wins += 1
    else if (state.scoreFor === state.scoreAgainst) total.draws += 1
  }
  for (const key of Object.keys(total) as (keyof Summary)[]) total[key] /= runs
  return total
}

const withDials = (over: Partial<TacticalParams>) => withParams(DEFAULT_PARAMS, over)

describe('Test A — pressing', () => {
  const low = simulate(baseSetup({ params: withDials({ pressingIntensity: 15, blockHeight: 25, counterPressIntensity: 15 }) }))
  const high = simulate(baseSetup({ params: withDials({ pressingIntensity: 95, blockHeight: 90, counterPressIntensity: 90 }) }))

  it('presses the ball back higher up the pitch', () => {
    expect(high.highTurnovers).toBeGreaterThan(low.highTurnovers)
  })

  it('lets the opponent play fewer passes per defensive action', () => {
    expect(high.ppda).toBeLessThan(low.ppda)
  })

  it('costs the legs that do the running', () => {
    expect(high.staminaUsed).toBeGreaterThan(low.staminaUsed)
  })
})

describe('Test B — defensive line against pace', () => {
  const quickForwards = profileFrom({ overall: 60, attackPace: 92, finishing: 70 })
  const line = (defensiveLine: number) =>
    simulate(
      baseSetup({
        params: withDials({ defensiveLine }),
        opponentTactics: { params: withDials({ throughBallFrequency: 80, counterAttackIntensity: 70 }), profile: quickForwards },
      }),
    )
  const deep = line(20)
  const high = line(85)

  it('gives fast forwards more to attack behind it', () => {
    expect(high.xgAgainst).toBeGreaterThan(deep.xgAgainst)
  })
})

describe('Test C — directness', () => {
  const patient = simulate(baseSetup({ params: withDials({ directness: 15, buildUpShortness: 90, tempo: 45 }) }))
  const direct = simulate(baseSetup({ params: withDials({ directness: 90, buildUpShortness: 15, tempo: 45 }) }))

  it('trades the ball away', () => {
    expect(direct.possession).toBeLessThan(patient.possession)
    expect(direct.passAccuracy).toBeLessThan(patient.passAccuracy)
  })

  it('reaches the final third with fewer passes', () => {
    expect(direct.finalThird / direct.passes).toBeGreaterThan(patient.finalThird / patient.passes)
  })
})

describe('Test D — low block', () => {
  const block = simulate(baseSetup({ params: archetypeParams('LOW_BLOCK_COUNTER') }))
  const open = simulate(baseSetup({ params: withDials({ defensiveLine: 75, blockHeight: 75, pressingCompactness: 35 }) }))

  it('hands the opponent the ball', () => {
    expect(block.possession).toBeLessThan(open.possession)
  })

  it('gives up less behind the defence even while defending more', () => {
    expect(block.finalThirdAgainst).toBeGreaterThan(0)
    expect(block.xgAgainst).toBeLessThan(open.xgAgainst)
  })
})

describe('Test E — counter pressing', () => {
  const counterPress = simulate(baseSetup({ params: withDials({ counterPressIntensity: 95, regroupPriority: 10, forwardRunFrequency: 80, restDefence: 20 }) }))
  const regroup = simulate(baseSetup({ params: withDials({ counterPressIntensity: 10, regroupPriority: 90, forwardRunFrequency: 30, restDefence: 80 }) }))

  it('wins the ball back sooner when it works', () => {
    expect(counterPress.highTurnovers).toBeGreaterThan(regroup.highTurnovers)
  })

  it('leaves more openings on the break when it is beaten', () => {
    // Per ball lost, the side that swarmed forward concedes more counters. The
    // press also stops some of them, which is why the raw totals can favour it
    // — the exposure only shows when it is measured per turnover.
    // Measured per loss the press failed to win back — the recovered ones were
    // never a danger, so counting them would hide the exposure.
    const exposed = counterPress.countersAgainst / counterPress.pressBeaten
    const covered = regroup.countersAgainst / regroup.pressBeaten
    expect(exposed).toBeGreaterThan(covered)
  })
})

describe('Test F — attacking width', () => {
  const wide = simulate(baseSetup({ params: withDials({ attackingWidth: 95, crossFrequency: 85, overlapFrequency: 80 }) }))
  const narrow = simulate(baseSetup({ params: withDials({ attackingWidth: 15, crossFrequency: 20, overlapFrequency: 15 }) }))

  it('puts more balls into the box from wide', () => {
    expect(wide.crosses).toBeGreaterThan(narrow.crosses)
  })

  it('takes the play away from the middle', () => {
    const wideShare = wide.crosses / Math.max(1, wide.shots)
    const narrowShare = narrow.crosses / Math.max(1, narrow.shots)
    expect(wideShare).toBeGreaterThan(narrowShare)
  })
})

describe('balance — matchups decide, not a table', () => {
  const keys = ARCHETYPES.map((item) => item.key)
  const evenProfile = profileFrom({ overall: 62 })

  /** Points per game for `us` playing `them`, both at the same strength. */
  const meeting = (us: ArchetypeKey, them: ArchetypeKey) => {
    const summary = simulate(
      baseSetup({
        params: archetypeParams(us),
        opponent: { id: 'sim', name: '시뮬 상대', badge: 'SM', rating: 62 },
        opponentTactics: { params: archetypeParams(them), profile: evenProfile },
      }),
      // 60경기로는 무승부 한 번에 결과가 뒤집혀, 능력치를 조금만 손대도
      // 이 가드가 노이즈로 실패했다. 재보니 표본이 모자랐던 것이지 상성이
      // 약해진 것이 아니었다. 판정을 믿을 수 있을 만큼 늘린다.
      180,
      keys.indexOf(us) * 17 + keys.indexOf(them) + 1,
    )
    return summary.wins * 3 + summary.draws
  }

  const table = new Map<ArchetypeKey, number[]>()
  for (const us of keys) {
    table.set(
      us,
      keys.filter((them) => them !== us).map((them) => meeting(us, them)),
    )
  }
  const averages = [...table].map(([key, points]) => ({
    key,
    average: points.reduce((sum, value) => sum + value, 0) / points.length,
    best: Math.max(...points),
    worst: Math.min(...points),
  }))

  it('makes the opponent style matter for every plan', () => {
    // If a style were a flat bonus, it would score the same against everyone.
    for (const row of averages) {
      expect({ key: row.key, gap: Number((row.best - row.worst).toFixed(2)) }).toMatchObject({
        key: row.key,
      })
      expect(row.best - row.worst).toBeGreaterThan(0.25)
    }
  })

  it('leaves no style unplayable and none unbeatable', () => {
    for (const row of averages) {
      expect({ key: row.key, average: Number(row.average.toFixed(2)) }).toMatchObject({
        key: row.key,
      })
      expect(row.average).toBeLessThan(2.7)
      expect(row.average).toBeGreaterThan(1.5)
    }
  })

  it('keeps the styles within a points-per-game of each other', () => {
    const best = Math.max(...averages.map((row) => row.average))
    const worst = Math.min(...averages.map((row) => row.average))
    expect(best - worst).toBeLessThan(0.8)
  })
})

describe('no shortcuts', () => {
  it('never gives a tactic a flat result bonus', () => {
    // The same instructions against different opponents must not produce a
    // fixed swing: the engine has to work through the match, not a table.
    const versus = (params: TacticalParams) =>
      simulate(
        baseSetup({
          params: archetypeParams('GEGENPRESS'),
          opponentTactics: { params, profile: profileFrom({ overall: 60 }) },
        }),
        60,
        7,
      )
    const againstShort = versus(archetypeParams('POSSESSION_POSITIONAL'))
    const againstLong = versus(archetypeParams('DIRECT_TARGET'))
    // A press is worth more against a side that plays out than one that does
    // not — if these were equal the press would be a flat modifier.
    expect(againstShort.highTurnovers).not.toBeCloseTo(againstLong.highTurnovers, 1)
  })
})
