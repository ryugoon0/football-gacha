'use client'

import { useEffect } from 'react'
import { ITEMS } from '../lib/items'
import { TACTIC_CARDS, TACTIC_CARD_IDS, boostLabel } from '../lib/weeklyLeague/tacticCards'

/**
 * How 히든 카드 work, in one screen — opened from the pre-match card panel and
 * from a card in the shop. The rules here are read straight from the card
 * definitions, so the list never drifts from what the server enforces.
 */
export default function TacticCardHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const price = ITEMS.cardUnderdog

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="히든 카드 사용법"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950 p-5 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">히든 카드</div>
            <h3 className="mt-1 text-lg font-black text-white">사용법</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold"
          >
            닫기
          </button>
        </div>

        <ol className="mt-4 space-y-2.5 text-sm text-slate-200">
          <li className="flex gap-3">
            <span className="shrink-0 font-black text-fuchsia-300">1</span>
            <span>
              <b>카드를 구합니다.</b> 상점에서 골드 {price.gold?.toLocaleString('ko-KR')} 또는 조각 {price.shards}(하루 {price.dailyLimit}장), 아니면 경쟁 리그 한 주가
              끝날 때의 순위 보상, 컵 결승 보상으로 받습니다. 가진 카드는 상점의 보유 아이템에서 볼 수 있습니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-black text-fuchsia-300">2</span>
            <span>
              <b>킥오프 10분 전에 입장합니다.</b> 경쟁 리그 → 내 경기에서 내 경기에 <span className="rounded bg-emerald-400/20 px-1 text-[11px] font-bold text-emerald-300">입장 가능</span> 배지가
              뜨면 「입장」. 이때 라인업이 확정됩니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-black text-fuchsia-300">3</span>
            <span>
              <b>지시 패널 위 히든 카드 칸에서 한 장을 누릅니다.</b> 한 경기에 한 장만, 킥오프 전에만 됩니다. 킥오프가 지나면 칸이 사라집니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 font-black text-fuchsia-300">4</span>
            <span>
              <b>조건이 맞는 동안 자동으로 발동합니다.</b> 서버가 매 분 조건을 확인해 켜지고 꺼지며, 피드에 「히든 카드 발동 / 대기」로 찍힙니다.
              조건이 한 번도 맞지 않으면 아무 효과가 없습니다 — 카드는 경기가 어떻게 흘러갈지에 대한 예측입니다.
            </span>
          </li>
        </ol>

        <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">카드 목록</div>
        <div className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
          {TACTIC_CARD_IDS.map((id) => {
            const card = TACTIC_CARDS[id]
            return (
              <div key={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-[12px]">
                <span className="w-36 shrink-0 font-bold text-slate-100">
                  {card.icon} {card.name}
                </span>
                <span className="text-fuchsia-200">{boostLabel(card.boost)}</span>
                <span className="w-full text-slate-500 sm:w-auto sm:flex-1">{card.when}</span>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          보너스는 조건이 켜진 동안 해당 선수들의 표시 능력치에 더해져 경기 판정에 반영됩니다. 상대도 자기 카드를 쓸 수 있고,
          어느 쪽이 무엇을 썼는지는 피드에 그대로 보입니다.
        </p>
      </div>
    </div>
  )
}
