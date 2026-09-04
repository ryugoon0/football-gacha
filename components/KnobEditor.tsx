'use client'

import { useCallback, useEffect, useState } from 'react'
import { timeAgo } from '../lib/board'
import { configHistory, loadTuning, registerKnobs, saveKnob, type ConfigChange } from '../lib/configSync'
import { KNOBS, KNOB_KEYS, currentTuning, type Knob, type KnobKey } from '../lib/tuning'

/**
 * The operator's sliders for a set of knob groups — the same editor the
 * 밸런스 tab has always had, factored out so the 보상 tab can show its own
 * subset next to a payout table. Saving writes game_config and applies
 * everywhere at once; `onValues` reports the live (possibly unsaved) slider
 * positions so a caller can preview what they would pay.
 */
export default function KnobEditor({
  groups,
  onValues,
  showHistory = true,
}: {
  groups: readonly Knob['group'][]
  onValues?: (values: Record<string, number>) => void
  showHistory?: boolean
}) {
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

  useEffect(() => {
    onValues?.(values)
  }, [values, onValues])

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

  const shownKeys = new Set(KNOB_KEYS.filter((key) => groups.includes(KNOBS[key].group)))

  return (
    <>
      {note && (
        <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-emerald-300">{note}</p>
      )}

      {!ready ? (
        <p className="mt-3 text-[11px] text-slate-500">불러오는 중...</p>
      ) : (
        groups.map((group) => {
          const keys = KNOB_KEYS.filter((key) => KNOBS[key].group === group)
          if (keys.length === 0) return null
          return (
            <div key={group} className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group}</div>
              <div className="space-y-3">
                {keys.map((key) => {
                  const knob = KNOBS[key]
                  const value = values[key] ?? knob.default
                  const changed = Math.abs(value - knob.default) > 1e-9
                  return (
                    <div key={key} className="rounded-xl bg-white/5 p-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-slate-100">{knob.label}</span>
                        <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-emerald-300">
                          {value}
                          {changed && <span className="ml-1 font-normal text-slate-500">(기본 {knob.default})</span>}
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
                          onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))}
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

      {showHistory && history.some((row) => shownKeys.has(row.key as KnobKey)) && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">바뀐 기록</div>
          <ul className="space-y-1">
            {history
              .filter((row) => shownKeys.has(row.key as KnobKey))
              .slice(0, 12)
              .map((row, index) => (
                <li key={index} className="flex flex-wrap items-baseline gap-1.5 text-[11px]">
                  <span className="font-bold text-slate-300">{KNOBS[row.key as KnobKey]?.label ?? row.key}</span>
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
    </>
  )
}
