'use client'

import { useState } from 'react'

interface Step {
  tab: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    tab: 'gacha',
    title: '1. 선수를 모읍니다',
    body: '뽑기 탭에서 카드팩을 엽니다. 하루 한 번 무료 뽑기가 있고, 일일 미션을 끝내면 골드를 받습니다. 10연차는 레어 이상 1장이 보장됩니다.',
  },
  {
    tab: 'squad',
    title: '2. 스쿼드를 짭니다',
    body: '스쿼드 탭에서 포메이션과 전술을 고르고, 자리를 눌러 선수를 배치합니다. 잘 모르겠으면 자동 배치 버튼을 누르세요. 포지션이 맞을수록 케미와 팀 전력이 올라갑니다.',
  },
  {
    tab: 'club',
    title: '3. 선수를 키웁니다',
    body: '선수단 탭에서 골드로 강화(레벨당 전 능력치 +1)하고, 필요 없는 카드는 방출합니다. 같은 등급 3장을 모으면 승급 합성으로 상위 등급 카드를 만들 수 있습니다.',
  },
  {
    tab: 'match',
    title: '4. 리그를 뜁니다',
    body: '경기 탭에서 라운드마다 한 경기씩 치릅니다. 7라운드가 끝나면 순위에 따라 승격 또는 강등되고, 시즌 보상을 받습니다. 이기면 골드가 들어오니 골드가 부족할 때도 경기를 뛰세요.',
  },
]

export default function GuideOverlay({
  onClose,
  onJump,
}: {
  onClose: () => void
  onJump: (tab: string) => void
}) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="rise-in w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            게임 방법
          </span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-300"
          >
            닫기
          </button>
        </div>

        <h2 className="mt-3 text-xl font-black text-white">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{current.body}</p>

        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${
                index <= step ? 'bg-emerald-400' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
          >
            이전
          </button>
          <button
            onClick={() => {
              onJump(current.tab)
              if (last) onClose()
              else setStep((value) => value + 1)
            }}
            className="flex-1 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-emerald-300"
          >
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
