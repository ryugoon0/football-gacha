'use client'

import { LINES, PLANS, PRESSINGS, TACTIC_PRESETS, TEMPOS, presetOf, tacticSummary } from '../lib/tactics'
import { useGame } from './GameProvider'
import TacticsSliders from './TacticsSliders'
import TacticsCompare from './TacticsCompare'

/**
 * 전술 — the four dials and presets, automatic substitution, and the detailed
 * sliders. Sits in the squad tab's side column; tactic edits are part of the
 * same lineup draft (lineupBase), so they need 저장 like the eleven does.
 */
export default function TacticsPanel() {
  const { state, setTactic, setAutoSub } = useGame()

  return (
    <>
      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술</h3>
        <p className="mt-1 text-[11px] text-slate-500">{tacticSummary(state.tactic)}</p>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {TACTIC_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setTactic(preset.setup)}
              title={preset.hint}
              className={`min-h-[44px] rounded-xl px-2 text-xs font-black transition ${
                presetOf(state.tactic) === preset.key ? 'btn-primary' : 'bg-white/10 text-slate-200 active:bg-white/20 sm:hover:bg-white/20'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {[
            { label: '기본 전술', field: 'plan' as const, options: PLANS },
            { label: '압박', field: 'pressing' as const, options: PRESSINGS },
            { label: '수비 라인', field: 'line' as const, options: LINES },
            { label: '템포', field: 'tempo' as const, options: TEMPOS },
          ].map(({ label, field, options }) => (
            <div key={field}>
              <div className="mb-1 text-[11px] font-bold text-slate-400">{label}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {options.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setTactic({ ...state.tactic, [field]: option.key })}
                    title={`${option.description} (단축키 ${option.hotkey})`}
                    className={`min-h-[40px] rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition ${
                      state.tactic[field] === option.key ? 'btn-primary' : 'bg-white/5 text-slate-300 active:bg-white/10 sm:hover:bg-white/10'
                    }`}
                  >
                    {option.label.replace(/^(압박|수비 라인|템포) /, '')}
                    <span className="ml-1 hidden opacity-50 sm:inline">{option.hotkey}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          경기 중에도 화면 아래 버튼으로 바꿀 수 있고, 지시는 경기가 멈추는 순간 적용됩니다. PC에서는 단축키(플랜 1 2 3 · 압박 Q W E ·
          라인 A S D · 템포 Z X C)도 씁니다.
        </p>

        <button
          onClick={() => setAutoSub(!state.autoSub)}
          className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-bold transition ${
            state.autoSub ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          <span>자동 교체</span>
          <span className={`rounded px-2 py-0.5 text-[11px] ${state.autoSub ? 'btn-primary' : 'btn-ghost'}`}>{state.autoSub ? '켜짐' : '꺼짐'}</span>
        </button>
        <p className="mt-1 text-[11px] text-slate-500">부상이거나 체력이 45 아래인 선발을 킥오프 전에 벤치 선수와 바꿉니다.</p>
      </section>

      <TacticsSliders />
      <TacticsCompare />
    </>
  )
}
