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
    tab: 'market',
    title: '4. 원하는 선수를 삽니다',
    body: '이적시장에는 매일 다섯 명의 매물이 올라옵니다. 뽑기와 달리 보고 고를 수 있으니, 비어 있는 포지션은 여기서 채우세요. 300G를 내면 매물을 새로 뽑을 수도 있습니다.',
  },
  {
    tab: 'match',
    title: '5. 리그와 컵을 뜁니다',
    body: '리그는 7라운드를 치러 2위 안이면 승격, 7위 아래면 강등됩니다. FA컵은 지면 그 시즌은 끝나는 녹아웃입니다. 경기를 뛴 선수는 체력이 떨어지고 가끔 부상도 당하니, 벤치 선수로 돌려 쓰거나 선수단 탭에서 회복시키세요.',
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
