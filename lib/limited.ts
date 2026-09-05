import { PLAYERS } from './players'
import type { PlayerDef } from './types'

/**
 * 리미티드 카드 — a limited-edition card kind: the men of the match of one
 * week, issued with that week's numbers and drawn from 프리미엄 스카우트 for one
 * week only. Not a grade (the grade is 플래티넘, type `Live`); a card carries
 * `limited` with its window and story. Owned copies stay after the window;
 * only the pull pool forgets them.
 *
 * The schedule below is the announcement: the game shows a teaser from
 * `teaseFrom`, the cards themselves from `from` to `to`. Cards for a batch
 * live in data/limited/<id>.json and reference the batch by `label`.
 * docs/LIMITED_CARDS_PLAN.md
 */
export interface LimitedBatch {
  id: string
  /** Shown to players: 「9월 1주 MOM」. Cards of the batch carry the same label. */
  label: string
  /** What the batch is about, one line for the teaser. */
  note: string
  teaseFrom: string
  from: string
  to: string
}

export const LIMITED_SCHEDULE: LimitedBatch[] = [
  {
    id: '2026-w37',
    label: '9월 1주 MOM',
    note: '9월 1일~7일 실제 경기의 맨 오브 더 매치들이 그 주 활약 능력치의 리미티드 카드로 나옵니다. 9월 8일(화) 오후 2시부터 일주일만 프리미엄 스카우트에서.',
    teaseFrom: '2026-09-06T00:00:00+09:00',
    from: '2026-09-08T14:00:00+09:00',
    to: '2026-09-15T13:59:59+09:00',
  },
]

const ms = (iso: string) => Date.parse(iso)

/** Whether a card's window is open now. Cards without `limited` are always open. */
export function limitedOpen(player: PlayerDef, nowMs: number): boolean {
  if (!player.limited) return true
  return nowMs >= ms(player.limited.from) && nowMs <= ms(player.limited.to)
}

export type LimitedPhase =
  | { phase: 'none' }
  | { phase: 'teaser'; batch: LimitedBatch; opensInMs: number }
  | { phase: 'active'; batch: LimitedBatch; closesInMs: number; cards: PlayerDef[] }

/** What the scout screen and the popup should say right now. */
export function limitedPhase(nowMs: number = Date.now()): LimitedPhase {
  for (const batch of LIMITED_SCHEDULE) {
    if (nowMs >= ms(batch.from) && nowMs <= ms(batch.to)) {
      return { phase: 'active', batch, closesInMs: ms(batch.to) - nowMs, cards: limitedCardsOf(batch) }
    }
  }
  for (const batch of LIMITED_SCHEDULE) {
    if (nowMs >= ms(batch.teaseFrom) && nowMs < ms(batch.from)) {
      return { phase: 'teaser', batch, opensInMs: ms(batch.from) - nowMs }
    }
  }
  return { phase: 'none' }
}

export function limitedCardsOf(batch: LimitedBatch): PlayerDef[] {
  return PLAYERS.filter((player) => player.limited?.label === batch.label && !player.unreleased)
}

/** 「9월 8일(월) 00:00」 style, KST. */
export function formatKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatRemaining(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (days > 0) return `${days}일 ${hours}시간`
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}
