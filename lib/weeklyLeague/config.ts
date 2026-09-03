/**
 * 주간 리그·컵 대회 시스템의 중앙 설정.
 *
 * 요일·시각·대회 규칙을 여기 말고 다른 곳에 하드코딩하지 않는다. 스케줄러
 * (schedule.ts)·컵 진행기(cup.ts)·순위 계산(standings.ts)은 전부 이 파일의
 * 값만 읽는다 — 숫자를 바꿔야 하면 여기 한 곳만 고치면 된다.
 *
 * 기존 lib/league.ts · lib/cup.ts · lib/schedule.ts는 지금 라이브로 도는
 * 싱글플레이 시즌이 그대로 걸려 있어 건드리지 않는다. 이 대회 시스템은
 * 완전히 별도 네임스페이스(lib/weeklyLeague)로 추가된다.
 */

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export const DAYS_OF_WEEK: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export type SlotType = 'LEAGUE' | 'CUP_A' | 'CUP_B' | 'MASTERS_FINAL'
export type CupId = 'CUP_A' | 'CUP_B'
export type CupStage = 'R16' | 'QF' | 'SF' | 'FINAL'
export const CUP_STAGE_ORDER: CupStage[] = ['R16', 'QF', 'SF', 'FINAL']

export interface ScheduleSlotDef {
  day: DayOfWeek
  /** KST, 9~23. */
  hour: number
  type: SlotType
  cupId?: CupId
  cupStage?: CupStage
  /** 1 or 2 for two-legged rounds; absent for the single-leg final. */
  leg?: 1 | 2
}

const HOURS_09_23 = Array.from({ length: 15 }, (_, i) => i + 9)

const league = (day: DayOfWeek, hour: number): ScheduleSlotDef => ({ day, hour, type: 'LEAGUE' })
const cup = (
  day: DayOfWeek,
  hour: number,
  cupId: CupId,
  cupStage: CupStage,
  leg?: 1 | 2,
): ScheduleSlotDef => ({ day, hour, type: cupId, cupId, cupStage, leg })

/**
 * 105개 전역 슬롯, 요일·시각 순으로 미리 정렬돼 있다(schedule.ts가 다시
 * 정렬하지 않고 이 순서를 그대로 쓴다). 화~금요일은 14시·20시가 각각
 * Cup A·Cup B, 나머지 13개가 리그. 토요일은 스펙 표를 그대로 옮겼다.
 */
export const WEEKLY_SLOTS: ScheduleSlotDef[] = [
  // 월요일 — 컵 없음, 15경기 전부 리그.
  ...HOURS_09_23.map((hour) => league('MON', hour)),

  // 화요일 — Cup A/B 16강 1차전.
  ...HOURS_09_23.map((hour) =>
    hour === 14 ? cup('TUE', hour, 'CUP_A', 'R16', 1) : hour === 20 ? cup('TUE', hour, 'CUP_B', 'R16', 1) : league('TUE', hour),
  ),

  // 수요일 — Cup A/B 16강 2차전.
  ...HOURS_09_23.map((hour) =>
    hour === 14 ? cup('WED', hour, 'CUP_A', 'R16', 2) : hour === 20 ? cup('WED', hour, 'CUP_B', 'R16', 2) : league('WED', hour),
  ),

  // 목요일 — Cup A/B 8강 1차전.
  ...HOURS_09_23.map((hour) =>
    hour === 14 ? cup('THU', hour, 'CUP_A', 'QF', 1) : hour === 20 ? cup('THU', hour, 'CUP_B', 'QF', 1) : league('THU', hour),
  ),

  // 금요일 — Cup A/B 8강 2차전.
  ...HOURS_09_23.map((hour) =>
    hour === 14 ? cup('FRI', hour, 'CUP_A', 'QF', 2) : hour === 20 ? cup('FRI', hour, 'CUP_B', 'QF', 2) : league('FRI', hour),
  ),

  // 토요일 — 4강 1·2차전과 결승. 스펙 표를 그대로.
  cup('SAT', 9, 'CUP_A', 'SF', 1),
  league('SAT', 10),
  cup('SAT', 11, 'CUP_B', 'SF', 1),
  league('SAT', 12),
  cup('SAT', 13, 'CUP_A', 'SF', 2),
  league('SAT', 14),
  cup('SAT', 15, 'CUP_B', 'SF', 2),
  league('SAT', 16),
  league('SAT', 17),
  league('SAT', 18),
  league('SAT', 19),
  cup('SAT', 20, 'CUP_A', 'FINAL'),
  league('SAT', 21),
  league('SAT', 22),
  cup('SAT', 23, 'CUP_B', 'FINAL'),

  // 일요일 — 리그 14경기, 23시 Masters Final.
  ...HOURS_09_23.filter((hour) => hour <= 22).map((hour) => league('SUN', hour)),
  { day: 'SUN', hour: 23, type: 'MASTERS_FINAL' },
]

// ---------------------------------------------------------------------------
// 대회 규칙
// ---------------------------------------------------------------------------

export const CLUB_COUNT = 16

/**
 * 상대별 6경기(3홈·3원정)를 만드는 방법: "더블 라운드로빈"(한 바퀴 15라운드 +
 * 홈/원정 반전한 15라운드 = 상대당 1홈·1원정)을 3번 반복한다. 3 × 2 = 6.
 */
export const DOUBLE_ROUND_ROBIN_REPEATS = 3
export const ROUNDS_PER_SINGLE_CYCLE = CLUB_COUNT - 1 // 15
export const LEAGUE_ROUNDS = ROUNDS_PER_SINGLE_CYCLE * 2 * DOUBLE_ROUND_ROBIN_REPEATS // 90
export const MATCHES_PER_LEAGUE_ROUND = CLUB_COUNT / 2 // 8

export const POINTS = { win: 3, draw: 1, loss: 0 }

export const PROMOTION_SPOTS = 3
export const RELEGATION_SPOTS = 3

/**
 * 등급(디비전)별 리그 인스턴스당 실유저 상한. 실유저가 모자라도 등급별
 * 리그 자체는 유지하고 나머지 16 - n자리를 AI로 채운다 — 실유저가 다
 * 안 모일 때까지 리그 개설을 미루지 않는다.
 *
 * 인덱스 0이 최하위 등급. 사용자가 정한 값은 최하위 1명, 그 위 2명뿐이고
 * 더 위 등급의 상한은 아직 정해지지 않았다(null) — 리그 배정 알고리즘을
 * 만들 때 반드시 채워야 한다.
 */
export const TIER_MAX_REAL_USERS: (number | null)[] = [1, 2]

export const CUP_TEAMS = 16 // 조별리그 없이 16강부터, 리그와 같은 16개 구단.

export const CUP_SEEDING: Record<CupId, 'byLeagueRank' | 'random'> = {
  CUP_A: 'byLeagueRank',
  CUP_B: 'random',
}

/** 운영자가 바꿀 수 있는 표시용 이름. 내부 id(CUP_A 등)는 절대 안 바뀜. */
export const TOURNAMENT_NAMES: Record<CupId | 'MASTERS_FINAL', string> = {
  CUP_A: 'Cup A',
  CUP_B: 'Cup B',
  MASTERS_FINAL: 'Masters Final',
}

export const SQUAD_RULES = {
  starters: 11,
  bench: 9,
  maxSubsPerMatch: 5,
  /** 하프타임 교체는 여기 포함하지 않는다. */
  subWindows: 3,
}

/** 기존 프로젝트에 징계 규칙이 없어(검색으로 확인) 스펙의 기본값을 쓴다. */
export const DISCIPLINE_RULES = {
  yellowAccumulationThreshold: 4,
  yellowAccumulationBanMatches: 1,
  secondYellowBanMatches: 1,
  directRedBanRange: [1, 3] as [number, number],
}

export const KST_OFFSET_MINUTES = 9 * 60

/** UTC epoch ms → 그 시각의 KST 요일·시(0~23). 스케줄 슬롯과 맞춰볼 때 씀. */
export function toKst(utcMs: number): { day: DayOfWeek; hour: number; minute: number } {
  const kst = new Date(utcMs + KST_OFFSET_MINUTES * 60_000)
  const jsDay = kst.getUTCDay() // 0=Sun..6=Sat
  const day = DAYS_OF_WEEK[(jsDay + 6) % 7] // rotate so Monday is index 0
  return { day, hour: kst.getUTCHours(), minute: kst.getUTCMinutes() }
}
