'use client'

import { HIDDEN_KEYS, HIDDEN_LABELS } from '../lib/cardMaker'
import { HIDDEN_MAX } from '../lib/players'
import type { HiddenStats } from '../lib/types'
import { useIsAdmin } from './useAdmin'

/**
 * The four attributes that change matches without appearing on the card.
 *
 * They decide how a chance is finished, how slowly a player tires, whether a
 * cup tie brings out something extra, and how often an off day comes.
 *
 * Operators only. Two cards with the same overall are meant to be able to be
 * different players, and printing the difference turns every card into a
 * solved sum — the roster stops having anything left to find out. Operators
 * still need the numbers to balance the game.
 *
 * This is a screen, not a secret: the roster ships to the browser, so anyone
 * reading the bundle can find these values. It keeps them out of the game, not
 * out of reach.
 *
 * The check is inside this component rather than at each call site. Three
 * screens show a player, and one of them forgetting to ask would put the
 * numbers back in front of everybody.
 */
export default function HiddenStatsView({
  hidden,
  className = '',
}: {
  hidden: HiddenStats
  className?: string
}) {
  const { isAdmin, checked } = useIsAdmin()
  if (!checked || !isAdmin) return null

  return (
    <div className={`rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          히든 능력치
        </span>
        <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
          운영자 전용
        </span>
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
        카드 앞면에는 나오지 않고 플레이어에게도 보이지 않습니다. 최대 {HIDDEN_MAX}이며, 레벨을
        올려도 변하지 않습니다 — 카드가 처음 가진 값 그대로입니다.
      </p>
    </div>
  )
}
