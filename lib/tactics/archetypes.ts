import { DEFAULT_PARAMS, withParams, type TacticalParams } from './params'

/**
 * Well known styles, written only as parameter combinations. None of them is a
 * special case in the engine: change a dial and you have a different team.
 */
export type ArchetypeKey =
  | 'POSSESSION_POSITIONAL'
  | 'GEGENPRESS'
  | 'DIRECT_COUNTER'
  | 'LOW_BLOCK_COUNTER'
  | 'WING_PLAY'
  | 'DIRECT_TARGET'
  | 'MID_BLOCK_BALANCED'

export interface Archetype {
  key: ArchetypeKey
  label: string
  /** What the manager is asking for, in a sentence. */
  idea: string
  /** What it costs — every style gives something up. */
  cost: string
  params: TacticalParams
}

export const ARCHETYPES: Archetype[] = [
  {
    key: 'POSSESSION_POSITIONAL',
    label: '점유 · 포지셔널',
    idea: '짧게 이어 올라가 폭을 넓게 쓰고, 잃으면 곧바로 다시 압박합니다.',
    cost: '전개가 느려 상대가 자리를 잡을 시간을 줍니다. 압박이 센 상대에게는 후방에서 잃을 위험이 큽니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 55,
      directness: 30,
      attackingWidth: 70,
      buildUpShortness: 85,
      passingRisk: 45,
      finalThirdPatience: 70,
      crossFrequency: 40,
      throughBallFrequency: 45,
      defensiveLine: 70,
      blockHeight: 68,
      pressingIntensity: 70,
      pressingCompactness: 65,
      defensiveWidth: 45,
      counterPressIntensity: 80,
      regroupPriority: 30,
      counterAttackIntensity: 40,
      transitionSpeed: 45,
      forwardRunFrequency: 55,
      restDefence: 60,
    }),
  },
  {
    key: 'GEGENPRESS',
    label: '게겐프레싱',
    idea: '높은 곳에서 압박해 상대 진영에서 빼앗고, 그 자리에서 바로 공격합니다.',
    cost: '체력 소모가 가장 크고, 압박이 한 번 뚫리면 수비라인 뒤가 그대로 열립니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 85,
      directness: 65,
      attackingWidth: 60,
      buildUpShortness: 55,
      passingRisk: 65,
      finalThirdPatience: 30,
      throughBallFrequency: 65,
      defensiveLine: 80,
      blockHeight: 88,
      pressingIntensity: 95,
      pressingCompactness: 85,
      defensiveWidth: 40,
      offsideTrap: 65,
      counterPressIntensity: 95,
      regroupPriority: 15,
      counterAttackIntensity: 75,
      transitionSpeed: 80,
      forwardRunFrequency: 75,
      restDefence: 35,
    }),
  },
  {
    key: 'DIRECT_COUNTER',
    label: '직선 역습',
    idea: '중원에 블록을 세워 빼앗은 뒤, 적은 패스로 빠르게 앞으로 보냅니다.',
    cost: '점유를 내주고 패스 성공률이 낮아 공격권을 자주 잃습니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 65,
      directness: 80,
      attackingWidth: 50,
      buildUpShortness: 25,
      passingRisk: 60,
      finalThirdPatience: 25,
      throughBallFrequency: 70,
      defensiveLine: 45,
      blockHeight: 45,
      pressingIntensity: 45,
      pressingCompactness: 75,
      defensiveWidth: 45,
      counterPressIntensity: 35,
      regroupPriority: 70,
      counterAttackIntensity: 85,
      transitionSpeed: 85,
      forwardRunFrequency: 65,
      restDefence: 55,
    }),
  },
  {
    key: 'LOW_BLOCK_COUNTER',
    label: '수비 블록 · 역습',
    idea: '깊고 좁게 서서 박스 앞을 잠그고, 빼앗으면 빠른 공격수에게 붙입니다.',
    cost: '영토와 점유를 모두 내줍니다. 상대 진영에서 시간을 보내지 못해 압박을 계속 받습니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 45,
      directness: 75,
      attackingWidth: 40,
      buildUpShortness: 25,
      passingRisk: 45,
      finalThirdPatience: 30,
      throughBallFrequency: 60,
      defensiveLine: 25,
      blockHeight: 25,
      pressingIntensity: 30,
      pressingCompactness: 90,
      defensiveWidth: 35,
      offsideTrap: 20,
      counterPressIntensity: 20,
      regroupPriority: 90,
      counterAttackIntensity: 90,
      transitionSpeed: 80,
      forwardRunFrequency: 45,
      restDefence: 75,
    }),
  },
  {
    key: 'WING_PLAY',
    label: '측면 공략',
    idea: '폭을 최대로 벌려 풀백을 올려 보내고, 박스 안으로 크로스를 넣습니다.',
    cost: '중앙이 비어 상대의 짧은 연계에 약하고, 올라간 풀백 뒤가 역습에 노출됩니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 60,
      directness: 55,
      attackingWidth: 90,
      buildUpShortness: 55,
      passingRisk: 50,
      finalThirdPatience: 45,
      crossFrequency: 85,
      throughBallFrequency: 35,
      overlapFrequency: 85,
      defensiveLine: 55,
      blockHeight: 55,
      pressingIntensity: 55,
      pressingCompactness: 45,
      defensiveWidth: 60,
      counterPressIntensity: 50,
      regroupPriority: 50,
      counterAttackIntensity: 50,
      transitionSpeed: 55,
      forwardRunFrequency: 70,
      restDefence: 40,
    }),
  },
  {
    key: 'DIRECT_TARGET',
    label: '롱볼 · 타깃맨',
    idea: '압박을 걷어내고 최전방에 붙여 세컨드 볼을 노립니다.',
    cost: '패스 성공률과 점유율이 크게 떨어지고, 제공권 싸움에서 밀리면 공격이 성립하지 않습니다.',
    params: withParams(DEFAULT_PARAMS, {
      tempo: 55,
      directness: 95,
      attackingWidth: 60,
      buildUpShortness: 10,
      passingRisk: 40,
      finalThirdPatience: 35,
      crossFrequency: 75,
      throughBallFrequency: 30,
      defensiveLine: 45,
      blockHeight: 50,
      pressingIntensity: 45,
      pressingCompactness: 60,
      defensiveWidth: 50,
      counterPressIntensity: 45,
      regroupPriority: 60,
      counterAttackIntensity: 55,
      transitionSpeed: 60,
      forwardRunFrequency: 55,
      restDefence: 55,
    }),
  },
  {
    key: 'MID_BLOCK_BALANCED',
    label: '중원 블록 · 균형',
    idea: '중간 높이에서 기다렸다가 상황에 맞게 공격합니다.',
    cost: '뚜렷한 강점이 없어, 한쪽에 특화된 상대에게 주도권을 넘길 수 있습니다.',
    params: { ...DEFAULT_PARAMS },
  },
]

export const ARCHETYPE_BY_KEY: Record<ArchetypeKey, Archetype> = ARCHETYPES.reduce(
  (map, item) => {
    map[item.key] = item
    return map
  },
  {} as Record<ArchetypeKey, Archetype>,
)

export function archetypeParams(key: ArchetypeKey): TacticalParams {
  return { ...(ARCHETYPE_BY_KEY[key]?.params ?? DEFAULT_PARAMS) }
}
