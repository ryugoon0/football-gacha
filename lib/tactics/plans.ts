import { archetypeParams } from './archetypes'
import { phasedFrom, type PhasedTactics } from './phases'

/**
 * Worked examples of plans that cannot be written as a single set of dials.
 * Each one says something different about one situation than about the rest —
 * which is how modern sides actually play.
 */
export interface ExamplePlan {
  key: string
  label: string
  idea: string
  plan: PhasedTactics
}

export const EXAMPLE_PLANS: ExamplePlan[] = [
  {
    key: 'HUNT_THEN_DROP',
    label: '전환 사냥 · 정착하면 후퇴',
    idea:
      '잃은 직후 6초는 전원이 달려들어 되찾고, 되찾지 못해 상대가 자리를 잡으면 미들 블록으로 내려섭니다. 압박 체력을 전환 순간에만 씁니다.',
    plan: phasedFrom(archetypeParams('MID_BLOCK_BALANCED'), {
      DEFENSIVE_TRANSITION: { counterPressIntensity: 95, regroupPriority: 10, restDefence: 35 },
      OUT_OF_POSSESSION: { blockHeight: 40, defensiveLine: 42, pressingIntensity: 35, pressingCompactness: 85 },
      ATTACKING_TRANSITION: { transitionSpeed: 85, counterAttackIntensity: 80, directness: 75 },
    }),
  },
  {
    key: 'PATIENT_THEN_KILL',
    label: '느리게 돌리다 순간 가속',
    idea:
      '점유 상황에서는 짧게 돌리며 상대를 끌어내지만, 빼앗은 직후에는 곧바로 길게 찔러 넣습니다. 같은 팀이 두 얼굴을 갖습니다.',
    plan: phasedFrom(archetypeParams('POSSESSION_POSITIONAL'), {
      IN_POSSESSION: { tempo: 45, directness: 20, buildUpShortness: 92, finalThirdPatience: 80 },
      ATTACKING_TRANSITION: { transitionSpeed: 90, directness: 85, forwardRunFrequency: 80, passingRisk: 75 },
    }),
  },
  {
    key: 'DEEP_BUT_BRAVE',
    label: '깊게 서되 공은 짧게',
    idea:
      '수비는 낮고 좁게 서지만 공을 잡으면 걷어내지 않고 짧게 풀어 나갑니다. 압박이 강한 상대에게는 위험하고, 뚫으면 상대 진영이 비어 있습니다.',
    plan: phasedFrom(archetypeParams('LOW_BLOCK_COUNTER'), {
      IN_POSSESSION: { buildUpShortness: 80, directness: 30, finalThirdPatience: 65, tempo: 45 },
      OUT_OF_POSSESSION: { defensiveLine: 22, blockHeight: 24, pressingCompactness: 92 },
    }),
  },
]

export const EXAMPLE_PLAN_BY_KEY: Record<string, ExamplePlan> = EXAMPLE_PLANS.reduce(
  (map, item) => {
    map[item.key] = item
    return map
  },
  {} as Record<string, ExamplePlan>,
)
