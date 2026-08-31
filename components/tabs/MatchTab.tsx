'use client'

import { useEffect, useMemo, useState } from 'react'
import { applyAutoSubs, type SubEvent } from '../../lib/autoSub'
import { isInjured, TIRED_CONDITION } from '../../lib/condition'
import { CUP_ROUND_LABELS, cupTeamOf, myTie, tiesOfRound, type CupTie } from '../../lib/cup'
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
import { SEASON_SCHEDULE, TOTAL_MATCHDAYS } from '../../lib/schedule'
import { evaluateSquad } from '../../lib/squad'
import { TACTICS } from '../../lib/tactics'
import type { Squad } from '../../lib/types'
import MatchBroadcast from '../MatchBroadcast'
import { useGame, type RoundResult } from '../GameProvider'
import { useLiveMatch } from '../useLiveMatch'

export default function MatchTab() {
  const { state } = useGame()
  const [side, setSide] = useState<'table' | 'cup'>('table')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        {state.season.finished ? <SeasonEnd /> : <MatchDay />}
      </section>

      <div className="space-y-4">
        <Schedule />
        <div className="flex gap-2">
          {(['table', 'cup'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSide(key)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                side === key
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {key === 'table' ? '리그 순위' : 'FA컵 대진'}
            </button>
          ))}
        </div>
        {side === 'table' ? <LeagueTable /> : <CupBracket />}
        <ClubForm />
      </div>
    </div>
  )
}

function MatchDay() {
  const { state, finishMatch, finishCupMatch, skipMatchday } = useGame()
  const day = SEASON_SCHEDULE[state.matchday] ?? null
  const division = state.season.division

  const [pending, setPending] = useState<{ squad: Squad; others: RoundResult[] } | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, division),
    [state.cards, state.squad, division],
  )

  const fixture = useMemo(() => myFixture(state.season), [state.season])
  const tie = useMemo(() => myTie(state.cup), [state.cup])
  const isCupDay = day?.kind === 'cup'
  const cupOver = state.cup.eliminated || Boolean(state.cup.champion)

  const isHome = isCupDay ? false : fixture?.home === MY_TEAM_ID
  const opponent = isCupDay
    ? tie
      ? cupTeamOf(state.cup, tie.home === MY_TEAM_ID ? tie.away : tie.home)
      : null
    : fixture
      ? teamOf(state.season, isHome ? fixture.away : fixture.home)
      : null

  // Substitutions are worked out when the match starts; kept for the payload.
  const [subs, setSubs] = useState<SubEvent[]>([])

  const live = useLiveMatch((result) => {
    if (!pending) return
    const lineup = { squad: pending.squad, subs }
    if (isCupDay) finishCupMatch(result, rating.overall, lineup)
    else if (fixture) finishMatch(result, fixture, pending.others, lineup)
  })

  useEffect(() => {
    live.reset()
    setPending(null)
    setSubs([])
    setBlocked(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matchday, state.season.index])

  if (!day) return <p className="py-10 text-center text-sm text-slate-500">시즌 일정이 끝났습니다.</p>

  if (isCupDay && cupOver) {
    const champion = state.cup.champion ? cupTeamOf(state.cup, state.cup.champion) : null
    return (
      <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {state.matchday + 1}번째 경기일 · FA컵
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          {state.cup.champion === MY_TEAM_ID ? '컵 우승 🏆' : '컵 탈락'}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {state.cup.champion === MY_TEAM_ID
            ? '트로피를 들어올렸습니다.'
            : `우승팀: ${champion?.name ?? '진행 중'}`}
        </p>
        <button
          onClick={skipMatchday}
          className="mt-5 rounded-xl bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
        >
          이 경기일 건너뛰기
        </button>
      </div>
    )
  }

  const start = () => {
    if (!opponent || live.playing) return
    if (rating.overCap) {
      setBlocked(
        `선발 레벨 합계가 ${rating.levelTotal}로 상한 ${rating.levelCap}을 넘었습니다. 스쿼드에서 낮은 레벨 선수로 바꿔주세요.`,
      )
      return
    }
    setBlocked(null)

    const auto = state.autoSub
      ? applyAutoSubs(state.cards, state.squad, division)
      : { squad: state.squad, subs: [] }
    setSubs(auto.subs)

    const matchRating = evaluateSquad(state.cards, auto.squad, division)
    const others = isCupDay
      ? []
      : fixturesOfRound(state.season, state.season.round)
          .filter((item) => item !== fixture)
          .map((item) => {
            const [homeGoals, awayGoals] = simulateAiMatch(
              teamOf(state.season, item.home),
              teamOf(state.season, item.away),
            )
            return { home: item.home, away: item.away, homeGoals, awayGoals }
          })

    setPending({ squad: auto.squad, others })
    live.start(
      simulateMatch({
        team: matchRating,
        teamName: state.club,
        opponent,
        division,
        venue: isCupDay ? 'neutral' : isHome ? 'home' : 'away',
        tactic: state.tactic,
        traits: matchRating.traits,
      }),
    )
  }

  const injured = state.cards.filter(isInjured).length
  const tired = state.cards.filter(
    (card) => !isInjured(card) && card.condition < TIRED_CONDITION,
  ).length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div
            className={`text-xs font-bold uppercase tracking-widest ${
              isCupDay ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {state.matchday + 1} / {TOTAL_MATCHDAYS} 경기일 ·{' '}
            {isCupDay ? `FA컵 ${CUP_ROUND_LABELS[state.cup.round]}` : divisionLabel(division)}
          </div>
          <h2 className="text-lg font-bold text-white">
            {isCupDay
              ? `FA컵 ${CUP_ROUND_LABELS[state.cup.round]}`
              : `리그 ${state.season.round + 1} / ${ROUNDS_PER_SEASON} 라운드`}
          </h2>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            전술 {TACTICS[state.tactic].label}
          </span>
          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              state.autoSub ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400'
            }`}
          >
            자동 교체 {state.autoSub ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <MatchBroadcast
        home={{
          name: state.club,
          detail: `전력 ${rating.overall} · ${isCupDay ? '중립' : isHome ? '홈' : '원정'}`,
        }}
        away={{
          name: live.result?.opponent ?? opponent?.name ?? '상대 미정',
          detail: `전력 ${live.result?.opponentRating ?? opponent?.rating ?? '-'}`,
        }}
        live={live}
        emptyLabel="경기를 시작하면 중계가 표시됩니다."
      />

      <button
        onClick={start}
        disabled={live.playing || !opponent}
        className={`mt-4 w-full rounded-xl px-4 py-3 font-bold text-slate-900 transition disabled:opacity-40 ${
          isCupDay ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
        }`}
      >
        {live.playing ? '경기 진행 중...' : live.finished ? '다음 경기일로' : '경기 시작'}
      </button>

      {rating.overCap && (
        <p className="mt-2 text-xs font-semibold text-rose-400">
          선발 레벨 합계 {rating.levelTotal} / 상한 {rating.levelCap} — 라인업을 등록할 수 없습니다.
        </p>
      )}
      {blocked && <p className="mt-2 text-xs font-semibold text-rose-400">{blocked}</p>}
      {(injured > 0 || tired > 0) && (
        <p className="mt-2 text-xs font-semibold text-amber-400">
          부상 {injured}명 · 체력 저하 {tired}명
          {state.autoSub && ' — 자동 교체가 벤치에서 대체 선수를 투입합니다.'}
        </p>
      )}

      {live.finished && state.lastSubs.length > 0 && (
        <div className="mt-4 rounded-xl bg-sky-500/10 p-3">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-300">
            자동 교체
          </h3>
          {state.lastSubs.map((sub) => (
            <div key={sub.slotId} className="text-xs text-slate-300">
              {sub.outName} → <span className="font-bold text-white">{sub.inName}</span>{' '}
              <span className="text-slate-500">
                ({sub.reason === 'injury' ? '부상' : '체력 저하'})
              </span>
            </div>
          ))}
        </div>
      )}

      {live.finished && <MatchRatings />}

      {live.finished && pending && pending.others.length > 0 && (
        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            같은 라운드 다른 경기
          </h3>
          <div className="grid gap-1 sm:grid-cols-2">
            {pending.others.map((item, index) => (
              <div key={index} className="text-xs text-slate-300">
                {teamOf(state.season, item.home).name}{' '}
                <span className="font-bold text-white">
                  {item.homeGoals}:{item.awayGoals}
                </span>{' '}
                {teamOf(state.season, item.away).name}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function SeasonEnd() {
  const { state, startNewSeason } = useGame()
  const outcome = seasonOutcome(state.season)

  return (
    <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
        시즌 {state.season.index} 종료 · {divisionLabel(state.season.division)}
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
      <p className="mt-2 text-xs text-slate-500">
        새 시즌에는 모든 선수의 체력이 회복되고 부상도 낫습니다.
      </p>
      <button
        onClick={startNewSeason}
        className="mt-5 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-emerald-300"
      >
        새 시즌 시작
      </button>
    </div>
  )
}

function Schedule() {
  const { state } = useGame()
  const upcoming = SEASON_SCHEDULE.slice(state.matchday, state.matchday + 6)

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">다음 일정</h3>
      <div className="space-y-1">
        {upcoming.map((day, index) => (
          <div
            key={day.index}
            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
              index === 0 ? 'bg-emerald-400/10 font-bold text-white' : 'text-slate-400'
            }`}
          >
            <span>{day.index + 1}경기일</span>
            <span
              className={
                day.kind === 'cup' ? 'font-bold text-amber-300' : 'text-slate-300'
              }
            >
              {day.kind === 'cup'
                ? `FA컵 ${CUP_ROUND_LABELS[day.round] ?? ''}`
                : `리그 ${day.round + 1}R`}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        리그와 컵 일정이 섞여 있습니다. 체력 관리를 못 하면 두 대회를 함께 치를 수 없습니다.
      </p>
    </section>
  )
}

function MatchRatings() {
  const { state } = useGame()
  const ratings = [...state.lastRatings].sort((a, b) => b.rating - a.rating)
  if (ratings.length === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-white/5 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">경기 평점</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        {ratings.map((item) => (
          <div key={item.uid} className="flex items-center gap-2 text-xs">
            <span
              className={`w-9 shrink-0 rounded px-1 py-0.5 text-center font-bold ${
                item.rating >= 8
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : item.rating >= 6.5
                    ? 'bg-white/10 text-slate-200'
                    : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {item.rating.toFixed(1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-300">{item.name}</span>
            {item.goals > 0 && <span className="shrink-0 text-[10px]">⚽{item.goals}</span>}
            <span className="shrink-0 text-[10px] text-sky-300">+{item.exp}exp</span>
            {item.levelUp && (
              <span className="shrink-0 rounded bg-amber-400 px-1 text-[10px] font-black text-slate-900">
                LV UP
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeagueTable() {
  const { state } = useGame()
  const table = useMemo(() => standings(state.season), [state.season])

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        {divisionLabel(state.season.division)} 순위표
      </h3>
      <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900">
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
                  row.team.id === MY_TEAM_ID
                    ? 'bg-emerald-400/10 font-bold text-white'
                    : 'text-slate-300'
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
                <td className="py-1.5 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="py-1.5 text-right">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {PROMOTION_RANK}위 안에 들면 승격, {RELEGATION_RANK}위 아래면 강등됩니다.
      </p>
    </section>
  )
}

function CupBracket() {
  const { state } = useGame()
  const cup = state.cup

  const line = (tie: CupTie) => {
    const home = cupTeamOf(cup, tie.home)
    const away = cupTeamOf(cup, tie.away)
    const played = tie.homeGoals !== null && tie.awayGoals !== null
    const mine = tie.home === MY_TEAM_ID || tie.away === MY_TEAM_ID
    return (
      <div
        key={`${tie.round}-${tie.home}-${tie.away}`}
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${
          mine ? 'bg-emerald-400/10 font-bold text-white' : 'text-slate-300'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{home.name}</span>
        <span className="shrink-0 font-bold text-slate-200">
          {played ? `${tie.homeGoals} : ${tie.awayGoals}` : 'vs'}
          {tie.shootout && (
            <span className="ml-1 text-[10px] text-amber-300">
              (승부차기 {tie.shootout[0]}:{tie.shootout[1]})
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-right">{away.name}</span>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        FA컵 {cup.index}회 대진
      </h3>
      <div className="scrollbar-thin max-h-[420px] space-y-3 overflow-y-auto">
        {CUP_ROUND_LABELS.map((label, round) => {
          const ties = tiesOfRound(cup, round)
          if (ties.length === 0) return null
          return (
            <div key={label}>
              <div className="mb-1 text-[11px] font-bold text-slate-500">{label}</div>
              <div className="space-y-1">{ties.map(line)}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        통산 컵 우승 {state.trophies.cup}회 · 승격 {state.trophies.promotions}회
      </div>
    </section>
  )
}

function ClubForm() {
  const { state } = useGame()
  return (
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
                {item.competition === 'cup' && (
                  <span className="ml-1 text-[10px] text-amber-300">컵</span>
                )}
              </div>
              <div className="max-w-[80px] truncate opacity-70">{item.opponent}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
