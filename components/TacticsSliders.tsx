'use client'

import { useState } from 'react'
import { ARCHETYPES, archetypeParams } from '../lib/tactics/archetypes'
import { PARAM_KEYS, type TacticalParamKey, type TacticalParams } from '../lib/tactics/params'
import {
  PHASES,
  PHASE_KEYS,
  PHASE_LABELS,
  paramsForPhase,
  phaseDiffers,
  phasedFrom,
  type Phase,
  type PhasedTactics,
} from '../lib/tactics/phases'
import { EXAMPLE_PLANS } from '../lib/tactics/plans'
import { useGame } from './GameProvider'
import { TacticsModePicker, useTacticsMode } from './TacticsMode'

/** Every dial, in plain language, with what each end of it costs. */
const DIALS: Record<TacticalParamKey, { label: string; low: string; high: string }> = {
  tempo: { label: '템포', low: '천천히', high: '빠르게' },
  directness: { label: '직선성', low: '돌려서', high: '앞으로' },
  attackingWidth: { label: '공격 폭', low: '좁게', high: '넓게' },
  buildUpShortness: { label: '빌드업', low: '길게 걷어', high: '짧게 풀어' },
  passingRisk: { label: '패스 모험', low: '안전하게', high: '찔러서' },
  finalThirdPatience: { label: '마무리 인내', low: '서둘러', high: '기다려' },
  crossFrequency: { label: '크로스', low: '적게', high: '많이' },
  throughBallFrequency: { label: '침투 패스', low: '적게', high: '많이' },
  overlapFrequency: { label: '오버랩', low: '자제', high: '적극' },
  defensiveLine: { label: '수비 라인', low: '낮게', high: '높게' },
  blockHeight: { label: '압박 시작 높이', low: '내 진영', high: '상대 진영' },
  pressingIntensity: { label: '압박 강도', low: '기다림', high: '달려듦' },
  pressingCompactness: { label: '간격 유지', low: '느슨', high: '촘촘' },
  defensiveWidth: { label: '수비 폭', low: '좁게', high: '넓게' },
  offsideTrap: { label: '오프사이드 트랩', low: '안 씀', high: '적극' },
  counterPressIntensity: { label: '즉시 압박', low: '안 함', high: '전원' },
  regroupPriority: { label: '진영 복귀', low: '나중', high: '최우선' },
  counterAttackIntensity: { label: '역습 강도', low: '자제', high: '전력' },
  transitionSpeed: { label: '전환 속도', low: '천천히', high: '즉시' },
  forwardRunFrequency: { label: '공격 가담', low: '적게', high: '많이' },
  restDefence: { label: '잔류 수비', low: '적게', high: '많이' },
}

const GROUPS: { label: string; keys: TacticalParamKey[] }[] = [
  {
    label: '공을 가졌을 때',
    keys: ['tempo', 'directness', 'attackingWidth', 'buildUpShortness', 'passingRisk', 'finalThirdPatience', 'crossFrequency', 'throughBallFrequency', 'overlapFrequency'],
  },
  {
    label: '공이 없을 때',
    keys: ['defensiveLine', 'blockHeight', 'pressingIntensity', 'pressingCompactness', 'defensiveWidth', 'offsideTrap'],
  },
  {
    label: '전환 (뺏고 뺏긴 직후)',
    keys: ['counterPressIntensity', 'regroupPriority', 'counterAttackIntensity', 'transitionSpeed', 'forwardRunFrequency', 'restDefence'],
  },
]

export default function TacticsSliders() {
  const { state, setPlan } = useGame()
  const plan = state.plan
  const [phase, setPhase] = useState<Phase | 'BASE'>('BASE')
  const [open, setOpen] = useState(false)
  const { mode } = useTacticsMode()

  // Slider mode has no situations, so the editor always shows the base dials.
  const scope: Phase | 'BASE' = mode === 'phased' ? phase : 'BASE'

  const editing: TacticalParams = scope === 'BASE' ? plan.base : paramsForPhase(plan, scope)
  const editableKeys = scope === 'BASE' ? PARAM_KEYS : PHASE_KEYS[scope]

  const change = (key: TacticalParamKey, value: number) => {
    if (scope === 'BASE') {
      setPlan({ ...plan, base: { ...plan.base, [key]: value } })
      return
    }
    const byPhase = { ...(plan.byPhase ?? {}) }
    byPhase[scope] = { ...(byPhase[scope] ?? {}), [key]: value }
    setPlan({ ...plan, byPhase })
  }

  const clearPhase = () => {
    if (scope === 'BASE') return
    const byPhase = { ...(plan.byPhase ?? {}) }
    delete byPhase[scope]
    setPlan({ ...plan, byPhase })
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술 상세</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            21개 값을 직접 조절합니다. 상황별 지시는 방식을 골라서 켭니다.
          </p>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
          {open ? '접기' : '열기'}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <TacticsModePicker />

          <div className="mb-3">
            <div className="mb-1 text-[11px] font-bold text-slate-400">전술 불러오기</div>
            <div className="flex flex-wrap gap-1.5">
              {ARCHETYPES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPlan(phasedFrom(archetypeParams(item.key), plan.byPhase))}
                  title={`${item.idea}\n대가: ${item.cost}`}
                  className="whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 active:bg-white/15 sm:hover:bg-white/15"
                >
                  {item.label}
                </button>
              ))}
            </div>
            {mode === 'phased' && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EXAMPLE_PLANS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPlan(item.plan)}
                  title={item.idea}
                  className="whitespace-nowrap rounded-lg bg-sky-400/15 px-2.5 py-1.5 text-[11px] font-bold text-sky-200 active:bg-sky-400/25 sm:hover:bg-sky-400/25"
                >
                  {item.label}
                </button>
              ))}
            </div>
            )}
          </div>

          {mode === 'phased' && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['BASE', ...PHASES] as const).map((key) => {
              const active = phase === key
              const changed = key !== 'BASE' && phaseDiffers(plan, key)
              return (
                <button
                  key={key}
                  onClick={() => setPhase(key)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? 'bg-emerald-400 text-slate-900'
                      : changed
                        ? 'bg-amber-400/20 text-amber-200'
                        : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {key === 'BASE' ? '기본' : PHASE_LABELS[key]}
                  {changed && !active && ' •'}
                </button>
              )
            })}
          </div>
          )}

          {scope !== 'BASE' && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
              <p className="text-[11px] leading-relaxed text-slate-400">
                이 상황에서만 다르게 갑니다. 건드리지 않은 값은 기본 전술을 그대로 씁니다.
              </p>
              <button
                onClick={clearPhase}
                disabled={!phaseDiffers(plan, scope)}
                className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 disabled:opacity-40"
              >
                되돌리기
              </button>
            </div>
          )}

          <div className="space-y-4">
            {GROUPS.map((group) => {
              const keys = group.keys.filter((key) => editableKeys.includes(key))
              if (keys.length === 0) return null
              return (
                <div key={group.label}>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {group.label}
                  </div>
                  <div className="space-y-2.5">
                    {keys.map((key) => (
                      <div key={key}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200">{DIALS[key].label}</span>
                          <span className="text-[11px] font-black text-emerald-300">{editing[key]}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={editing[key]}
                          onChange={(event) => change(key, Number(event.target.value))}
                          aria-label={DIALS[key].label}
                          className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>{DIALS[key].low}</span>
                          <span>{DIALS[key].high}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            어떤 값도 승률을 직접 올리지 않습니다. 팀이 서는 위치와 행동이 바뀌고, 그 결과가
            경기에서 나옵니다. 강한 지시에는 반드시 대가가 따릅니다.
          </p>
        </div>
      )}
    </section>
  )
}

export type { PhasedTactics }
