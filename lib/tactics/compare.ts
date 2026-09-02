import { runToEnd, matchOutcome, type MatchSetup } from '../matchEngine'
import { seededRandom } from '../players'
import { passAccuracy, possessionShare, ppda } from './metrics'
import type { PhasedTactics } from './phases'

/**
 * Runs two plans over the same fixtures and reports what actually changed.
 *
 * Both sides face the same opponent on the same seeds, so a difference in the
 * table is the plan talking and not the dice. Pure: give it the same arguments
 * and it gives the same answer.
 */

export interface PlanSummary {
  matches: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  /** Expected goals, our proxy for chance quality. */
  xgFor: number
  xgAgainst: number
  shots: number
  possession: number
  passAccuracy: number
  /** Opponent passes allowed per defensive action — lower means more pressing. */
  ppda: number
  highTurnovers: number
  counterAttacks: number
}

export interface PlanComparison {
  a: PlanSummary
  b: PlanSummary
  /** Plain-language readings of where the two differ, biggest gap first. */
  notes: string[]
}

const EMPTY: PlanSummary = {
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  xgFor: 0,
  xgAgainst: 0,
  shots: 0,
  possession: 0,
  passAccuracy: 0,
  ppda: 0,
  highTurnovers: 0,
  counterAttacks: 0,
}

/** Points per match, the one number that says which plan won more. */
export function pointsPerMatch(summary: PlanSummary): number {
  if (summary.matches === 0) return 0
  return (summary.wins * 3 + summary.draws) / summary.matches
}

/**
 * Plays `matches` games with one plan. The seed is derived from the match
 * index alone, so the other plan can be given exactly the same run of luck.
 */
export function summarisePlan(
  setup: MatchSetup,
  plan: PhasedTactics,
  matches: number,
  seed: number,
): PlanSummary {
  const total = { ...EMPTY, matches }
  let possession = 0
  let accuracy = 0
  let press = 0

  for (let i = 0; i < matches; i++) {
    const state = runToEnd({ ...setup, phased: plan }, seededRandom(seed + i * 7919))
    const outcome = matchOutcome(state)
    if (outcome === 'W') total.wins++
    else if (outcome === 'D') total.draws++
    else total.losses++

    total.goalsFor += state.scoreFor
    total.goalsAgainst += state.scoreAgainst
    total.xgFor += state.metrics.home.xg
    total.xgAgainst += state.metrics.away.xg
    total.shots += state.metrics.home.shots
    total.highTurnovers += state.metrics.home.highTurnovers
    total.counterAttacks += state.metrics.home.counterAttacks

    possession += possessionShare(state.metrics, 'home')
    accuracy += passAccuracy(state.metrics.home)
    press += ppda(state.metrics, 'home')
  }

  const per = matches > 0 ? 1 / matches : 0
  return {
    ...total,
    goalsFor: total.goalsFor * per,
    goalsAgainst: total.goalsAgainst * per,
    xgFor: total.xgFor * per,
    xgAgainst: total.xgAgainst * per,
    shots: total.shots * per,
    highTurnovers: total.highTurnovers * per,
    counterAttacks: total.counterAttacks * per,
    possession: possession * per,
    passAccuracy: accuracy * per,
    ppda: press * per,
  }
}

/**
 * Korean marks the subject with 이 after a final consonant and 가 after a
 * vowel, so a tactic's name decides the particle that follows it.
 */
export function withSubjectParticle(name: string): string {
  const last = name.trim().slice(-1)
  const code = last.charCodeAt(0)
  const hangul = code >= 0xac00 && code <= 0xd7a3
  if (!hangul) return `${name}가`
  return `${name}${(code - 0xac00) % 28 === 0 ? '가' : '이'}`
}

interface Reading {
  gap: number
  text: string
}

/** Only differences worth a manager's attention get written up. */
function readings(a: PlanSummary, b: PlanSummary, nameA: string, nameB: string): string[] {
  const side = (value: number) => withSubjectParticle(value > 0 ? nameA : nameB)
  const out: Reading[] = []

  const points = pointsPerMatch(a) - pointsPerMatch(b)
  if (Math.abs(points) >= 0.15) {
    out.push({
      gap: Math.abs(points) * 4,
      text: `승점은 ${side(points)} 경기당 ${Math.abs(points).toFixed(2)} 앞섭니다.`,
    })
  }

  const scored = a.goalsFor - b.goalsFor
  if (Math.abs(scored) >= 0.15) {
    out.push({
      gap: Math.abs(scored) * 3,
      text: `득점은 ${side(scored)} 경기당 ${Math.abs(scored).toFixed(2)}골 많습니다.`,
    })
  }

  const conceded = b.goalsAgainst - a.goalsAgainst
  if (Math.abs(conceded) >= 0.15) {
    out.push({
      gap: Math.abs(conceded) * 3,
      text: `실점은 ${side(conceded)} 경기당 ${Math.abs(conceded).toFixed(2)}골 적습니다.`,
    })
  }

  const ball = a.possession - b.possession
  if (Math.abs(ball) >= 0.03) {
    out.push({
      gap: Math.abs(ball) * 20,
      text: `공은 ${side(ball)} ${(Math.abs(ball) * 100).toFixed(0)}%p 더 쥡니다.`,
    })
  }

  // PPDA is inverted: fewer opponent passes per action means heavier pressing.
  const pressing = b.ppda - a.ppda
  if (Math.abs(pressing) >= 0.8) {
    out.push({
      gap: Math.abs(pressing) * 0.5,
      text: `압박은 ${side(pressing)} 강합니다 (PPDA ${a.ppda.toFixed(1)} 대 ${b.ppda.toFixed(1)}).`,
    })
  }

  const won = a.highTurnovers - b.highTurnovers
  if (Math.abs(won) >= 0.6) {
    out.push({
      gap: Math.abs(won) * 0.6,
      text: `상대 진영에서 공을 되찾는 횟수는 ${side(won)} 경기당 ${Math.abs(won).toFixed(1)}회 많습니다.`,
    })
  }

  const counters = a.counterAttacks - b.counterAttacks
  if (Math.abs(counters) >= 0.5) {
    out.push({
      gap: Math.abs(counters) * 0.6,
      text: `역습 횟수는 ${side(counters)} 경기당 ${Math.abs(counters).toFixed(1)}회 많습니다.`,
    })
  }

  if (out.length === 0) {
    return ['두 전술의 차이가 표본 안에서는 드러나지 않았습니다. 경기 수를 늘려 보세요.']
  }
  return out.sort((x, y) => y.gap - x.gap).map((item) => item.text)
}

export function comparePlans({
  setup,
  a,
  b,
  nameA = 'A',
  nameB = 'B',
  matches = 60,
  seed = 20260902,
}: {
  setup: MatchSetup
  a: PhasedTactics
  b: PhasedTactics
  nameA?: string
  nameB?: string
  matches?: number
  seed?: number
}): PlanComparison {
  // Same seed for both: identical opposition, identical luck, different plan.
  const left = summarisePlan(setup, a, matches, seed)
  const right = summarisePlan(setup, b, matches, seed)
  return { a: left, b: right, notes: readings(left, right, nameA, nameB) }
}
