import { LIMITED_SCHEDULE } from './limited'
import { getSupabase } from './supabase'
import { HOT_TIME_HOURS_KST, KST_OFFSET_MINUTES, WEEKLY_SLOTS } from './weeklyLeague/config'

/**
 * 이벤트 캘린더 — everything with a date the manager might want to plan
 * around, for the next couple of weeks: the competitive league's fixed
 * rhythm (cups, finals, 핫타임), limited-card windows, and the operator's
 * prediction rounds. Derived from the same schedules the game runs on, so
 * it cannot drift from them; only prediction rounds come from the server.
 */

export type CalendarKind = 'league' | 'cup' | 'hot' | 'limited' | 'prediction' | 'reward'

export interface CalendarEvent {
  id: string
  kind: CalendarKind
  title: string
  note?: string
  /** UTC ms. */
  startMs: number
  /** UTC ms; equals startMs for a moment in time. */
  endMs: number
  /** Which game tab opens it. */
  tab?: 'weekly' | 'gacha' | 'minigames'
}

export const KIND_LABEL: Record<CalendarKind, string> = {
  league: '경쟁 리그',
  cup: '컵',
  hot: '핫타임',
  limited: '리미티드',
  prediction: '빅매치 예측',
  reward: '시즌 보상',
}

const DAY_MS = 86_400_000

/** Monday 00:00 KST of the week containing `nowMs`, as UTC ms. */
export function weekStartKst(nowMs: number): number {
  const kst = new Date(nowMs + KST_OFFSET_MINUTES * 60_000)
  const dow = (kst.getUTCDay() + 6) % 7 // Monday = 0
  const midnight = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - dow * DAY_MS
  return midnight - KST_OFFSET_MINUTES * 60_000
}

const DAY_INDEX = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 } as const

/** The competitive league's fixed weekly rhythm, laid over one week starting at `weekStartMs`. */
export function weeklyLeagueEvents(weekStartMs: number): CalendarEvent[] {
  const at = (day: keyof typeof DAY_INDEX, hour: number) => weekStartMs + DAY_INDEX[day] * DAY_MS + hour * 3_600_000
  const events: CalendarEvent[] = [
    { id: `w-${weekStartMs}-start`, kind: 'league', title: '주간 리그 시작', note: '월~일 매시 정각 킥오프, 15경기/일', startMs: at('MON', 9), endMs: at('MON', 9), tab: 'weekly' },
  ]
  // One entry per cup stage per day, not per slot: "화 14:00 Cup A 16강 1차전".
  const seen = new Set<string>()
  for (const slot of WEEKLY_SLOTS) {
    if (slot.type !== 'CUP_A' && slot.type !== 'CUP_B' && slot.type !== 'MASTERS_FINAL') continue
    const key = `${slot.day}-${slot.hour}-${slot.type}`
    if (seen.has(key)) continue
    seen.add(key)
    const stage = slot.cupStage ? { R16: '16강', QF: '8강', SF: '4강', FINAL: '결승' }[slot.cupStage] : ''
    const leg = slot.leg ? ` ${slot.leg}차전` : ''
    const name = slot.type === 'MASTERS_FINAL' ? 'Masters Final' : slot.type === 'CUP_A' ? 'Cup A' : 'Cup B'
    events.push({
      id: `w-${weekStartMs}-${key}`,
      kind: 'cup',
      title: `${name} ${stage}${leg}`.trim(),
      startMs: at(slot.day, slot.hour),
      endMs: at(slot.day, slot.hour),
      tab: 'weekly',
    })
  }
  for (const day of Object.keys(DAY_INDEX) as (keyof typeof DAY_INDEX)[]) {
    for (const hour of HOT_TIME_HOURS_KST) {
      events.push({ id: `w-${weekStartMs}-hot-${day}-${hour}`, kind: 'hot', title: '핫타임 킥오프', note: '지시 1개 이상이면 보너스 골드', startMs: at(day, hour), endMs: at(day, hour), tab: 'weekly' })
    }
  }
  events.push({ id: `w-${weekStartMs}-close`, kind: 'reward', title: '주간 시즌 마감 · 순위·컵·베스트 일레븐 보상', note: '마스터스 결승 정산 뒤 자동 지급', startMs: at('SUN', 23) + 20 * 60_000, endMs: at('SUN', 23) + 20 * 60_000, tab: 'weekly' })
  return events
}

export function limitedEvents(): CalendarEvent[] {
  return LIMITED_SCHEDULE.flatMap((batch) => [
    { id: `ltd-${batch.id}-tease`, kind: 'limited' as const, title: `리미티드 예고 · ${batch.label}`, note: batch.note, startMs: Date.parse(batch.teaseFrom), endMs: Date.parse(batch.teaseFrom), tab: 'gacha' as const },
    { id: `ltd-${batch.id}`, kind: 'limited' as const, title: `리미티드 · ${batch.label}`, note: '프리미엄 스카우트에서만', startMs: Date.parse(batch.from), endMs: Date.parse(batch.to), tab: 'gacha' as const },
  ])
}

export async function predictionEvents(): Promise<CalendarEvent[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('prediction_rounds')
    .select('id, title, closes_at, reward_gold, status')
    .order('closes_at', { ascending: false })
    .limit(6)
  if (error || !data) return []
  return (data as { id: number; title: string; closes_at: string; reward_gold: number; status: string }[]).map((row) => ({
    id: `pred-${row.id}`,
    kind: 'prediction',
    title: `${row.title} 마감`,
    note: row.status === 'settled' ? '정산 완료' : `전부 정답 ${row.reward_gold.toLocaleString('ko-KR')}G`,
    startMs: Date.parse(row.closes_at),
    endMs: Date.parse(row.closes_at),
    tab: 'minigames',
  }))
}

/**
 * Everything from the start of this week through `days` days ahead, sorted.
 * Past events of today are kept so the day reads whole; earlier days drop.
 */
export function upcoming(all: CalendarEvent[], nowMs: number, days = 14): CalendarEvent[] {
  const todayStart = nowMs - ((nowMs + KST_OFFSET_MINUTES * 60_000) % DAY_MS)
  const horizon = nowMs + days * DAY_MS
  return all
    .filter((event) => event.endMs >= todayStart && event.startMs <= horizon)
    .sort((a, b) => a.startMs - b.startMs || a.title.localeCompare(b.title, 'ko'))
}

/** All derived events for this week and the next. */
export function calendarEvents(nowMs: number): CalendarEvent[] {
  const start = weekStartKst(nowMs)
  return [...weeklyLeagueEvents(start), ...weeklyLeagueEvents(start + 7 * DAY_MS), ...limitedEvents()]
}

export function dayKeyKst(ms: number): string {
  const kst = new Date(ms + KST_OFFSET_MINUTES * 60_000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
}

export function dayLabelKst(ms: number): string {
  const kst = new Date(ms + KST_OFFSET_MINUTES * 60_000)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()]
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} (${dow})`
}

export function timeLabelKst(ms: number): string {
  const kst = new Date(ms + KST_OFFSET_MINUTES * 60_000)
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`
}
