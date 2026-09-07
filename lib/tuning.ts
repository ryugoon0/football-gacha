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
  weeklyDrainStarter: {
    label: '경쟁 리그 선발 체력 소모',
    note: '경쟁 리그 내 경기가 정산될 때마다 선발로 뛴 카드의 체력이 이만큼 줄어듭니다. 하루 15경기를 같은 11명으로 다 뛰면 이 값의 15배가 빠집니다.',
    default: 6,
    min: 0,
    max: 30,
    step: 1,
    group: '체력',
    integer: true,
  },
  weeklyDrainSub: {
    label: '경쟁 리그 교체 투입 체력 소모',
    note: '경기 중 교체로 들어온 카드가 잃는 체력입니다. 선발보다 적게 뜁니다.',
    default: 3,
    min: 0,
    max: 30,
    step: 1,
    group: '체력',
    integer: true,
  },
  weeklyRestRecover: {
    label: '경쟁 리그 휴식 체력 회복',
    note: '내 경기가 정산될 때 뛰지 않은 카드(벤치·보관함)가 회복하는 체력입니다. 로테이션을 돌리면 이 값으로 다시 채워집니다.',
    default: 8,
    min: 0,
    max: 50,
    step: 1,
    group: '체력',
    integer: true,
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
  weeklySeasonRank1: {
    label: '경쟁 리그 주간 우승 보상',
    note: '한 주 리그가 끝났을 때 1위 감독이 받는 골드(0등급 기준). 등급 배율과 경쟁 리그 배율이 곱해집니다.',
    default: 30000,
    min: 0,
    max: 200000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  weeklySeasonRank2: {
    label: '경쟁 리그 주간 2위 보상',
    note: '한 주 리그 2위 감독이 받는 골드(0등급 기준).',
    default: 18000,
    min: 0,
    max: 200000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  weeklySeasonRank3: {
    label: '경쟁 리그 주간 3위 보상',
    note: '한 주 리그 3위 감독이 받는 골드(0등급 기준).',
    default: 12000,
    min: 0,
    max: 200000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  weeklySeasonRank4to8: {
    label: '경쟁 리그 주간 4~8위 보상',
    note: '한 주 리그 4~8위 감독이 받는 골드(0등급 기준).',
    default: 6000,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  weeklySeasonRank9to13: {
    label: '경쟁 리그 주간 9~13위 보상',
    note: '한 주 리그 9~13위 감독이 받는 골드(0등급 기준).',
    default: 3000,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  weeklySeasonRank14to16: {
    label: '경쟁 리그 주간 14~16위 보상',
    note: '한 주 리그 14~16위(강등권) 감독이 받는 골드(0등급 기준). 끝까지 경기를 채운 데 대한 위로금입니다.',
    default: 1500,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  weeklyCupWinner: {
    label: '경쟁 리그 컵 우승 보상',
    note: 'Cup A·Cup B 결승에서 이긴 감독이 받는 골드(0등급 기준). 컵마다 따로 받습니다.',
    default: 12000,
    min: 0,
    max: 200000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  weeklyCupRunnerUp: {
    label: '경쟁 리그 컵 준우승 보상',
    note: 'Cup A·Cup B 결승에서 진 감독이 받는 골드(0등급 기준).',
    default: 5000,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  weeklyMastersWinner: {
    label: '경쟁 리그 마스터스 우승 보상',
    note: '일요일 밤 두 컵 우승 팀이 맞붙는 결승에서 이긴 감독이 받는 골드(0등급 기준).',
    default: 15000,
    min: 0,
    max: 200000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  weeklyBestElevenBonus: {
    label: '베스트 일레븐 선수 1명당 보상',
    note: '한 주 베스트 일레븐에 내 선수가 한 명 들어갈 때마다 받는 골드(0등급 기준). 열한 명 다 내 선수면 열한 번 받습니다.',
    default: 2500,
    min: 0,
    max: 50000,
    step: 500,
    group: '보상',
    integer: true,
  },
  weeklyIndividualAward: {
    label: '득점왕·도움왕·MVP왕 보상',
    note: '한 주 득점왕·도움왕·MVP 최다 선수를 보유한 감독이 각각 받는 골드(0등급 기준).',
    default: 4000,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  albumClubGold: {
    label: '앨범 클럽 완성 보상 골드',
    note: '한 클럽의 현 시즌 카드를 11장 이상 모아 앨범을 완성하면 받는 골드입니다. 클럽마다 한 번.',
    default: 5000,
    min: 0,
    max: 100000,
    step: 500,
    group: '보상',
    integer: true,
  },
  albumLeagueGold: {
    label: '앨범 리그 완성 보상 골드',
    note: '한 리그의 모든 클럽 앨범을 완성하면 받는 골드입니다. 리그마다 한 번.',
    default: 20000,
    min: 0,
    max: 500000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  albumLeagueTickets: {
    label: '앨범 리그 완성 프리미엄 티켓',
    note: '한 리그의 모든 클럽 앨범을 완성하면 골드와 함께 받는 프리미엄 스카우트 티켓 장수입니다.',
    default: 3,
    min: 0,
    max: 20,
    step: 1,
    group: '보상',
    integer: true,
  },
  albumSpecialGold: {
    label: '앨범 특별 묶음 완성 보상 골드',
    note: '월드 배치·리미티드 주차 같은 특별 묶음의 카드를 전부 모으면 받는 골드입니다.',
    default: 10000,
    min: 0,
    max: 500000,
    step: 1000,
    group: '보상',
    integer: true,
  },
  albumSpecialTickets: {
    label: '앨범 특별 묶음 완성 프리미엄 티켓',
    note: '특별 묶음을 전부 모으면 골드와 함께 받는 프리미엄 스카우트 티켓 장수입니다.',
    default: 2,
    min: 0,
    max: 20,
    step: 1,
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
  premiumRateWorld: {
    label: '프리미엄 스카우트 · 월드 확률(%)',
    note: '프리미엄(리미티드) 스카우트에서 월드 카드가 나올 확률입니다. 일반 스카우트에서는 나오지 않습니다.',
    default: 0.3,
    min: 0,
    max: 5,
    step: 0.05,
    group: '스카우트',
  },
  worldShardCost: {
    label: '월드 스카우트 1회 · 조각 가격',
    note: '조각으로 월드 스카우트팩을 열 때 값입니다(선물·월드 3장 합성 외의 유일한 구매 경로).',
    default: 600,
    min: 1,
    max: 5000,
    step: 10,
    group: '스카우트',
    integer: true,
  },
  premiumRateLimited: {
    label: '리미티드 스카우트 · 리미티드 확률(%)',
    note: '리미티드 카드가 열려 있는 동안 프리미엄 스카우트가 리미티드 스카우트로 바뀌고, 이 확률만큼 리미티드 카드가 나옵니다. 그만큼 일반·실버·골드가 비율대로 줄고 플래티넘은 그대로입니다.',
    default: 7,
    min: 0,
    max: 40,
    step: 0.5,
    group: '스카우트',
  },
  worldRateWorld: {
    label: '월드 스카우트 · 월드 확률(%)',
    note: '월드 스카우트팩(선물·월드 3장 합성)에서 월드 카드가 나올 확률입니다. 나머지는 플래티넘입니다. 월드 카드는 이 팩에서만 나옵니다.',
    default: 10,
    min: 0,
    max: 100,
    step: 1,
    group: '스카우트',
  },
  premiumShardCost: {
    label: '프리미엄 스카우트 1회 · 조각 가격',
    note: '조각으로 프리미엄 스카우트를 살 때 한 장 값입니다. 10연속은 이 값의 9배입니다.',
    default: 80,
    min: 1,
    max: 2000,
    step: 5,
    group: '스카우트',
    integer: true,
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
