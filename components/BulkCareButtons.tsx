'use client'

import { useMemo } from 'react'
import { careQuote } from '../lib/condition'
import { useGame } from './GameProvider'

/**
 * 일괄 치료·회복 — every injury treated, every card topped up, over one set
 * of cards (the eighteen on the squad screen, the whole collection in 선수관리).
 * Same prices as doing it one card at a time; when gold runs short the
 * reducer goes as far as it reaches, so the button says what it will cost.
 */
export default function BulkCareButtons({ uids, label, className = '' }: { uids: string[]; label: string; className?: string }) {
  const { state, careMany } = useGame()
  const quote = useMemo(() => careQuote(state.cards, uids), [state.cards, uids])
  const treatShort = quote.injured > 0 && state.gold < quote.treatCost
  const recoverShort = quote.tired > 0 && state.gold < quote.recoverCost
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2 ${className}`}>
      <span className="text-[11px] font-bold text-slate-400">{label}</span>
      <button
        onClick={() => {
          if (quote.injured === 0) return
          if (!window.confirm(`부상 ${quote.injured}명을 ${quote.treatCost.toLocaleString()}G에 모두 치료할까요?`)) return
          careMany(uids, { treat: true, recover: false })
        }}
        disabled={quote.injured === 0 || state.gold < 1}
        className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-400 disabled:bg-white/5 disabled:text-slate-500"
      >
        {quote.injured > 0 ? `부상 전원 치료 · ${quote.injured}명 · ${quote.treatCost.toLocaleString()}G` : '부상 전원 치료 — 부상자 없음'}
      </button>
      <button
        onClick={() => {
          if (quote.tired === 0) return
          if (!window.confirm(`체력이 다 차지 않은 ${quote.tired}명을 ${quote.recoverCost.toLocaleString()}G에 모두 회복할까요?`)) return
          careMany(uids, { treat: false, recover: true })
        }}
        disabled={quote.tired === 0 || state.gold < 1}
        className="rounded-lg bg-sky-500/80 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sky-400 disabled:bg-white/5 disabled:text-slate-500"
      >
        {quote.tired > 0 ? `체력 전원 회복 · ${quote.tired}명 · ${quote.recoverCost.toLocaleString()}G` : '체력 전원 회복 — 모두 가득'}
      </button>
      {(treatShort || recoverShort) && <span className="text-[11px] font-semibold text-amber-300">골드가 모자라면 닿는 데까지만 적용됩니다.</span>}
    </div>
  )
}
