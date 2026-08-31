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
}

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
  return { date, progress: { draw: 0, win: 0, train: 0 }, claimed: [], freeDrawUsed: false }
}

/** Returns a reset board when the saved one is from an earlier day. */
export function rollOver(daily: DailyState | undefined, today: string = todayKey()): DailyState {
  if (!daily || daily.date !== today) return freshDaily(today)
  return daily
}

export function missionDone(daily: DailyState, mission: MissionDef): boolean {
  return (daily.progress[mission.id] ?? 0) >= mission.target
}

export function missionClaimable(daily: DailyState, mission: MissionDef): boolean {
  return missionDone(daily, mission) && !daily.claimed.includes(mission.id)
}
