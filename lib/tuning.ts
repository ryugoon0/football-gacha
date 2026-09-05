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
  group: '경기' | '체력' | '비용' | '하루' | '보상' | '스카우트' | '합성'
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
    group: '보상',
  },
  casualMatchDailyLimit: {
    label: '캐주얼 모드 하루 경기 수 (안전망)',
    note: '실제 "하루 1시즌" 제한은 시즌이 끝나면 그날 잠기는 규칙(lib/daily.ts의 casualModeLocked)이 맡습니다 — 컵 성적에 따라 한 시즌의 실제 경기 수가 19~23판으로 들쭉날쭉해서 고정 판수로는 정확히 못 맞춥니다. 이 값은 시즌이 어떤 이유로든 안 끝날 때를 대비한 상한선이라 넉넉하게 잡았습니다.',
    default: 40,
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
    group: '보상',
  },
  competitiveGoldMultiplier: {
    label: '경쟁 리그 보상 배율',
    note: '경쟁 리그 경기 골드 보상 전체에 곱하는 배율입니다. 등급별 차등은 아래 등급 배율로 따로 곱해집니다. 캐주얼 모드가 하루 1시즌으로 묶인 만큼, 경쟁 리그가 그 자리를 대신하도록 기본값을 1.5로 두었습니다.',
    default: 1.5,
    min: 0,
    max: 3,
    step: 0.05,
    group: '보상',
  },
  weeklyTierMultiplier0: {
    label: '경쟁 리그 0등급(최상위) 보상 배율',
    note: '0등급 경기 보상에 곱합니다. 같은 승리라도 윗 등급이 더 받도록 등급별로 차등을 둡니다.',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: '보상',
  },
  weeklyTierMultiplier1: {
    label: '경쟁 리그 1등급 보상 배율',
    note: '1등급 경기 보상에 곱합니다.',
    default: 0.85,
    min: 0,
    max: 2,
    step: 0.05,
    group: '보상',
  },
  weeklyTierMultiplier2: {
    label: '경쟁 리그 2등급 보상 배율',
    note: '2등급 경기 보상에 곱합니다.',
    default: 0.7,
    min: 0,
    max: 2,
    step: 0.05,
    group: '보상',
  },
  weeklyTierMultiplier3: {
    label: '경쟁 리그 3등급(최하위) 보상 배율',
    note: '3등급 경기 보상에 곱합니다.',
    default: 0.55,
    min: 0,
    max: 2,
    step: 0.05,
    group: '보상',
  },
  hotTimeBonus: {
    label: '핫타임 개입 보너스',
    note: '15시·21시(KST) 킥오프 경기에서 참가 감독이 라이브 창 안에 지시를 하나라도 보내면 받는 보너스 골드입니다. 관전만으로는 받지 못합니다.',
    default: 1000,
    min: 0,
    max: 10000,
    step: 100,
    group: '보상',
    integer: true,
  },
  pvpDailyLimit: {
    label: '데일리 PvP 하루 도전 횟수',
    note: '도전을 건 쪽에서만 소모됩니다 — 도전을 받는 쪽은 자기 한도를 쓰지 않습니다.',
    default: 3,
    min: 1,
    max: 20,
    step: 1,
    group: '하루',
    integer: true,
  },
  pvpGoldMultiplier: {
    label: '데일리 PvP 보상 배율',
    note: '데일리 PvP 승리 골드 보상에 곱할 배율입니다. 캐주얼 모드 보상 배율과 별개입니다.',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
    group: '보상',
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
  // 스카우트 확률 (%) — 등급별로 실버·골드·플래티넘·월드만 두고 일반은 100에서 나머지를
  // 뺀 값이 된다. 그래서 어떻게 움직여도 합이 100이다. 뽑기 서버(draw-pack)도 같은
  // game_config를 읽어 같은 표로 뽑는다.
  basicRateRare: {
    label: '일반 스카우트 · 실버 확률(%)',
    note: '나머지가 일반 확률이 됩니다.',
    default: 29.95,
    min: 0,
    max: 60,
    step: 0.05,
    group: '스카우트',
  },
  basicRateGold: {
    label: '일반 스카우트 · 골드 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 1.5,
    min: 0,
    max: 20,
    step: 0.05,
    group: '스카우트',
  },
  basicRateLive: {
    label: '일반 스카우트 · 플래티넘 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 0.4,
    min: 0,
    max: 10,
    step: 0.05,
    group: '스카우트',
  },
  basicRateLegend: {
    label: '일반 스카우트 · 월드 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 0.15,
    min: 0,
    max: 5,
    step: 0.05,
    group: '스카우트',
  },
  premiumRateRare: {
    label: '프리미엄 스카우트 · 실버 확률(%)',
    note: '나머지가 일반 확률이 됩니다.',
    default: 48,
    min: 0,
    max: 80,
    step: 0.5,
    group: '스카우트',
  },
  premiumRateGold: {
    label: '프리미엄 스카우트 · 골드 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 16,
    min: 0,
    max: 60,
    step: 0.5,
    group: '스카우트',
  },
  premiumRateLive: {
    label: '프리미엄 스카우트 · 플래티넘 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 7,
    min: 0,
    max: 40,
    step: 0.5,
    group: '스카우트',
  },
  premiumRateLegend: {
    label: '프리미엄 스카우트 · 월드 확률(%)',
    note: '한 장을 뽑을 때 이 등급이 나올 확률(%)입니다.',
    default: 3,
    min: 0,
    max: 20,
    step: 0.5,
    group: '스카우트',
  },
  // 승급 합성에 드는 같은 등급 카드 장수. 유저에게는 지금 보이지 않는 기능이라
  // 운영자가 값을 잡아 두고 나중에 다시 열 때 쓴다.
  fusionSizeNormal: {
    label: '합성 장수 · 일반 → 실버',
    note: '일반 카드 몇 장으로 실버 1장을 만들지.',
    default: 3,
    min: 2,
    max: 20,
    step: 1,
    group: '합성',
    integer: true,
  },
  fusionSizeRare: {
    label: '합성 장수 · 실버 → 골드',
    note: '이 등급 카드 몇 장으로 한 단계 위 카드 1장을 만들지.',
    default: 3,
    min: 2,
    max: 20,
    step: 1,
    group: '합성',
    integer: true,
  },
  fusionSizeGold: {
    label: '합성 장수 · 골드 → 플래티넘',
    note: '이 등급 카드 몇 장으로 한 단계 위 카드 1장을 만들지.',
    default: 3,
    min: 2,
    max: 20,
    step: 1,
    group: '합성',
    integer: true,
  },
  fusionSizeLive: {
    label: '합성 장수 · 플래티넘 → 월드',
    note: '이 등급 카드 몇 장으로 한 단계 위 카드 1장을 만들지.',
    default: 3,
    min: 2,
    max: 20,
    step: 1,
    group: '합성',
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
