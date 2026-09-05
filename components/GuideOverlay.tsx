'use client'

import { useState } from 'react'

interface Step {
  tab: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    tab: 'home',
    title: '0. 감독실에서 시작합니다',
    body: '접속하면 라커룸이 있는 홈 화면이 먼저 열립니다. 다음 상대와 경기장 바로가기, 골드와 보관함, 스쿼드 상태, 오늘 할 일이 한 화면에 정리되어 있습니다. 급한 항목을 누르면 해당 탭으로 바로 이동합니다.',
  },
  {
    tab: 'gacha',
    title: '1. 선수를 모읍니다',
    body: '카드팩은 일반팩과 프리미엄팩 두 종류이고, 각각 1회와 10연차가 있습니다. 프리미엄팩은 비싼 대신 고급 카드 확률이 훨씬 높고 10연차에는 월드 이상이 보장됩니다. 하루 한 번은 무료이고, 30회 안에 월드 이상이 반드시 나옵니다(천장). 카드 등급은 일반 · 실버 · 월드 · 라이브 · 레전드 순이고, 등급마다 시작 레벨과 성장 상한이 다릅니다.',
  },
  {
    tab: 'squad',
    title: '2. 스쿼드를 짭니다',
    body: '자리를 눌러 선수를 배치하고 벤치도 채우세요. 가능 포지션이 아닌 자리에 넣으면 능력치가 크게 깎입니다. 선발과 후보 18명 중 같은 클럽 8명·같은 리그나 국가 11명이면 팀 컬러가 발동하고, 18명 전원이 같은 클럽이면 최고 단계입니다. 리그마다 선발 11명의 레벨 합 상한이 있어(5부 55 → 1부 110) 상한을 넘으면 경기에 등록할 수 없습니다. 전술은 총공세 · 균형 · 역습 · 잠그기 프리셋을 한 번에 고르거나, 세부 조정에서 플랜 · 압박 · 수비 라인 · 템포를 따로 정합니다. 자동 교체를 켜면 부상·체력 저하 선수를 킥오프 전에 벤치와 바꿔줍니다. 바꾼 라인업과 전술은 「현재 라인업 저장」을 눌러야 남고, 저장하지 않고 나가면 원래대로 돌아갑니다. 라인업은 3개까지 보관해 두고 바꿔 쓸 수 있습니다.',
  },
  {
    tab: 'club',
    title: '3. 선수를 키웁니다',
    body: '카드를 누르면 가능 포지션과 세부 능력치를 볼 수 있습니다. 성장은 두 가지입니다. ①훈련: 다른 카드를 재료로 먹여 경험치를 쌓아 레벨업. ②한계 돌파: 같은 선수 카드 1장을 소모해 레벨 한계를 1 올림. 키울 선수는 선발이어도 되고, 재료로 넣는 카드만 선발·벤치에서 빼면 됩니다. 등급별 상한은 일반 8 · 실버 9 · 월드/라이브/레전드 10이고, 10레벨이면 주요 능력치가 99가 됩니다. 카드 한 장이 보관함 한 칸을 쓰고, 골드로 +10칸씩 최대 200칸까지 늘릴 수 있습니다. 같은 99라도 보이지 않는 히든 능력치 때문에 월드보다 라이브가 강합니다.',
  },
  {
    tab: 'match',
    title: '4. 리그와 컵을 뜁니다',
    body: '20개 팀이 겨루는 리그 19라운드와 FA컵 4라운드가 한 일정에 섞여 있습니다. 경기일 순서대로 치르며, 2위 안이면 승격 · 18위 아래면 강등입니다. 컵은 지면 그 시즌은 끝입니다. 경기는 선수들이 움직이는 관전 모드와 중계 문구만 보는 텍스트 모드로 볼 수 있고, 경기 중에는 화면 아래 고정 바에서 전술 프리셋과 교체를 누르면 됩니다. 선발은 뛸수록 체력이 떨어지고 팀 전력도 같이 내려가니, 후반에는 지친 선수 교체 버튼으로 벤치를 쓰세요. 지시는 언제든 내릴 수 있고, 파울 · 골 · 아웃 · 하프타임처럼 경기가 멈춘 순간에 실제로 반영됩니다. 연전이 이어지니 벤치와 자동 교체로 체력을 관리하세요. 순위와 상관없는 친선 경기는 하루 10판까지 바로 칠 수 있습니다(부상 없음).',
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
      <div className="rise-in w-full max-w-md panel-strong p-6 shadow-2xl">
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
            className="flex-1 rounded-lg btn-primary px-4 py-2 text-sm font-bold transition"
          >
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
