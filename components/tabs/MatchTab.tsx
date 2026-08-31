'use client'

import { useEffect, useMemo, useState } from 'react'
import { isInjured, TIRED_CONDITION } from '../../lib/condition'
import {
  CUP_ROUND_LABELS,
  cupTeamOf,
  myTie,
  tiesOfRound,
  type CupTie,
} from '../../lib/cup'
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
import MatchBroadcast from '../MatchBroadcast'
import { useGame, type RoundResult } from '../GameProvider'
import { useLiveMatch } from '../useLiveMatch'

type View = 'league' | 'cup'

export default function MatchTab() {
  const { state } = useGame()
  const [view, setView] = useState<View>('league')
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-4 flex gap-2">
          {(['league', 'cup'] as View[]).map((key) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                view === key
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {key === 'league' ? '리그' : 'FA컵'}
            </button>
          ))}
        </div>
        {view === 'league' ? <LeaguePanel rating={rating} /> : <CupPanel rating={rating} />}
      </section>

      <div className="space-y-4">
        {view === 'league' ? <LeagueTable /> : <CupBracket />}
        <ClubForm />
      </div>
    </div>
  )
}

function SquadAlert() {
  const { state } = useGame()
  const injured = state.cards.filter(isInjured).length
  const tired = state.cards.filter(
    (card) => !isInjured(card) && card.condition < TIRED_CONDITION,
  ).length
  const starters = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
  const injuredStarters = state.cards.filter(
    (card) => starters.has(card.uid) && isInjured(card),
  ).length

  if (injured + tired === 0) return null
  return (
    <p className="mt-2 text-xs font-semibold text-amber-400">
      부상 {injured}명 · 체력 저하 {tired}명
      {injuredStarters > 0 && ` — 선발에 부상 선수가 ${injuredStarters}명 있습니다. 교체하세요.`}
    </p>
  )
}

function LeaguePanel({ rating }: { rating: ReturnType<typeof evaluateSquad> }) {
  const { state, finishMatch, startNewSeason } = useGame()
  const season = state.season
  const fixture = useMemo(() => myFixture(season), [season])
  const isHome = fixture?.home === MY_TEAM_ID
  const opponent = fixture ? teamOf(season, isHome ? fixture.away : fixture.home) : null
  const [others, setOthers] = useState<RoundResult[]>([])

  const live = useLiveMatch((result) => {
    if (fixture) finishMatch(result, fixture, others)
  })

  useEffect(() => {
    // Only a brand new season clears the board; the round that just finished
    // stays on screen so the result and the player marks can be read.
    live.reset()
    setOthers([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season.index])

  const outcome = season.finished ? seasonOutcome(season) : null

  if (season.finished && outcome) {
    return (
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

  const start = () => {
    if (!fixture || !opponent || live.playing) return
    live.reset()
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
    live.start(
      simulateMatch({
        team: rating,
        teamName: state.club,
        opponent,
        division: season.division,
        venue: isHome ? 'home' : 'away',
        tactic: state.tactic,
        traits: rating.traits,
      }),
    )
  }

  return (
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

      <MatchBroadcast
        home={{ name: state.club, detail: `전력 ${rating.overall} · ${isHome ? '홈' : '원정'}` }}
        away={{
          name: live.result?.opponent ?? opponent?.name ?? '상대 미정',
          detail: `전력 ${live.result?.opponentRating ?? opponent?.rating ?? '-'}`,
        }}
        live={live}
      />

      <button
        onClick={start}
        disabled={live.playing || !fixture}
        className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
      >
        {live.playing
          ? '경기 진행 중...'
          : live.finished
            ? `${season.round + 1}라운드 경기 시작`
            : '경기 시작'}
      </button>
      {rating.filled < 11 && !live.playing && (
        <p className="mt-2 text-xs font-semibold text-amber-400">
          출전 가능한 선발이 {rating.filled}명입니다. 빈 자리는 유스 선수가 대신 뜁니다.
        </p>
      )}
      <SquadAlert />

      {!live.result && (
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

      {live.finished && <MatchRatings />}

      {live.finished && others.length > 0 && (
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
    </>
  )
}

function CupPanel({ rating }: { rating: ReturnType<typeof evaluateSquad> }) {
  const { state, finishCupMatch } = useGame()
  const cup = state.cup
  const tie = useMemo(() => myTie(cup), [cup])
  const iAmHome = tie?.home === MY_TEAM_ID
  const opponent = tie ? cupTeamOf(cup, iAmHome ? tie.away : tie.home) : null

  const live = useLiveMatch((result) => finishCupMatch(result, rating.overall))

  useEffect(() => {
    live.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cup.index])

  const done = cup.eliminated || Boolean(cup.champion)

  if (done) {
    const champion = cup.champion ? cupTeamOf(cup, cup.champion) : null
    const won = cup.champion === MY_TEAM_ID
    return (
      <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          FA컵 {cup.index}회
        </div>
        <div className="mt-2 text-3xl font-black text-white">{won ? '우승! 🏆' : '탈락'}</div>
        <div className="mt-2 text-sm text-slate-300">
          {won ? '트로피를 들어올렸습니다.' : `우승팀: ${champion?.name ?? '미정'}`}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          다음 시즌이 시작되면 새로운 컵 대회에 다시 출전합니다.
        </p>
        <div className="mt-4 text-sm text-slate-400">
          통산 우승 <span className="font-bold text-amber-300">{state.trophies.cup}회</span>
        </div>
      </div>
    )
  }

  const start = () => {
    if (!tie || !opponent || live.playing) return
    live.reset()
    live.start(
      simulateMatch({
        team: rating,
        teamName: state.club,
        opponent,
        division: state.season.division,
        venue: 'neutral',
        tactic: state.tactic,
        traits: rating.traits,
      }),
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
          FA컵 {cup.index}회 · 녹아웃
        </div>
        <h2 className="text-lg font-bold text-white">{CUP_ROUND_LABELS[cup.round]}</h2>
        <p className="text-xs text-slate-500">
          비기면 승부차기로 승자를 가립니다. 지면 이번 시즌 컵은 끝입니다.
        </p>
      </div>

      <MatchBroadcast
        home={{ name: state.club, detail: `전력 ${rating.overall} · 중립` }}
        away={{
          name: live.result?.opponent ?? opponent?.name ?? '상대 미정',
          detail: `전력 ${live.result?.opponentRating ?? opponent?.rating ?? '-'}`,
        }}
        live={live}
        emptyLabel="컵 경기를 시작하면 중계가 표시됩니다."
      />

      <button
        onClick={start}
        disabled={live.playing || !tie}
        className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
      >
        {live.playing
          ? '경기 진행 중...'
          : live.finished
            ? `${CUP_ROUND_LABELS[cup.round]} 경기 시작`
            : '컵 경기 시작'}
      </button>
      <SquadAlert />
      {live.finished && <MatchRatings />}
    </>
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
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        시즌 종료 시 {PROMOTION_RANK}위 안에 들면 승격, {RELEGATION_RANK}위 아래면 강등됩니다.
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
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">컵 대진표</h3>
      <div className="space-y-3">
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
