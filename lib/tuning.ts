/**
 * The dials an operator can turn without a developer.
 *
 * Only values the browser alone uses live here. Anything the server owns —
 * pack odds, pack prices, the pity limit — is deliberately absent: those are
 * bundled into the Edge Function so that the published odds can be proved, and
 * a copy in the database would just be a second truth that quietly disagrees.
 * Changing those still means a code change and a function deploy.
 *
 * Every knob has a floor and a ceiling. A tool that lets one typo brick the
 * game is worse than no tool, so the bounds are enforced on the server too.
 */

export interface Knob {
  label: string
  /** What turning it up actually does, in a sentence. */
  note: string
  default: number
  min: number
  max: number
  step: number
  group: '경기' | '체력' | '비용' | '하루'
  /** Whole numbers only — gold amounts, counts. */
  integer?: boolean
}

export const KNOBS = {
  staminaDrain: {
    label: '체력 저하율',
    note: '경기 중 체력이 닳는 속도. 올리면 후반에 지친 선수가 늘고 교체가 중요해집니다.',
    default: 0.65,
    min: 0.1,
    max: 2,
    step: 0.05,
    group: '체력',
  },
  keeperDrain: {
    label: '골키퍼 체력 저하율',
    note: '골키퍼는 덜 뛰므로 보통 필드 선수보다 낮게 둡니다.',
    default: 0.2,
    min: 0,
    max: 1,
    step: 0.05,
    group: '체력',
  },
  liveTired: {
    label: '경기 중 지침 기준',
    note: '경기 중 체력이 이 아래로 내려간 선수를 지친 것으로 봅니다.',
    default: 55,
    min: 10,
    max: 90,
    step: 5,
    group: '체력',
    integer: true,
  },
  tiredCondition: {
    label: '경기 전 지침 기준',
    note: '컨디션이 이 아래면 경기력이 떨어지고 경고가 뜹니다.',
    default: 60,
    min: 10,
    max: 95,
    step: 5,
    group: '체력',
    integer: true,
  },
  tiredSubThreshold: {
    label: '자동 교체 기준',
    note: '컨디션이 이 아래인 선발을 킥오프 전에 자동으로 뺍니다.',
    default: 45,
    min: 0,
    max: 90,
    step: 5,
    group: '체력',
    integer: true,
  },
  homeAdvantage: {
    label: '홈 이점',
    note: '홈 팀 전력에 더해지는 값. 올리면 원정이 어려워집니다.',
    default: 3,
    min: 0,
    max: 15,
    step: 1,
    group: '경기',
    integer: true,
  },
  subLimit: {
    label: '경기당 교체 인원',
    note: '한 경기에서 바꿀 수 있는 선수 수. 자동 교체와 직접 교체를 합쳐서 셉니다.',
    default: 5,
    min: 0,
    max: 11,
    step: 1,
    group: '경기',
    integer: true,
  },
  outOfPositionFactor: {
    label: '포지션 불일치 계수',
    note: '자리에 맞지 않는 선수가 잃는 능력치 비율. 낮출수록 크게 깎입니다.',
    default: 0.55,
    min: 0.1,
    max: 1,
    step: 0.05,
    group: '경기',
  },
  miniGameLimit: {
    label: '하루 친선 경기 수',
    note: '하루에 칠 수 있는 미니게임 판수입니다.',
    default: 10,
    min: 0,
    max: 50,
    step: 1,
    group: '하루',
    integer: true,
  },
  miniGameReward: {
    label: '친선 경기 보상 배율',
    note: '리그 경기 보상 대비 비율. 1이면 리그와 같습니다.',
    default: 0.4,
    min: 0,
    max: 1,
    step: 0.05,
    group: '하루',
  },
  casualMatchDailyLimit: {
    label: '캐주얼 모드 하루 경기 수',
    note: '캐주얼 모드(리그·컵) 경기를 하루에 진행할 수 있는 판수. 친선 경기와는 별도로 셉니다.',
    default: 20,
    min: 1,
    max: 90,
    step: 1,
    group: '하루',
    integer: true,
  },
  casualGoldMultiplier: {
    label: '캐주얼 모드 보상 배율',
    note: '캐주얼 모드(리그·컵·친선) 경기 골드 보상 전체에 곱해지는 배율입니다.',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: '하루',
  },
  competitiveGoldMultiplier: {
    label: '경쟁 리그 보상 배율',
    note: '주간리그 경기 골드 보상에 곱할 배율입니다. 지금은 주간리그가 골드를 지급하지 않아 대기 중입니다 — 지급 로직이 생기면 바로 씁니다.',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: '하루',
  },
  recoveryCostPerPoint: {
    label: '체력 회복 비용',
    note: '컨디션 1당 드는 골드입니다.',
    default: 8,
    min: 0,
    max: 200,
    step: 1,
    group: '비용',
    integer: true,
  },
  treatmentCostPerMatch: {
    label: '부상 치료 비용',
    note: '남은 결장 경기 1판당 드는 골드입니다.',
    default: 450,
    min: 0,
    max: 20000,
    step: 50,
    group: '비용',
    integer: true,
  },
  refreshCost: {
    label: '이적시장 갱신 비용',
    note: '매물 목록을 새로 뽑는 데 드는 골드입니다.',
    default: 300,
    min: 0,
    max: 20000,
    step: 50,
    group: '비용',
    integer: true,
  },
  fusionFee: {
    label: '승급 합성 수수료',
    note: '합성 한 번에 드는 골드입니다.',
    default: 500,
    min: 0,
    max: 50000,
    step: 50,
    group: '비용',
    integer: true,
  },
} as const satisfies Record<string, Knob>

export type KnobKey = keyof typeof KNOBS
export const KNOB_KEYS = Object.keys(KNOBS) as KnobKey[]

/** Keeps a value inside its knob's bounds, and whole if the knob is a count. */
export function clampKnob(key: KnobKey, value: number): number {
  const knob: Knob = KNOBS[key]
  if (!Number.isFinite(value)) return knob.default
  const held = Math.min(Math.max(value, knob.min), knob.max)
  return knob.integer ? Math.round(held) : held
}

/**
 * Values the operator has changed.
 *
 * Set once while the game is starting, before any match is simulated. Reading
 * it is a plain lookup, so a match played with the same settings still plays
 * out the same way every time.
 */
let overrides: Partial<Record<KnobKey, number>> = {}

export function setTuning(next: Partial<Record<string, number>>): void {
  const clean: Partial<Record<KnobKey, number>> = {}
  for (const key of KNOB_KEYS) {
    const value = next[key]
    if (typeof value === 'number') clean[key] = clampKnob(key, value)
  }
  overrides = clean
}

export function resetTuning(): void {
  overrides = {}
}

export function tune(key: KnobKey): number {
  return overrides[key] ?? KNOBS[key].default
}

/** Everything currently in force, defaults included. */
export function currentTuning(): Record<KnobKey, number> {
  return Object.fromEntries(KNOB_KEYS.map((key) => [key, tune(key)])) as Record<KnobKey, number>
}
