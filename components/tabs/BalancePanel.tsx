'use client'

import { useCallback, useEffect, useState } from 'react'
import { timeAgo } from '../../lib/board'
import {
  configHistory,
  loadTuning,
  registerKnobs,
  saveKnob,
  type ConfigChange,
} from '../../lib/configSync'
import { KNOBS, KNOB_KEYS, currentTuning, type KnobKey } from '../../lib/tuning'

const GROUPS = ['체력', '경기', '비용', '하루'] as const

export default function BalancePanel() {
  const [values, setValues] = useState<Record<string, number>>(currentTuning())
  const [history, setHistory] = useState<ConfigChange[]>([])
  const [saving, setSaving] = useState<KnobKey | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    await registerKnobs()
    await loadTuning()
    setValues(currentTuning())
    setHistory(await configHistory())
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const commit = async (key: KnobKey, value: number) => {
    setSaving(key)
    const result = await saveKnob(key, value)
    setSaving(null)
    if (!result.ok) {
      setNote(result.reason === 'not an operator' ? '운영자만 바꿀 수 있습니다.' : '저장하지 못했습니다.')
      return
    }
    setNote(
      result.clamped
        ? `${KNOBS[key].label}은(는) 허용 범위 안으로 조정되어 ${result.value}로 저장되었습니다.`
        : `${KNOBS[key].label} 저장 완료.`,
    )
    await loadTuning()
    setValues(currentTuning())
    setHistory(await configHistory())
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">밸런스 조절</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        저장하면 모두에게 곧바로 적용됩니다. 배포는 필요 없습니다.
      </p>

      {note && (
        <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-emerald-300">
          {note}
        </p>
      )}

      {!ready ? (
        <p className="mt-3 text-[11px] text-slate-500">불러오는 중...</p>
      ) : (
        GROUPS.map((group) => {
          const keys = KNOB_KEYS.filter((key) => KNOBS[key].group === group)
          if (keys.length === 0) return null
          return (
            <div key={group} className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {group}
              </div>
              <div className="space-y-3">
                {keys.map((key) => {
                  const knob = KNOBS[key]
                  const value = values[key] ?? knob.default
                  const changed = Math.abs(value - knob.default) > 1e-9
                  return (
                    <div key={key} className="rounded-xl bg-white/5 p-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-slate-100">
                          {knob.label}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-emerald-300">
                          {value}
                          {changed && (
                            <span className="ml-1 font-normal text-slate-500">
                              (기본 {knob.default})
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{knob.note}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="range"
                          min={knob.min}
                          max={knob.max}
                          step={knob.step}
                          value={value}
                          onChange={(event) =>
                            setValues((current) => ({ ...current, [key]: Number(event.target.value) }))
                          }
                          onPointerUp={(event) => void commit(key, Number(event.currentTarget.value))}
                          onKeyUp={(event) => void commit(key, Number(event.currentTarget.value))}
                          aria-label={knob.label}
                          className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
                        />
                        <button
                          onClick={() => void commit(key, knob.default)}
                          disabled={!changed || saving === key}
                          className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                        >
                          기본값
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>{knob.min}</span>
                        <span>{knob.max}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
        뽑기 확률 · 팩 가격 · 천장은 여기서 바꿀 수 없습니다. 고지한 확률을 증명할 수 있어야 해서
        서버 함수에 들어 있고, 바꾸려면 코드 수정과 함수 재배포가 필요합니다.
      </p>

      {history.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            바뀐 기록
          </div>
          <ul className="space-y-1">
            {history.slice(0, 12).map((row, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-1.5 text-[11px]">
                <span className="font-bold text-slate-300">
                  {KNOBS[row.key as KnobKey]?.label ?? row.key}
                </span>
                <span className="tabular-nums text-slate-500">
                  {row.before ?? '-'} → <span className="text-slate-200">{row.after}</span>
                </span>
                <span className="text-slate-600">
                  {row.email ?? '알 수 없음'} · {timeAgo(row.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
