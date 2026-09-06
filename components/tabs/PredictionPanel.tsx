'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  OUTCOMES,
  OUTCOME_LABEL,
  PREDICTION_FAILURE_MESSAGE,
  createPredictionRound,
  fetchPredictionRounds,
  fetchPredictionStats,
  setPredictionResults,
  type NewPredictionMatch,
  type PredictionOutcome,
  type PredictionStats,
  type RoundView,
} from '../../lib/predictions'

const emptyMatch = (): NewPredictionMatch => ({ league: '', home: '', away: '', kickoffAt: null })
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }) : '-')

/**
 * 예측 — the operator's side of 빅매치 예측: post a round, then type the
 * results in as the matches finish. The last result settles the round and
 * mails the gold to everyone who called every match.
 */
export default function PredictionPanel() {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [reward, setReward] = useState(5000)
  const [matches, setMatches] = useState<NewPredictionMatch[]>([emptyMatch(), emptyMatch(), emptyMatch(), emptyMatch()])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [rounds, setRounds] = useState<RoundView[]>([])
  const [results, setResults] = useState<Record<number, Record<string, PredictionOutcome | ''>>>({})
  const [stats, setStats] = useState<Record<number, PredictionStats>>({})

  const load = useCallback(async () => {
    const views = await fetchPredictionRounds(12)
    setRounds(views)
    setResults((prev) => {
      const next = { ...prev }
      for (const view of views) {
        if (!next[view.round.id]) next[view.round.id] = Object.fromEntries(view.matches.map((m) => [String(m.id), m.result ?? '']))
      }
      return next
    })
    const pairs = await Promise.all(views.map(async (view) => [view.round.id, await fetchPredictionStats(view.round.id)] as const))
    setStats(Object.fromEntries(pairs.filter(([, s]) => s !== null)) as Record<number, PredictionStats>)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filled = matches.filter((m) => m.home.trim() && m.away.trim())
  const canCreate = title.trim().length > 0 && closesAt !== '' && filled.length > 0 && !busy

  const create = async () => {
    if (!canCreate) return
    setBusy(true)
    const result = await createPredictionRound({
      title: title.trim(),
      note: note.trim(),
      closesAt: new Date(closesAt).toISOString(),
      rewardGold: Math.max(0, Math.floor(reward)),
      matches: filled.map((m) => ({ ...m, home: m.home.trim(), away: m.away.trim(), league: m.league.trim(), kickoffAt: m.kickoffAt ? new Date(m.kickoffAt).toISOString() : null })),
    })
    setBusy(false)
    if (!result.ok) {
      setNotice(PREDICTION_FAILURE_MESSAGE[result.reason] ?? `만들지 못했습니다: ${result.reason}`)
      return
    }
    setNotice(`라운드 #${result.roundId}를 열었습니다. 유저 미니게임 탭에 바로 보입니다.`)
    setTitle('')
    setNote('')
    setClosesAt('')
    setMatches([emptyMatch(), emptyMatch(), emptyMatch(), emptyMatch()])
    void load()
  }

  const save = async (view: RoundView) => {
    const sheet = results[view.round.id] ?? {}
    const missing = view.matches.filter((m) => !sheet[String(m.id)]).length
    const closed = Date.parse(view.round.closes_at) <= Date.now()
    if (missing === 0 && closed && !window.confirm(`결과가 모두 들어갔습니다. 저장하면 라운드가 정산되고 전부 정답인 감독에게 ${view.round.reward_gold.toLocaleString('ko-KR')}G가 선물로 나갑니다. 진행할까요?`)) return
    setBusy(true)
    const result = await setPredictionResults(view.round.id, sheet)
    setBusy(false)
    if (!result.ok) {
      setNotice(PREDICTION_FAILURE_MESSAGE[result.reason] ?? `저장하지 못했습니다: ${result.reason}`)
      return
    }
    setNotice(
      result.settled
        ? `라운드 #${view.round.id} 정산 완료 — 전부 정답 ${result.winners}명에게 선물을 보냈습니다.`
        : `결과를 저장했습니다. ${result.missing > 0 ? `아직 ${result.missing}경기 결과가 비어 있습니다.` : '마감 시각이 지나면 정산됩니다.'}`,
    )
    void load()
  }

  const field = 'w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600'

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="panel space-y-4 p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">빅매치 예측 라운드 만들기</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            유저는 마감 전까지 경기마다 홈 승·무·원정 승을 고르고, <b>전부 맞힌 사람만</b> 보상 골드를 선물함으로 받습니다.
            실제 경기를 맞히는 퀴즈라 리그·클럽 이름은 실제 이름(프리미어리그, 리버풀 등)으로 적어도 됩니다. 로고·엠블럼은 쓰지 않습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            제목 (60자)
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="예: 9월 2주 4대 리그 빅매치" className={`${field} mt-1`} />
          </label>
          <label className="block text-xs text-slate-400">
            마감 시각 (KST)
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs text-slate-400 sm:col-span-2">
            안내 문구 (300자, 선택)
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="예: 첫 경기 킥오프 1시간 전 마감" className={`${field} mt-1`} />
          </label>
          <label className="block text-xs text-slate-400">
            전부 정답 보상 골드
            <input type="number" min={0} step={500} value={reward} onChange={(e) => setReward(Number(e.target.value))} className={`${field} mt-1`} />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">경기 ({filled.length}개 입력됨, 최대 16)</span>
            <button type="button" onClick={() => setMatches((prev) => (prev.length >= 16 ? prev : [...prev, emptyMatch()]))} className="rounded-lg btn-ghost px-2.5 py-1 text-[11px] font-bold">
              + 경기 추가
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {matches.map((m, index) => (
              <div key={index} className="grid gap-2 rounded-xl bg-white/5 p-2 sm:grid-cols-[90px_1fr_1fr_170px_auto]">
                <input value={m.league} onChange={(e) => setMatches((prev) => prev.map((x, i) => (i === index ? { ...x, league: e.target.value.slice(0, 30) } : x)))} placeholder="리그" className={field} />
                <input value={m.home} onChange={(e) => setMatches((prev) => prev.map((x, i) => (i === index ? { ...x, home: e.target.value.slice(0, 40) } : x)))} placeholder="홈 클럽" className={field} />
                <input value={m.away} onChange={(e) => setMatches((prev) => prev.map((x, i) => (i === index ? { ...x, away: e.target.value.slice(0, 40) } : x)))} placeholder="원정 클럽" className={field} />
                <input type="datetime-local" value={m.kickoffAt ?? ''} onChange={(e) => setMatches((prev) => prev.map((x, i) => (i === index ? { ...x, kickoffAt: e.target.value || null } : x)))} className={field} />
                <button type="button" onClick={() => setMatches((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg btn-ghost px-2 text-xs text-slate-400" title="이 줄 삭제">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">{notice}</span>
          <button type="button" onClick={() => void create()} disabled={!canCreate} className="rounded-lg btn-primary px-4 py-2 text-sm font-black disabled:opacity-40">
            라운드 열기
          </button>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">라운드 · 결과 입력</h3>
        {rounds.length === 0 && <p className="text-xs text-slate-500">아직 라운드가 없습니다.</p>}
        {rounds.map((view) => {
          const sheet = results[view.round.id] ?? {}
          const stat = stats[view.round.id]
          const settled = view.round.status === 'settled'
          return (
            <div key={view.round.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-black text-slate-100">
                  #{view.round.id} {view.round.title}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${settled ? 'bg-white/10 text-slate-300' : 'bg-emerald-400/20 text-emerald-200'}`}>
                  {settled ? `정산 · 전부 정답 ${view.round.winners}명` : Date.parse(view.round.closes_at) > Date.now() ? '진행 중' : '마감 · 결과 대기'}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                마감 {fmt(view.round.closes_at)} · 보상 {view.round.reward_gold.toLocaleString('ko-KR')}G · 참가 {stat?.entrants ?? view.round.entrants}명
              </p>
              <div className="mt-2 space-y-1">
                {view.matches.map((m) => {
                  const dist = stat?.matches.find((x) => x.matchId === m.id)
                  return (
                    <div key={m.id} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="min-w-0 flex-1 truncate text-slate-200">
                        {m.league && <span className="mr-1 text-slate-500">{m.league}</span>}
                        {m.home} vs {m.away}
                        {dist && <span className="ml-1 text-slate-500">({dist.H}/{dist.D}/{dist.A})</span>}
                      </span>
                      <select
                        value={sheet[String(m.id)] ?? ''}
                        disabled={settled}
                        onChange={(e) => setResults((prev) => ({ ...prev, [view.round.id]: { ...(prev[view.round.id] ?? {}), [String(m.id)]: e.target.value as PredictionOutcome | '' } }))}
                        className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white"
                      >
                        <option className="bg-slate-900 text-slate-100" value="">결과 없음</option>
                        {OUTCOMES.map((o) => (
                          <option className="bg-slate-900 text-slate-100" key={o} value={o}>
                            {OUTCOME_LABEL[o]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
              {!settled && (
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => void save(view)} disabled={busy} className="rounded-lg btn-primary px-3 py-1.5 text-[11px] font-black disabled:opacity-40">
                    결과 저장{view.matches.every((m) => sheet[String(m.id)]) && Date.parse(view.round.closes_at) <= Date.now() ? ' · 정산' : ''}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
