'use client'

import type { LiveMatch } from './useLiveMatch'

export interface Side {
  name: string
  detail: string
}

export default function MatchBroadcast({
  home,
  away,
  live,
  emptyLabel = '경기를 시작하면 중계가 표시됩니다.',
}: {
  home: Side
  away: Side
  live: LiveMatch
  emptyLabel?: string
}) {
  const { result, clock, finished, events, scoreFor, scoreAgainst } = live

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/70 p-4">
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold text-white">{home.name}</div>
          <div className="text-xs text-slate-400">{home.detail}</div>
        </div>
        <div className="shrink-0 text-center">
          <div className="text-3xl font-black text-white">
            {result ? `${scoreFor} : ${scoreAgainst}` : '- : -'}
          </div>
          <div className="text-xs font-semibold text-emerald-300">
            {result ? `${clock}분` : '킥오프 대기'}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold text-white">{away.name}</div>
          <div className="text-xs text-slate-400">{away.detail}</div>
        </div>
      </div>

      {finished && result && (
        <div
          className={`rise-in mt-4 rounded-xl p-4 text-center ${
            result.result === 'W'
              ? 'bg-emerald-500/15 text-emerald-300'
              : result.result === 'D'
                ? 'bg-slate-500/15 text-slate-300'
                : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          <div className="text-lg font-black">
            {result.result === 'W' ? '승리!' : result.result === 'D' ? '무승부' : '패배'}
          </div>
          <div className="text-sm">
            점유율 {result.possession}% · 슈팅 {result.shotsFor}-{result.shotsAgainst}
          </div>
        </div>
      )}

      <div className="scrollbar-thin mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">{emptyLabel}</p>
        )}
        {[...events].reverse().map((event, index) => (
          <div
            key={`${event.minute}-${index}`}
            className={`rise-in flex gap-3 rounded-lg px-3 py-2 text-sm ${
              event.type !== 'goal'
                ? 'bg-white/5 text-slate-300'
                : event.side === 'home'
                  ? 'bg-emerald-500/10 font-bold text-emerald-200'
                  : 'bg-rose-500/10 font-bold text-rose-200'
            }`}
          >
            <span className="w-10 shrink-0 text-xs font-bold text-slate-500">
              {event.minute}분
            </span>
            <span className="min-w-0 flex-1">{event.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
