'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { evaluateSquad } from '../lib/squad'
import { tacticSummary, type TacticSetup } from '../lib/tactics'
import type { PhasedTactics } from '../lib/tactics/phases'
import type { Squad } from '../lib/types'
import { useGame } from './GameProvider'

/** The working lineup as one value: what 저장 keeps and 되돌리기 goes back to. */
interface LineupSnapshot {
  squad: Squad
  tactic: TacticSetup
  plan: PhasedTactics
}

export interface LineupDraft {
  /** The working lineup differs from the last saved one. */
  dirty: boolean
  /** Keep the working lineup as the saved one. */
  commit: () => void
  /** Throw the edits away and go back to the saved lineup. */
  revert: () => void
  /** Load a kept lineup and treat it as saved — an explicit choice, not an experiment. */
  load: (squad: Squad, tactic: TacticSetup, plan?: PhasedTactics) => void
}

const sameLineup = (a: LineupSnapshot, b: LineupSnapshot) =>
  a.squad.formation === b.squad.formation &&
  JSON.stringify(a.squad.slots) === JSON.stringify(b.squad.slots) &&
  JSON.stringify(a.squad.bench) === JSON.stringify(b.squad.bench) &&
  JSON.stringify(a.tactic) === JSON.stringify(b.tactic) &&
  JSON.stringify(a.plan) === JSON.stringify(b.plan)

/**
 * Treats squad edits as a draft. The lineup as it stood when the tab opened
 * is the baseline; 저장 moves the baseline to the current lineup, and
 * leaving the tab (unmount) with unsaved edits restores the baseline — so a
 * manager who was only trying things out never plays a match with them.
 */
export function useLineupDraft(): LineupDraft {
  const { state, restoreLineup } = useGame()
  const current = useMemo<LineupSnapshot>(
    () => ({ squad: state.squad, tactic: state.tactic, plan: state.plan }),
    [state.squad, state.tactic, state.plan],
  )
  const [baseline, setBaseline] = useState<LineupSnapshot>(current)
  const dirty = !sameLineup(current, baseline)

  // Refs so the unmount cleanup sees the latest values without re-subscribing.
  const latest = useRef({ current, baseline, restoreLineup })
  latest.current = { current, baseline, restoreLineup }
  useEffect(
    () => () => {
      const { current: now, baseline: base, restoreLineup: restore } = latest.current
      if (!sameLineup(now, base)) restore(base.squad, base.tactic, base.plan)
    },
    [],
  )

  // A load asks for the *next* lineup to become the baseline: the reducer may
  // trim it (a sold card), so the baseline is taken from the state it produces.
  const commitNext = useRef(false)
  useEffect(() => {
    if (!commitNext.current) return
    commitNext.current = false
    setBaseline(current)
  }, [current])

  const commit = useCallback(() => {
    commitNext.current = false
    setBaseline(latest.current.current)
  }, [])
  const revert = useCallback(() => {
    commitNext.current = false
    const base = latest.current.baseline
    latest.current.restoreLineup(base.squad, base.tactic, base.plan)
  }, [])
  const load = useCallback((squad: Squad, tactic: TacticSetup, plan?: PhasedTactics) => {
    commitNext.current = true
    latest.current.restoreLineup(squad, tactic, plan)
  }, [])

  return { dirty, commit, revert, load }
}

/**
 * Three shelves for lineups (듀얼 스쿼드): put the working lineup on one,
 * load one back, or clear it. Loading also counts as saved — it is an
 * explicit choice, not an experiment.
 */
export default function LineupShelf({ slots, draft }: { slots: number; draft: LineupDraft }) {
  const { state, saveLineup, deleteLineup } = useGame()
  const [naming, setNaming] = useState<number | null>(null)
  const [name, setName] = useState('')
  const shelf = Array.from({ length: slots }, (_, index) => state.savedLineups?.[index] ?? null)

  const load = (index: number) => {
    const kept = shelf[index]
    if (kept) draft.load(kept.squad, kept.tactic, kept.plan)
  }

  const save = (index: number) => {
    saveLineup(index, name || shelf[index]?.name || `라인업 ${index + 1}`)
    setNaming(null)
    setName('')
    draft.commit()
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">라인업 보관 ({slots}개)</h3>
        <span className="text-[10px] text-slate-500">선발·벤치·포메이션·전술을 함께 저장</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {shelf.map((kept, index) => {
          const overall = kept ? evaluateSquad(state.cards, kept.squad, state.season.division).overall : null
          return (
            <div key={index} className="rounded-xl bg-white/5 px-3 py-2">
              {naming === index ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') save(index)
                      if (event.key === 'Escape') setNaming(null)
                    }}
                    maxLength={20}
                    placeholder={kept?.name ?? `라인업 ${index + 1}`}
                    autoFocus
                    className="input min-w-0 flex-1 px-2 py-1 text-xs"
                  />
                  <button onClick={() => save(index)} className="rounded-lg btn-primary px-2.5 py-1 text-[11px] font-black">
                    저장
                  </button>
                  <button onClick={() => setNaming(null)} className="rounded-lg btn-ghost px-2 py-1 text-[11px] font-bold">
                    취소
                  </button>
                </div>
              ) : kept ? (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-white">
                      {kept.name} <span className="ml-1 text-[10px] font-normal text-slate-400">{kept.squad.formation}</span>
                      {overall !== null && <span className="ml-1 text-[10px] font-black text-emerald-300">{overall}</span>}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">{tacticSummary(kept.tactic)}</div>
                  </div>
                  <button onClick={() => load(index)} className="rounded-lg btn-primary px-2.5 py-1 text-[11px] font-black">
                    불러오기
                  </button>
                  <button
                    onClick={() => {
                      setName('')
                      setNaming(index)
                    }}
                    className="rounded-lg btn-ghost px-2 py-1 text-[11px] font-bold"
                    title="현재 라인업으로 덮어쓰기"
                  >
                    덮어쓰기
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`「${kept.name}」을 지울까요?`)) deleteLineup(index)
                    }}
                    className="rounded-lg btn-ghost px-2 py-1 text-[11px] font-bold text-rose-300"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-xs text-slate-500">빈 자리 {index + 1}</span>
                  <button
                    onClick={() => {
                      setName('')
                      setNaming(index)
                    }}
                    className="rounded-lg btn-ghost px-2.5 py-1 text-[11px] font-bold"
                  >
                    현재 라인업 저장
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        불러오면 지금 라인업을 바로 바꿉니다. 팔거나 없는 선수가 있으면 그 자리는 비워집니다.
      </p>
    </section>
  )
}
