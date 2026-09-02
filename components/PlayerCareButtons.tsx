'use client'

import { MAX_CONDITION, isInjured, recoveryCost, treatmentCost } from '../lib/condition'
import type { Card } from '../lib/types'

/**
 * Treating an injury and topping up condition.
 *
 * These used to appear only when they applied, which meant a manager whose
 * squad was fresh never saw them and had no way to learn they existed. Now
 * they are always here and say why they are unavailable — the button is how
 * you find out the feature is there.
 */
export default function PlayerCareButtons({
  card,
  gold,
  onTreat,
  onRecover,
}: {
  card: Card
  gold: number
  onTreat: () => void
  onRecover: () => void
}) {
  const injured = isInjured(card)
  const tired = card.condition < MAX_CONDITION
  const treatFee = treatmentCost(card)
  const healFee = recoveryCost(card)

  return (
    <div className="space-y-2">
      <button
        onClick={onTreat}
        disabled={!injured || gold < treatFee}
        className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-400 disabled:bg-white/5 disabled:text-slate-500"
      >
        {injured
          ? `부상 치료 (${treatFee}G · ${card.injuredFor}경기 결장)`
          : '부상 치료 — 지금은 부상이 없습니다'}
      </button>

      <button
        onClick={onRecover}
        disabled={!tired || gold < healFee}
        className="w-full rounded-lg bg-sky-500/80 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-400 disabled:bg-white/5 disabled:text-slate-500"
      >
        {tired
          ? `체력 회복 ${card.condition} → ${MAX_CONDITION} (${healFee}G)`
          : '체력 회복 — 이미 가득 찼습니다'}
      </button>

      {((injured && gold < treatFee) || (tired && gold < healFee)) && (
        <p className="text-[11px] font-semibold text-amber-300">골드가 부족합니다.</p>
      )}
    </div>
  )
}
