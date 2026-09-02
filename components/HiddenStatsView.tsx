'use client'

import { HIDDEN_KEYS, HIDDEN_LABELS } from '../lib/cardMaker'
import { HIDDEN_MAX } from '../lib/players'
import type { HiddenStats } from '../lib/types'

/**
 * The four attributes that change matches without appearing on the card.
 *
 * They decide how a chance is finished, how slowly a player tires, whether a
 * cup tie brings out something extra, and how often an off day comes. Leaving
 * them off every screen meant a card's real quality was partly invisible —
 * two cards with the same overall could be quite different players.
 */
export default function HiddenStatsView({
  hidden,
  className = '',
}: {
  hidden: HiddenStats
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-white/5 p-3 ${className}`}>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        히든 능력치
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {HIDDEN_KEYS.map((key) => (
          <div key={key} title={HIDDEN_LABELS[key].note}>
            <div className="flex items-baseline justify-between gap-1">
              <span className="truncate text-[11px] font-bold text-slate-300">
                {HIDDEN_LABELS[key].label}
              </span>
              <span className="shrink-0 text-[11px] font-black tabular-nums text-sky-300">
                {hidden[key]}
              </span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-black/30">
              <div
                className="h-1 rounded-full bg-sky-400"
                style={{ width: `${(hidden[key] / HIDDEN_MAX) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        카드 앞면에는 나오지 않지만 경기 결과에 영향을 줍니다. 최대 {HIDDEN_MAX}.
      </p>
    </div>
  )
}
