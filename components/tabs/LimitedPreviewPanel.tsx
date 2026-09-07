'use client'

import { LIMITED_SCHEDULE, formatKst } from '../../lib/limited'
import { PLAYERS } from '../../lib/players'
import PlayerCard from '../PlayerCard'

/**
 * 리미티드 미리보기 — every batch in LIMITED_SCHEDULE with all its cards, for
 * the operator only, before and after the window. Players see the cards only
 * while the window is open (and the teaser shows a few beforehand).
 */
export default function LimitedPreviewPanel() {
  return (
    <div className="space-y-4">
      {LIMITED_SCHEDULE.map((batch) => {
        const cards = PLAYERS.filter((player) => player.limited?.label === batch.label)
        const now = Date.now()
        const state = now < Date.parse(batch.from) ? '예고 중' : now <= Date.parse(batch.to) ? '진행 중' : '종료'
        return (
          <section key={batch.id} className="panel p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-white">
                리미티드 · {batch.label} <span className="ml-2 text-xs font-normal text-slate-400">{cards.length}장 · {state}</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                {formatKst(batch.from)} ~ {formatKst(batch.to)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{batch.note}</p>
            {cards.length === 0 ? (
              <p className="mt-3 text-xs text-amber-300">아직 데이터가 없습니다 (data/limited/{batch.id}.json).</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...cards]
                  .sort((a, b) => b.ovr - a.ovr)
                  .map((player) => (
                    <div key={player.id} className="flex items-start gap-3 rounded-xl bg-white/5 p-2.5">
                      <PlayerCard player={player} size="md" />
                      <div className="min-w-0 text-xs text-slate-300">
                        <div className="font-bold text-white">
                          {player.name} <span className="ml-1 text-slate-400">{player.position} {player.ovr}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{player.club} · {player.league}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-fuchsia-100/90">{player.limited?.story}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{player.id}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
