'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react'
import {
  ASSISTANTS,
  assistantForTab,
  assistantImage,
  assistantSpeech,
  loadAssistantMode,
  loadAssistantQuiet,
  saveAssistantMode,
  saveAssistantQuiet,
  type AssistantMode,
} from '../lib/assistant'
import { evaluateSquad, missingSlots } from '../lib/squad'
import { HOT_TIME_HOURS_KST, KST_OFFSET_MINUTES } from '../lib/weeklyLeague/config'
import { useGame } from './GameProvider'

/**
 * The assistant for the current screen: portrait, name plate, one line that
 * reads the save. One per screen (lib/assistant.ts decides who), a "조용히"
 * switch that hides all three, and the art mode switch (safe / open) — both
 * remembered per browser.
 */
export default function AssistantCard({ tab }: { tab: string }) {
  const { state } = useGame()
  const [mode, setMode] = useState<AssistantMode>('open')
  const [quiet, setQuiet] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setMode(loadAssistantMode())
    setQuiet(loadAssistantQuiet())
    setHydrated(true)
  }, [])

  const id = assistantForTab(tab)

  const squadGaps = useMemo(() => {
    const rating = evaluateSquad(state.cards, state.squad, state.season.division)
    const gaps = missingSlots(rating.evaluations)
    return { empty: gaps.empty.length, injured: gaps.injured.length }
  }, [state.cards, state.squad, state.season.division])

  // A once-a-minute tick so the kick-off countdown and the "just finished"
  // briefing move on without the user touching anything.
  const [minuteTick, setMinuteTick] = useState(() => Math.floor(Date.now() / 60_000))
  useEffect(() => {
    const timer = setInterval(() => setMinuteTick(Math.floor(Date.now() / 60_000)), 60_000)
    return () => clearInterval(timer)
  }, [])

  const speech = useMemo(() => {
    if (!id) return { text: '', expression: 'base' }
    const now = Date.now()
    const kst = new Date(now + KST_OFFSET_MINUTES * 60_000)
    const hourKst = kst.getUTCHours()
    const nextHour = (hourKst + 1) % 24
    return assistantSpeech(id, {
      tab,
      state,
      squadGaps,
      hourKst,
      minuteKst: kst.getUTCMinutes(),
      nowMs: now,
      nextKickoffHotTime: HOT_TIME_HOURS_KST.includes(nextHour),
    })
    // The line is meant to hold still while the screen is open; it reads the
    // save when the tab, squad, latest result or the minute changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tab, squadGaps, state.daily, state.season.round, state.season.finished, state.gold, state.history[0]?.id, minuteTick])

  if (!id || !hydrated) return null
  const who = ASSISTANTS[id]

  if (quiet) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            setQuiet(false)
            saveAssistantQuiet(false)
          }}
          className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:bg-white/10"
        >
          비서 다시 보기
        </button>
      </div>
    )
  }

  return (
    <section className="mb-4 flex items-stretch gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <img
        src={assistantImage(id, mode, 'bust', speech.expression)}
        alt={`${who.name} — ${who.role}`}
        width={96}
        height={96}
        className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
        loading="lazy"
        onError={(event) => {
          // An expression not drawn yet for this mode falls back to the plain portrait.
          const base = assistantImage(id, mode, 'bust')
          if (event.currentTarget.src.endsWith(base)) return
          event.currentTarget.src = base
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-black ${who.accent}`}>{who.name}</span>
            <span className="text-[11px] text-slate-500">{who.role}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const next: AssistantMode = mode === 'open' ? 'safe' : 'open'
                setMode(next)
                saveAssistantMode(next)
              }}
              title="비서 이미지 모드"
              className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-white/10"
            >
              {mode === 'open' ? '기본' : '건전'}
            </button>
            <button
              onClick={() => {
                setQuiet(true)
                saveAssistantQuiet(true)
              }}
              title="비서 숨기기"
              className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-white/10"
            >
              조용히
            </button>
          </div>
        </div>
        <p className="mt-1.5 rounded-xl rounded-tl-sm bg-white/5 px-3 py-2 text-[13px] leading-relaxed text-slate-100">
          {speech.text}
        </p>
      </div>
    </section>
  )
}
