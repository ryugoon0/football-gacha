'use client'

import KnobEditor from '../KnobEditor'

const GROUPS = ['스카우트', '합성', '체력', '경기', '비용', '하루'] as const

/** Balance knobs other than rewards — those have their own tab (보상) with a payout table. */
export default function BalancePanel() {
  return (
    <section className="panel p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">밸런스 조절</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        저장하면 모두에게 곧바로 적용됩니다. 배포는 필요 없습니다. 골드 보상 배율은 『보상』 탭에 있습니다.
      </p>

      <KnobEditor groups={GROUPS} />

      <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
        뽑기 확률 · 팩 가격 · 천장은 여기서 바꿀 수 없습니다. 고지한 확률을 증명할 수 있어야 해서
        서버 함수에 들어 있고, 바꾸려면 코드 수정과 함수 재배포가 필요합니다.
      </p>
    </section>
  )
}
