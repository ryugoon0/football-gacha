'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { lineupDirty } from '../lib/gameReducer'
import { evaluateSquad } from '../lib/squad'
import { tacticSummary, type TacticSetup } from '../lib/tactics'
import type { PhasedTactics } from '../lib/tactics/phases'
import type { Squad } from '../lib/types'
import { useGame } from './GameProvider'

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

/**
 * Treats squad edits as a draft on top of the confirmed lineup kept in the
 * save (`lineupBase`). 저장 confirms the working lineup; leaving the tab with
 * unsaved edits restores the confirmed one, and so does reopening the game
 * (lib/storage.ts) — so a manager who was only trying things out never plays
 * a match with them. Older saves have no confirmed lineup yet: the one found
 * on opening the tab is confirmed as it is.
 */
export function useLineupDraft(): LineupDraft {
  const { state, restoreLineup, commitLineup } = useGame()
  const dirty = lineupDirty(state)
  const hasBase = Boolean(state.lineupBase)

  useEffect(() => {
    if (!hasBase) commitLineup()
  }, [hasBase, commitLineup])

  // Refs so the unmount cleanup sees the latest values without re-subscribing.
  const latest = useRef({ state, restoreLineup })
  latest.current = { state, restoreLineup }
  useEffect(
    () => () => {
      const { state: now, restoreLineup: restore } = latest.current
      const base = now.lineupBase
      if (base && lineupDirty(now)) restore(base.squad, base.tactic, base.plan)
    },
    [],
  )

  const commit = useCallback(() => commitLineup(), [commitLineup])
  const revert = useCallback(() => {
    const base = latest.current.state.lineupBase
    if (base) latest.current.restoreLineup(base.squad, base.tactic, base.plan)
  }, [])
  const load = useCallback((squad: Squad, tactic: TacticSetup, plan?: PhasedTactics) => {
    latest.current.restoreLineup(squad, tactic, plan, true)
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
