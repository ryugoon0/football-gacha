// shared.js는 lib/weeklyLeagueServer.ts에서 만들어진 번들이라 타입이 없습니다.
// 여기서 쓰는 부분만 적어 둡니다. 값은 여전히 한 벌이고, 이 파일은 모양만 말합니다.

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type SlotType = 'OPENING_PLACEMENT' | 'LEAGUE' | 'CUP_A' | 'CUP_B' | 'MASTERS_FINAL'
export type CupStage = 'R16' | 'QF' | 'SF' | 'FINAL'

export interface GlobalSlot {
  index: number
  day: DayOfWeek
  hour: number
  type: SlotType
  cupId?: 'CUP_A' | 'CUP_B'
  cupStage?: CupStage
  leg?: 1 | 2
}

export interface PlacementFixtureDef {
  round: number
  slot: GlobalSlot
  home: string
  away: string
}

export interface TransitionSchedule {
  enabled: boolean
  cutoverAt: string
  firstMatchAt: string
  endsAt: string
  rounds: number
  rewardMultiplier: number
  promotionEnabled: boolean
  relegationEnabled: boolean
  cupEnabled: boolean
  resetTransitionEffects: boolean
}

export interface MemberInput {
  slot: number
  kind: 'user' | 'ai'
  userId: string | null
  clubName: string
  badge: string
  rating: number
}

export interface ScheduleSlotRow {
  index: number
  day: DayOfWeek
  hour: number
  type: SlotType
  cupStage: CupStage | null
  leg: 1 | 2 | null
  scheduledAtUtc: string
}

export interface LeagueFixtureRow {
  round: number
  homeSlot: number
  awaySlot: number
  scheduledAtUtc: string
}

export const CLUB_POOL: [name: string, badge: string][]
export const CLUB_COUNT: number
export const PLACEMENT_ROUNDS: number
export const TRANSITION_SCHEDULE: TransitionSchedule

export function buildPlacementSlots(): GlobalSlot[]

export function generatePlacementFixtures(clubIds: string[], slots?: GlobalSlot[]): PlacementFixtureDef[]

export function toPlacementScheduleSlotRows(slots: GlobalSlot[]): ScheduleSlotRow[]

export function toPlacementFixtureRows(
  fixtures: PlacementFixtureDef[],
  clubIdToSlot: Record<string, number>,
): LeagueFixtureRow[]
