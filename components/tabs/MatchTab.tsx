'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PROMOTION_POINTS,
  divisionLabel,
  opponentsFor,
  simulateMatch,
  type Opponent,
} from '../../lib/match'
import { evaluateSquad } from '../../lib/squad'
import type { MatchResult } from '../../lib/types'
import { useGame } from '../GameProvider'

const MINUTE_MS = 45

export default function MatchTab() {
  const { state, finishMatch } = useGame()
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])
  const opponents = useMemo(
    () => opponentsFor(state.division, state.record.w + state.record.d + state.record.l),
    [state.division, state.record],
  )

  const [selected, setSelected] = useState<Opponent>(opponents[0])
  const [live, setLive] = useState<MatchResult | null>(null)
  const [clock, setClock] = useState(0)
  const [finished, setFinished] = useState(false)
  const settled = useRef(false)

  useEffect(() => {
    setSelected((current) => opponents.find((item) => item.id === current?.id) ?? opponents[0])
  }, [opponents])

  useEffect(() => {
    if (!live || finished) return
    if (clock >= 90) {
      setFinished(true)
      if (!settled.current) {
        settled.current = true
        finishMatch(live)
      }
      return
    }
    const timer = setTimeout(() => setClock((minute) => Math.min(90, minute + 1)), MINUTE_MS)
    return () => clearTimeout(timer)
  }, [live, clock, finished, finishMatch])

  const start = () => {
    if (live && !finished) return
    settled.current = false
    setFinished(false)
    setClock(0)
    setLive(simulateMatch(rating, state.club, selected, state.division))
  }

  const shownEvents = live ? live.events.filter((event) => event.minute <= clock) : []
  const scoreFor = shownEvents.filter((e) => e.type === 'goal' && e.side === 'home').length
  const scoreAgainst = shownEvents.filter((e) => e.type === 'goal' && e.side === 'away').length
  const playing = Boolean(live) && !finished

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">리그 현황</h3>
          <div className="mt-2 text-2xl font-black text-white">{divisionLabel(state.division)}</div>
          <div className="mt-1 text-xs text-slate-400">
            승점 {state.points} / {PROMOTION_POINTS} · 승격까지{' '}
            {Math.max(0, PROMOTION_POINTS - state.points)}점
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-emerald-400 transition-all"
              style={{ width: `${Math.min(100, (state.points / PROMOTION_POINTS) * 100)}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['승', state.record.w],
              ['무', state.record.d],
              ['패', state.record.l],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-white/5 py-2">
                <div className="text-[10px] text-slate-400">{label as string}</div>
                <div className="text-lg font-bold text-white">{value as number}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
            득점 {state.gf} · 실점 {state.ga}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">상대 선택</h3>
          <div className="mt-3 space-y-2">
            {opponents.map((opponent) => (
              <button
                key={opponent.id}
                onClick={() => setSelected(opponent)}
                disabled={playing}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition disabled:opacity-50 ${
                  selected?.id === opponent.id
                    ? 'bg-emerald-400/15 ring-2 ring-emerald-400'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-emerald-300">
                  {opponent.badge}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">
                    {opponent.name}
                  </span>
                  <span className="block text-xs text-slate-400">전력 {opponent.rating}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={start}
            disabled={playing}
            className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
          >
            {playing ? '경기 진행 중...' : '경기 시작'}
          </button>
          {rating.filled < 11 && (
            <p className="mt-2 text-xs font-semibold text-amber-400">
              선발이 {rating.filled}명입니다. 빈 자리는 유스 선수가 대신 뜁니다.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/70 p-4">
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-bold text-white">{state.club}</div>
            <div className="text-xs text-slate-400">전력 {rating.overall}</div>
          </div>
          <div className="shrink-0 text-center">
            <div className="text-3xl font-black text-white">
              {live ? `${scoreFor} : ${scoreAgainst}` : '- : -'}
            </div>
            <div className="text-xs font-semibold text-emerald-300">
              {live ? `${clock}'` : '킥오프 대기'}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-bold text-white">
              {live?.opponent ?? selected?.name ?? '상대 미정'}
            </div>
            <div className="text-xs text-slate-400">
              전력 {live?.opponentRating ?? selected?.rating ?? '-'}
            </div>
          </div>
        </div>

        {finished && live && (
          <div
            className={`rise-in mt-4 rounded-xl p-4 text-center ${
              live.result === 'W'
                ? 'bg-emerald-500/15 text-emerald-300'
                : live.result === 'D'
                  ? 'bg-slate-500/15 text-slate-300'
                  : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            <div className="text-lg font-black">
              {live.result === 'W' ? '승리!' : live.result === 'D' ? '무승부' : '패배'}
            </div>
            <div className="text-sm">
              점유율 {live.possession}% · 슈팅 {live.shotsFor}-{live.shotsAgainst} · 보상{' '}
              <span className="font-bold text-amber-300">+{live.reward}G</span>
            </div>
          </div>
        )}

        <div className="scrollbar-thin mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {shownEvents.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              상대를 고르고 경기를 시작하세요.
            </p>
          )}
          {[...shownEvents].reverse().map((event, index) => (
            <div
              key={`${event.minute}-${index}`}
              className={`rise-in flex gap-3 rounded-lg px-3 py-2 text-sm ${
                event.type !== 'goal'
                  ? 'bg-white/5 text-slate-300'
                  : event.side === 'home'
                    ? 'bg-emerald-500/10 font-bold text-emerald-200'
                    : 'bg-rose-500/10 font-bold text-rose-200'
              }`}
            >
              <span className="w-10 shrink-0 text-xs font-bold text-slate-500">
                {event.minute}&apos;
              </span>
              <span className="min-w-0 flex-1">{event.text}</span>
            </div>
          ))}
        </div>

        {state.history.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
              최근 경기
            </h3>
            <div className="flex flex-wrap gap-2">
              {state.history.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    item.result === 'W'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : item.result === 'D'
                        ? 'bg-slate-600/25 text-slate-300'
                        : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  <div className="font-bold">
                    {item.scoreFor} : {item.scoreAgainst}
                  </div>
                  <div className="opacity-70">{item.opponent}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
