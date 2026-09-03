import { KNOBS, tune } from './tuning'
export type MissionId = 'draw' | 'win' | 'train'

export interface MissionDef {
  id: MissionId
  label: string
  hint: string
  target: number
  reward: number
}

export const DAILY_MISSIONS: MissionDef[] = [
  { id: 'draw', label: '카드 10장 뽑기', hint: '10연차 한 번이면 끝납니다', target: 10, reward: 400 },
  { id: 'win', label: '리그 경기 2승', hint: '경기 탭에서 승리하세요', target: 2, reward: 600 },
  { id: 'train', label: '선수 2회 강화', hint: '선수단 탭에서 강화하세요', target: 2, reward: 300 },
]

export interface DailyState {
  date: string
  progress: Record<MissionId, number>
  claimed: MissionId[]
  freeDrawUsed: boolean
  /** Friendlies played today. Capped, and reset at the player's midnight. */
  miniGames: number
  /** Items bought today, by id. Only items with a daily limit appear here. */
  shopBuys: Record<string, number>
  /** Extra friendlies bought with tickets today. */
  extraFriendlies: number
  /**
   * Casual-mode league and cup matches played today — a season's worth of
   * gold is the cap, so unlimited casual play cannot out-earn the weekly
   * competitive league. Friendlies have their own separate counter above.
   */
  casualMatches: number
}

/** Friendlies a manager may play in one day. */
export const MINI_GAME_LIMIT = KNOBS.miniGameLimit.default

/** Local calendar day, so the reset happens at the player's midnight. */
export function todayKey(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Key that changes once a week, used to rotate the featured player. */
export function weekKey(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const dayOfMonth = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${dayOfMonth}`
}

export function freshDaily(date: string = todayKey()): DailyState {
  return {
    date,
    progress: { draw: 0, win: 0, train: 0 },
    claimed: [],
    freeDrawUsed: false,
    miniGames: 0,
    shopBuys: {},
    extraFriendlies: 0,
    casualMatches: 0,
  }
}

/** Returns a reset board when the saved one is from an earlier day. */
export function rollOver(daily: DailyState | undefined, today: string = todayKey()): DailyState {
  if (!daily || daily.date !== today) return freshDaily(today)
  // Saves from before these counters existed have neither — identity is kept
  // when nothing needs backfilling, so an unchanged day is a no-op re-render.
  if (daily.miniGames !== undefined && daily.casualMatches !== undefined) return daily
  return {
    ...daily,
    miniGames: daily.miniGames ?? 0,
    casualMatches: daily.casualMatches ?? 0,
  }
}

export function miniGamesLeft(daily: DailyState): number {
  const allowance = tune('miniGameLimit') + (daily.extraFriendlies ?? 0)
  return Math.max(0, allowance - (daily.miniGames ?? 0))
}

/** League and cup matches left today — a season's worth, once a day. */
export function casualMatchesLeft(daily: DailyState): number {
  return Math.max(0, tune('casualMatchDailyLimit') - (daily.casualMatches ?? 0))
}

export function missionDone(daily: DailyState, mission: MissionDef): boolean {
  return (daily.progress[mission.id] ?? 0) >= mission.target
}

export function missionClaimable(daily: DailyState, mission: MissionDef): boolean {
  return missionDone(daily, mission) && !daily.claimed.includes(mission.id)
}
