/**
 * Phase 1의 순수 함수 출력(GlobalSlot·LeagueFixtureDef·CupBracket)을 Phase 2
 * DB RPC(supabase/migrations/20260904000000_weekly_tournament.sql)가 기대하는
 * JSONB 모양으로 바꾼다. 여기도 순수 함수만 있다 — 실제 Supabase 호출은
 * 다음 단계(Edge Function)의 몫이다.
 */
import { DAYS_OF_WEEK, KST_OFFSET_MINUTES, PLACEMENT_DAYS, TRANSITION_SCHEDULE, type DayOfWeek } from './config'
import type { CupFixtureDef } from './cup'
import type { PlacementFixtureDef } from './placement'
import type { GlobalSlot, LeagueFixtureDef } from './schedule'

/** 그 주의 "월요일 00:00 KST" 순간의 UTC epoch ms. */
export function weekStartUtcMs(mondayKstDate: { year: number; month: number; day: number }): number {
  // Date.UTC로 KST 자정을 만들고, KST가 UTC보다 앞서 있으니 그만큼 빼서 UTC로 되돌린다.
  const localMidnightAsUtc = Date.UTC(mondayKstDate.year, mondayKstDate.month - 1, mondayKstDate.day)
  return localMidnightAsUtc - KST_OFFSET_MINUTES * 60_000
}

function slotUtcMs(weekStart: number, day: DayOfWeek, hour: number): number {
  const dayOffset = DAYS_OF_WEEK.indexOf(day)
  return weekStart + dayOffset * 86_400_000 + hour * 3_600_000
}

export interface ScheduleSlotRow {
  index: number
  day: DayOfWeek
  hour: number
  type: GlobalSlot['type']
  cupStage: GlobalSlot['cupStage'] | null
  leg: GlobalSlot['leg'] | null
  scheduledAtUtc: string
}

/** seed_weekly_schedule_slots(p_week_id, p_slots)의 p_slots. */
export function toScheduleSlotRows(weekStart: number, slots: GlobalSlot[]): ScheduleSlotRow[] {
  return slots.map((slot) => ({
    index: slot.index,
    day: slot.day,
    hour: slot.hour,
    type: slot.type,
    cupStage: slot.cupStage ?? null,
    leg: slot.leg ?? null,
    scheduledAtUtc: new Date(slotUtcMs(weekStart, slot.day, slot.hour)).toISOString(),
  }))
}

export interface MemberInput {
  slot: number
  kind: 'user' | 'ai'
  userId: string | null
  clubName: string
  badge: string
  rating: number
}

/** create_weekly_league_group(p_tier, p_week_id, p_members)의 p_members. */
export function toMemberRows(members: MemberInput[]): MemberInput[] {
  if (members.length !== 16) throw new Error(`toMemberRows: expected 16 members, got ${members.length}`)
  if (new Set(members.map((m) => m.slot)).size !== 16) throw new Error('toMemberRows: duplicate slot')
  return members
}

export interface LeagueFixtureRow {
  round: number
  homeSlot: number
  awaySlot: number
  scheduledAtUtc: string
}

/**
 * seed_league_fixtures(p_group_id, p_competition_id, p_fixtures)의 p_fixtures.
 * clubIdToSlot은 lib/weeklyLeague/schedule.ts가 만든 대진의 club id를 그 그룹
 * 안의 slot 번호(0~15)로 바꾼다.
 */
export function toLeagueFixtureRows(
  weekStart: number,
  fixtures: LeagueFixtureDef[],
  clubIdToSlot: Record<string, number>,
): LeagueFixtureRow[] {
  return fixtures.map((f) => {
    const homeSlot = clubIdToSlot[f.home]
    const awaySlot = clubIdToSlot[f.away]
    if (homeSlot === undefined || awaySlot === undefined) {
      throw new Error(`toLeagueFixtureRows: unknown club id in fixture (${f.home} vs ${f.away})`)
    }
    return {
      round: f.round,
      homeSlot,
      awaySlot,
      scheduledAtUtc: new Date(slotUtcMs(weekStart, f.slot.day, f.slot.hour)).toISOString(),
    }
  })
}

export interface CupStageTieRow {
  homeSlot: number
  awaySlot: number
  leg1ScheduledAtUtc: string
  /** 결승(단판)이면 없음. */
  leg2ScheduledAtUtc?: string
}

/**
 * seed_cup_stage_ties(p_group_id, p_competition_id, p_stage, p_ties)의
 * p_ties. cupFixtures는 그 스테이지의 fixturesForCurrentStage() 결과(leg 1만,
 * 또는 결승이면 leg null인 한 장) — leg 2 시각은 슬롯 표에서 그 컵·스테이지의
 * 두 번째 slot을 직접 찾아서 채운다.
 */
export function toCupStageTieRows(
  weekStart: number,
  cupId: 'CUP_A' | 'CUP_B',
  cupFixtures: CupFixtureDef[],
  clubIdToSlot: Record<string, number>,
  slots: GlobalSlot[],
): CupStageTieRow[] {
  const byTie = new Map<string, CupFixtureDef>()
  for (const f of cupFixtures) byTie.set(f.tieId, f)

  return Array.from(byTie.values()).map((f) => {
    const homeSlot = clubIdToSlot[f.home]
    const awaySlot = clubIdToSlot[f.away]
    if (homeSlot === undefined || awaySlot === undefined) {
      throw new Error(`toCupStageTieRows: unknown club id in tie ${f.tieId}`)
    }
    const stageSlots = slots.filter((s) => s.type === cupId && s.cupStage === f.stage)
    const leg1Slot = f.leg === null ? stageSlots[0] : stageSlots.find((s) => s.leg === 1)
    const leg2Slot = f.leg === null ? undefined : stageSlots.find((s) => s.leg === 2)
    if (!leg1Slot) throw new Error(`toCupStageTieRows: no schedule slot for stage ${f.stage}`)

    const row: CupStageTieRow = {
      homeSlot,
      awaySlot,
      leg1ScheduledAtUtc: new Date(slotUtcMs(weekStart, leg1Slot.day, leg1Slot.hour)).toISOString(),
    }
    if (leg2Slot) row.leg2ScheduledAtUtc = new Date(slotUtcMs(weekStart, leg2Slot.day, leg2Slot.hour)).toISOString()
    return row
  })
}

// ---------------------------------------------------------------------------
// 개막 배치 리그 — 상대 시각("오늘"·"내일")이 아니라 config.ts의
// TRANSITION_SCHEDULE.firstMatchAt(절대 ISO 시각, +09:00 오프셋 포함)을
// 그대로 앵커로 쓴다. new Date(...)가 오프셋을 해석하므로 이 값이 서버가
// 어느 타임존에서 도는지와 무관하게 항상 같은 UTC 순간을 가리킨다.
// ---------------------------------------------------------------------------

function placementSlotUtcMs(day: DayOfWeek, hour: number): number {
  const dayOffset = PLACEMENT_DAYS.indexOf(day)
  if (dayOffset < 0) throw new Error(`placementSlotUtcMs: ${day} is not one of ${PLACEMENT_DAYS.join(', ')}`)
  const firstMatchUtc = new Date(TRANSITION_SCHEDULE.firstMatchAt).getTime()
  // firstMatchAt is itself 09:00 KST on the first placement day, so only the
  // day offset and the hour-past-09 need adding.
  return firstMatchUtc + dayOffset * 86_400_000 + (hour - 9) * 3_600_000
}

/** seed_weekly_schedule_slots에 넘길 수 있는 모양이지만 week_id는 배치 리그 전용 값을 쓴다. */
export function toPlacementScheduleSlotRows(slots: GlobalSlot[]): ScheduleSlotRow[] {
  return slots.map((slot) => ({
    index: slot.index,
    day: slot.day,
    hour: slot.hour,
    type: slot.type,
    cupStage: slot.cupStage ?? null,
    leg: slot.leg ?? null,
    scheduledAtUtc: new Date(placementSlotUtcMs(slot.day, slot.hour)).toISOString(),
  }))
}

/** seed_league_fixtures와 같은 모양 — round 0~44, 배치 리그 전용. */
export function toPlacementFixtureRows(
  fixtures: PlacementFixtureDef[],
  clubIdToSlot: Record<string, number>,
): LeagueFixtureRow[] {
  return fixtures.map((f) => {
    const homeSlot = clubIdToSlot[f.home]
    const awaySlot = clubIdToSlot[f.away]
    if (homeSlot === undefined || awaySlot === undefined) {
      throw new Error(`toPlacementFixtureRows: unknown club id in fixture (${f.home} vs ${f.away})`)
    }
    return {
      round: f.round,
      homeSlot,
      awaySlot,
      scheduledAtUtc: new Date(placementSlotUtcMs(f.slot.day, f.slot.hour)).toISOString(),
    }
  })
}
