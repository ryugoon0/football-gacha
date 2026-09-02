'use client'

import { SUB_STAT_COUNT, breakdownOf } from '../lib/subStats'
import type { StatGroup } from '../lib/subStats'
import type { PlayerDef } from '../lib/types'

/**
 * The detailed attributes behind a card's six numbers.
 *
 * A card shows the average of each group because that is all a card has room
 * for. This is where the average is opened up — the same layout the old game
 * used, two columns of grouped bars — so a striker who heads everything in can
 * be told apart from one who does not.
 *
 * It lives on its own because there are three screens that show a player
 * (선수단 목록, 카드 상세, 스쿼드). Twice now a detail has been added to one of
 * them and quietly missed the others.
 */

const TONE: Record<StatGroup, { bar: string; head: string }> = {
  pac: { bar: 'bg-violet-400', head: 'text-violet-300' },
  sho: { bar: 'bg-rose-400', head: 'text-rose-300' },
  pas: { bar: 'bg-amber-400', head: 'text-amber-300' },
  dri: { bar: 'bg-lime-400', head: 'text-lime-300' },
  def: { bar: 'bg-sky-400', head: 'text-sky-300' },
  phy: { bar: 'bg-orange-400', head: 'text-orange-300' },
}

export default function StatBreakdown({
  player,
  level = 1,
  className = '',
}: {
  player: PlayerDef
  level?: number
  className?: string
}) {
  const groups = breakdownOf(player, level)

  return (
    <div className={className}>
      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map(({ group, label, value, subs }) => {
          const tone = TONE[group]
          return (
            <div key={group} className="rounded-xl bg-black/25 p-2.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-1.5">
                <span className={`text-xs font-black ${tone.head}`}>{label}</span>
                <span className="text-sm font-black tabular-nums text-white">{value}</span>
              </div>
              <div className="mt-1.5 space-y-1">
                {subs.map(({ stat, label: subLabel, value: subValue }) => (
                  <div key={stat.key} className="flex items-center gap-2">
                    <span className="w-[4.5rem] shrink-0 truncate text-[10px] text-slate-400">
                      {subLabel}
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 rounded-full bg-white/10">
                      <span
                        className={`block h-1.5 rounded-full ${tone.bar}`}
                        style={{ width: `${subValue}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-[10px] font-bold tabular-nums text-slate-200">
                      {subValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        카드에 적힌 여섯 숫자는 각 묶음의 평균입니다. 세부 {SUB_STAT_COUNT}개는 레벨을 올리면 함께
        올라갑니다.
      </p>
    </div>
  )
}
