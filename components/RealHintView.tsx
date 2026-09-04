'use client'

import { realHintFor } from '../lib/rosterRealHints'
import { useIsAdmin } from './useAdmin'

/**
 * Operator-only: which real club/player a fictional card seems to wink at.
 *
 * Same reasoning and same gate as HiddenStatsView — this never reaches a
 * player, only an operator trying to tell whether a lineup and its stats
 * look right. The mapping is an estimate (lib/rosterRealHints.ts explains
 * why), so it says "추정" rather than asserting it as fact.
 */
export default function RealHintView({
  name,
  club,
  nation,
  className = '',
}: {
  name: string
  club: string
  nation: string
  className?: string
}) {
  const { isAdmin, checked } = useIsAdmin()
  if (!checked || !isAdmin) return null

  const hint = realHintFor(name, club, nation)
  if (!hint) return null

  return (
    <div className={`rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">실명 추정</span>
        <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[9px] font-black text-sky-200">운영자 전용</span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-300">{hint}</p>
      <p className="mt-1 text-[10px] text-slate-600">
        이름 조각을 조합해 추정한 값입니다. 실존 인물과 정확히 일치하지 않을 수 있습니다.
      </p>
    </div>
  )
}
