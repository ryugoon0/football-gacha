'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGame } from '../GameProvider'
import {
  OUTCOMES,
  OUTCOME_LABEL,
  OUTCOME_SHORT,
  PREDICTION_FAILURE_MESSAGE,
  countCorrect,
  fetchPredictionRounds,
  picksComplete,
  roundAcceptsPicks,
  submitPrediction,
  type PredictionOutcome,
  type RoundView,
} from '../../lib/predictions'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''

/**
 * 빅매치 예측 — call every match in the operator's round and, if all of them
 * land, the gold arrives in the 선물함. Picks can be changed until the
 * deadline; after it the sheet is read-only and results fill in as they come.
 */
export default function PredictionTab() {
  const { account } = useGame()
  const signedIn = account.status === 'signedIn'
  const [rounds, setRounds] = useState<RoundView[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<number, Record<string, PredictionOutcome>>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [notice, setNotice] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const views = await fetchPredictionRounds()
    setRounds(views)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const view of views) if (view.mine && !next[view.round.id]) next[view.round.id] = { ...view.mine.picks }
      return next
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (signedIn) void load()
    else setLoading(false)
  }, [signedIn, load])

  if (!signedIn) {
    return (
      <section className="panel p-6 text-center">
        <p className="text-sm text-slate-500">로그인하면 빅매치 예측에 참여할 수 있습니다.</p>
      </section>
    )
  }
  if (loading) return <p className="p-6 text-sm text-slate-500">불러오는 중...</p>

  const pick = (roundId: number, matchId: number, outcome: PredictionOutcome) =>
    setDrafts((prev) => ({ ...prev, [roundId]: { ...(prev[roundId] ?? {}), [String(matchId)]: outcome } }))

  const submit = async (view: RoundView) => {
    const draft = drafts[view.round.id] ?? {}
    if (!picksComplete(view.matches, draft)) {
      setNotice((prev) => ({ ...prev, [view.round.id]: '모든 경기를 골라야 제출할 수 있습니다.' }))
      return
    }
    setBusy(view.round.id)
    const result = await submitPrediction(view.round.id, draft)
    setBusy(null)
    setNotice((prev) => ({
      ...prev,
      [view.round.id]: result.ok
        ? `제출했습니다. 마감(${fmt(view.round.closes_at)})까지는 바꿀 수 있습니다.`
        : PREDICTION_FAILURE_MESSAGE[result.reason] ?? `제출하지 못했습니다: ${result.reason}`,
    }))
    if (result.ok) void load()
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">빅매치 예측</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          운영자가 올린 이번 주 빅매치의 결과를 경기마다 <b className="text-slate-300">1 (홈 승) · X (무) · 2 (원정 승)</b>로 고르세요.
          <b className="text-amber-300"> 전부 맞히면</b> 골드가 「선물함」으로 옵니다. 한 경기라도 틀리면 보상은 없습니다. 마감 전까지는 몇 번이든 바꿀 수 있습니다.
        </p>
      </section>

      {rounds.length === 0 && (
        <section className="panel p-6 text-center">
          <p className="text-sm text-slate-500">아직 열린 라운드가 없습니다. 빅매치 주간에 올라옵니다.</p>
        </section>
      )}

      {rounds.map((view) => {
        const { round, matches, mine } = view
        const open = roundAcceptsPicks(round)
        const draft = drafts[round.id] ?? {}
        const shown = open ? draft : (mine?.picks ?? {})
        const entered = matches.filter((match) => match.result !== null).length
        const correct = mine ? countCorrect(matches, mine.picks) : 0
        const perfect = round.status === 'settled' && mine && correct === matches.length
        return (
          <section key={round.id} className={`panel p-4 ${open ? 'ring-1 ring-amber-400/30' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black text-slate-100">{round.title}</h4>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                      open ? 'bg-emerald-400/20 text-emerald-200' : round.status === 'settled' ? 'bg-white/10 text-slate-300' : 'bg-amber-400/20 text-amber-200'
                    }`}
                  >
                    {open ? '진행 중' : round.status === 'settled' ? '정산 완료' : '마감 · 결과 대기'}
                  </span>
                </div>
                {round.note && <p className="mt-0.5 text-[11px] text-slate-500">{round.note}</p>}
                <p className="mt-0.5 text-[11px] text-slate-500">
                  마감 {fmt(round.closes_at)} · 참가 {round.entrants}명
                  {round.status === 'settled' && ` · 전부 정답 ${round.winners}명`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">전부 정답 보상</div>
                <div className="text-base font-black tabular-nums text-amber-200">{round.reward_gold.toLocaleString('ko-KR')}G</div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {matches.map((match) => {
                const my = shown[String(match.id)]
                return (
                  <div key={match.id} className="rounded-xl bg-white/5 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {match.league && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{match.league}</span>}
                      <span className="flex-1 font-bold text-slate-100">
                        {match.home} <span className="text-slate-500">vs</span> {match.away}
                      </span>
                      {match.kickoff_at && <span className="text-slate-500">{fmt(match.kickoff_at)}</span>}
                      {match.result && (
                        <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-black text-sky-200">결과 {OUTCOME_LABEL[match.result]}</span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {OUTCOMES.map((outcome) => {
                        const chosen = my === outcome
                        const judged = match.result !== null && chosen
                        const tone = judged
                          ? match.result === outcome
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-rose-500/70 text-white'
                          : chosen
                            ? 'btn-primary'
                            : 'btn-ghost text-slate-400'
                        return (
                          <button
                            key={outcome}
                            type="button"
                            disabled={!open}
                            onClick={() => pick(round.id, match.id, outcome)}
                            className={`rounded-lg px-2 py-1.5 text-[11px] font-black disabled:cursor-default ${tone}`}
                          >
                            <span className="mr-1 opacity-70">{OUTCOME_SHORT[outcome]}</span>
                            {OUTCOME_LABEL[outcome]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {open
                  ? mine
                    ? `제출함 (${fmt(mine.submitted_at)}) · 바꾸면 다시 제출`
                    : '아직 제출하지 않았습니다'
                  : mine
                    ? round.status === 'settled'
                      ? perfect
                        ? '🎉 전부 정답! 보상이 선물함에 들어왔습니다.'
                        : `${correct}/${matches.length} 정답`
                      : `${correct}/${entered} 정답 (결과 ${entered}/${matches.length} 입력됨)`
                    : '참가하지 않은 라운드'}
              </span>
              {open && (
                <button
                  type="button"
                  onClick={() => void submit(view)}
                  disabled={busy === round.id || !picksComplete(matches, draft)}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {mine ? '다시 제출' : '제출'}
                </button>
              )}
            </div>
            {notice[round.id] && <p className="mt-2 text-[11px] font-semibold text-amber-300">{notice[round.id]}</p>}
          </section>
        )
      })}
    </div>
  )
}
