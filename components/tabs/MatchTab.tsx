'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MY_TEAM_ID,
  PROMOTION_RANK,
  RELEGATION_RANK,
  ROUNDS_PER_SEASON,
  divisionLabel,
  fixturesOfRound,
  myFixture,
  seasonOutcome,
  simulateAiMatch,
  standings,
  teamOf,
} from '../../lib/league'
import { simulateMatch } from '../../lib/match'
import { evaluateSquad } from '../../lib/squad'
import { TACTICS } from '../../lib/tactics'
import type { MatchResult } from '../../lib/types'
import { useGame, type RoundResult } from '../GameProvider'

const MINUTE_MS = 40

export default function MatchTab() {
  const { state, finishMatch, startNewSeason } = useGame()
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])
  const season = state.season

  const fixture = useMemo(() => myFixture(season), [season])
  const isHome = fixture?.home === MY_TEAM_ID
  const opponent = fixture ? teamOf(season, isHome ? fixture.away : fixture.home) : null
  const table = useMemo(() => standings(season), [season])

  const [live, setLive] = useState<MatchResult | null>(null)
  const [others, setOthers] = useState<RoundResult[]>([])
  const [clock, setClock] = useState(0)
  const [finished, setFinished] = useState(false)
  const settled = useRef(false)

  // A new round means the previous scoreboard is stale.
  useEffect(() => {
    setLive(null)
    setOthers([])
    setClock(0)
    setFinished(false)
    settled.current = false
  }, [season.round, season.index])

  useEffect(() => {
    if (!live || finished || !fixture) return
    if (clock >= 90) {
      setFinished(true)
      if (!settled.current) {
        settled.current = true
        finishMatch(live, fixture, others)
      }
      return
    }
    const timer = setTimeout(() => setClock((minute) => Math.min(90, minute + 1)), MINUTE_MS)
    return () => clearTimeout(timer)
  }, [live, clock, finished, fixture, others, finishMatch])

  const start = () => {
    if (!fixture || !opponent || (live && !finished)) return
    settled.current = false
    setFinished(false)
    setClock(0)
    setOthers(
      fixturesOfRound(season, season.round)
        .filter((item) => item !== fixture)
        .map((item) => {
          const [homeGoals, awayGoals] = simulateAiMatch(
            teamOf(season, item.home),
            teamOf(season, item.away),
          )
          return { home: item.home, away: item.away, homeGoals, awayGoals }
        }),
    )
    setLive(
      simulateMatch({
        team: rating,
        teamName: state.club,
        opponent,
        division: season.division,
        isHome: Boolean(isHome),
        tactic: state.tactic,
      }),
    )
  }

  const shownEvents = live ? live.events.filter((event) => event.minute <= clock) : []
  const scoreFor = shownEvents.filter((e) => e.type === 'goal' && e.side === 'home').length
  const scoreAgainst = shownEvents.filter((e) => e.type === 'goal' && e.side === 'away').length
  const playing = Boolean(live) && !finished
  const outcome = season.finished ? seasonOutcome(season) : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        {season.finished && outcome ? (
          <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              시즌 {season.index} 종료 · {divisionLabel(season.division)}
            </div>
            <div className="mt-2 text-4xl font-black text-white">{outcome.rank}위</div>
            <div
              className={`mt-2 text-sm font-bold ${
                outcome.promoted
                  ? 'text-emerald-300'
                  : outcome.relegated
                    ? 'text-rose-300'
                    : 'text-slate-300'
              }`}
            >
              {outcome.promoted
                ? `승격! 다음 시즌은 ${divisionLabel(outcome.nextDivision)}입니다`
                : outcome.relegated
                  ? `강등... 다음 시즌은 ${divisionLabel(outcome.nextDivision)}입니다`
                  : '리그 잔류'}
            </div>
            <div className="mt-3 text-sm text-slate-400">
              시즌 보상 <span className="font-bold text-amber-300">+{outcome.reward}G</span>
            </div>
            <button
              onClick={startNewSeason}
              className="mt-5 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-emerald-300"
            >
              새 시즌 시작
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  시즌 {season.index} · {divisionLabel(season.division)}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {season.round + 1} / {ROUNDS_PER_SEASON} 라운드
                </h2>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                전술 {TACTICS[state.tactic].label}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/70 p-4">
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm font-bold text-white">{state.club}</div>
                <div className="text-xs text-slate-400">
                  전력 {rating.overall} · {isHome ? '홈' : '원정'}
                </div>
              </div>
              <div className="shrink-0 text-center">
                <div className="text-3xl font-black text-white">
                  {live ? `${scoreFor} : ${scoreAgainst}` : '- : -'}
                </div>
                <div className="text-xs font-semibold text-emerald-300">
                  {live ? `${clock}분` : '킥오프 대기'}
                </div>
              </div>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm font-bold text-white">
                  {opponent?.name ?? '상대 미정'}
                </div>
                <div className="text-xs text-slate-400">전력 {opponent?.rating ?? '-'}</div>
              </div>
            </div>

            <button
              onClick={start}
              disabled={playing || !fixture}
              className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
            >
              {playing ? '경기 진행 중...' : finished ? '이번 라운드 완료' : '경기 시작'}
            </button>
            {rating.filled < 11 && !playing && (
              <p className="mt-2 text-xs font-semibold text-amber-400">
                선발이 {rating.filled}명입니다. 빈 자리는 유스 선수가 대신 뜁니다.
              </p>
            )}

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

            {finished && others.length > 0 && (
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  같은 라운드 다른 경기
                </h3>
                <div className="grid gap-1 sm:grid-cols-3">
                  {others.map((item, index) => (
                    <div key={index} className="text-xs text-slate-300">
                      {teamOf(season, item.home).name}{' '}
                      <span className="font-bold text-white">
                        {item.homeGoals}:{item.awayGoals}
                      </span>{' '}
                      {teamOf(season, item.away).name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!live && (
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  이번 라운드 다른 경기
                </h3>
                <div className="grid gap-1 sm:grid-cols-3">
                  {fixturesOfRound(season, season.round)
                    .filter((item) => item !== fixture)
                    .map((item, index) => (
                      <div key={index} className="text-xs text-slate-300">
                        {teamOf(season, item.home).name}
                        <span className="px-1 text-slate-600">vs</span>
                        {teamOf(season, item.away).name}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="scrollbar-thin mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {shownEvents.length === 0 && live && (
                <p className="py-10 text-center text-sm text-slate-500">
                  경기를 시작하면 중계가 표시됩니다.
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
                    {event.minute}분
                  </span>
                  <span className="min-w-0 flex-1">{event.text}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">순위표</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 text-left font-semibold">순위</th>
                <th className="py-1 text-left font-semibold">팀</th>
                <th className="py-1 text-center font-semibold">경기</th>
                <th className="py-1 text-center font-semibold">득실</th>
                <th className="py-1 text-right font-semibold">승점</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr
                  key={row.team.id}
                  className={`border-t border-white/5 ${
                    row.team.id === MY_TEAM_ID ? 'bg-emerald-400/10 font-bold text-white' : 'text-slate-300'
                  }`}
                >
                  <td className="py-1.5">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                        row.rank <= PROMOTION_RANK
                          ? 'bg-emerald-500/25 text-emerald-300'
                          : row.rank >= RELEGATION_RANK
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'text-slate-500'
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="max-w-[110px] truncate py-1.5">{row.team.name}</td>
                  <td className="py-1.5 text-center">{row.played}</td>
                  <td className="py-1.5 text-center">
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </td>
                  <td className="py-1.5 text-right">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            시즌 종료 시 {PROMOTION_RANK}위 안에 들면 승격, {RELEGATION_RANK}위 아래면 강등됩니다.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">통산 전적</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
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
          {state.history.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {state.history.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${
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
                  <div className="max-w-[80px] truncate opacity-70">{item.opponent}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
