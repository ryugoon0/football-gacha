'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  KIND_LABEL,
  calendarEvents,
  dayKeyKst,
  dayLabelKst,
  predictionEvents,
  timeLabelKst,
  upcoming,
  type CalendarEvent,
  type CalendarKind,
} from '../lib/calendar'

const TONE: Record<CalendarKind, string> = {
  league: 'bg-emerald-400/20 text-emerald-200',
  cup: 'bg-amber-400/20 text-amber-200',
  hot: 'bg-rose-500/20 text-rose-200',
  limited: 'bg-fuchsia-400/20 text-fuchsia-200',
  prediction: 'bg-sky-400/20 text-sky-200',
  reward: 'bg-yellow-300/20 text-yellow-100',
}

/**
 * 이벤트 캘린더 — the next two weeks by day. Hot-time kick-offs are folded
 * into one line per day so the list stays short; everything else is a row.
 */
export default function EventCalendar({ onJump }: { onJump?: (tab: string) => void }) {
  const [now] = useState(() => Date.now())
  const [remote, setRemote] = useState<CalendarEvent[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    void predictionEvents().then(setRemote)
  }, [])

  const days = useMemo(() => {
    const all = upcoming([...calendarEvents(now), ...remote], now, expanded ? 14 : 7)
    const byDay = new Map<string, { label: string; events: CalendarEvent[] }>()
    for (const event of all) {
      const key = dayKeyKst(event.startMs)
      const entry = byDay.get(key) ?? { label: dayLabelKst(event.startMs), events: [] }
      entry.events.push(event)
      byDay.set(key, entry)
    }
    // Fold the two daily hot-time rows into one.
    for (const entry of byDay.values()) {
      const hots = entry.events.filter((event) => event.kind === 'hot')
      if (hots.length > 1) {
        entry.events = [
          ...entry.events.filter((event) => event.kind !== 'hot'),
          { ...hots[0], title: `핫타임 ${hots.map((event) => timeLabelKst(event.startMs)).join(' · ')}`, id: `${hots[0].id}-fold` },
        ].sort((a, b) => a.startMs - b.startMs)
      }
    }
    return [...byDay.entries()]
  }, [now, remote, expanded])

  const todayKey = dayKeyKst(now)

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">이벤트 캘린더</h3>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[11px] font-bold text-slate-400 hover:text-white">
          {expanded ? '이번 주만' : '2주 보기'}
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {days.map(([key, day]) => (
          <div key={key} className={`rounded-xl px-3 py-2 ${key === todayKey ? 'bg-emerald-400/10 ring-1 ring-emerald-400/30' : 'bg-white/5'}`}>
            <div className="text-[11px] font-black text-slate-200">
              {day.label}
              {key === todayKey && <span className="ml-1.5 rounded bg-emerald-400/30 px-1 text-[9px] text-emerald-100">오늘</span>}
            </div>
            <ul className="mt-1 space-y-0.5">
              {day.events.map((event) => {
                const past = event.endMs < now
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => event.tab && onJump?.(event.tab)}
                      className={`flex w-full items-baseline gap-2 rounded-lg px-1.5 py-0.5 text-left text-[11px] hover:bg-white/5 ${past ? 'opacity-50' : ''}`}
                    >
                      <span className="w-11 shrink-0 tabular-nums text-slate-500">{timeLabelKst(event.startMs)}</span>
                      <span className={`shrink-0 rounded px-1 text-[9px] font-black ${TONE[event.kind]}`}>{KIND_LABEL[event.kind]}</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-slate-100">{event.title}</span>
                      {event.note && <span className="hidden shrink-0 text-[10px] text-slate-500 sm:inline">{event.note}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {days.length === 0 && <p className="text-xs text-slate-500">예정된 일정이 없습니다.</p>}
      </div>
      <p className="mt-2 text-[10px] text-slate-600">시각은 한국 시간. 경쟁 리그는 매주 같은 리듬으로 돌고, 리미티드·예측은 운영 일정에 따라 추가됩니다.</p>
    </section>
  )
}
