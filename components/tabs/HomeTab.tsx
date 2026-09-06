'use client'

import { useMemo } from 'react'
import { tune } from '../../lib/tuning'
import { isInjured, isSidelined } from '../../lib/condition'
import { CUP_ROUND_LABELS, cupTeamOf, myTie } from '../../lib/cup'
import { DAILY_MISSIONS, miniGamesLeft, missionClaimable } from '../../lib/daily'
import {
  MY_TEAM_ID,
  ROUNDS_PER_SEASON,
  divisionLabel,
  myFixture,
  myRank,
  teamOf,
} from '../../lib/league'
import { SEASON_SCHEDULE, TOTAL_MATCHDAYS } from '../../lib/schedule'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import { MAX_CAPACITY } from '../../lib/vault'
import LockerRoomScene from '../LockerRoomScene'
import EventCalendar from '../EventCalendar'
import { useGame } from '../GameProvider'

/** The room the manager walks into: today's job at a glance. */
export default function HomeTab({ onJump }: { onJump: (tab: string) => void }) {
  const { state } = useGame()
  const division = state.season.division

  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, division),
    [state.cards, state.squad, division],
  )
  const gaps = useMemo(() => missingSlots(rating.evaluations), [rating.evaluations])
  const lineupReady = gaps.empty.length === 0 && gaps.injured.length === 0 && gaps.duplicated.length === 0

  const day = SEASON_SCHEDULE[state.matchday] ?? null
  const isCupDay = day?.kind === 'cup'
  const fixture = myFixture(state.season)
  const tie = myTie(state.cup)
  const cupOver = state.cup.eliminated || Boolean(state.cup.champion)

  const opponent = isCupDay
    ? tie
      ? cupTeamOf(state.cup, tie.home === MY_TEAM_ID ? tie.away : tie.home)
      : null
    : fixture
      ? teamOf(state.season, fixture.home === MY_TEAM_ID ? fixture.away : fixture.home)
      : null
  const venue = isCupDay ? '중립' : fixture?.home === MY_TEAM_ID ? '홈' : '원정'

  const rank = myRank(state.season)
  const injured = state.cards.filter(isInjured).length
  const tired = state.cards.filter(
    (card) => !isSidelined(card) && card.condition < tune('tiredCondition'),
  ).length
  const missionsLeft = DAILY_MISSIONS.filter((mission) => !state.daily.claimed.includes(mission.id))
  const claimable = DAILY_MISSIONS.filter((mission) => missionClaimable(state.daily, mission)).length
  const form = state.history.slice(0, 5)

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1728]">
        <LockerRoomScene className="h-44 w-full sm:h-56" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            감독실
          </div>
          <h2 className="truncate text-xl font-black text-white sm:text-2xl">{state.club}</h2>
          <p className="text-xs font-semibold text-slate-300">
            {divisionLabel(division)} · 시즌 {state.season.index} · {rank}위 · 전력 {rating.overall}
          </p>
        </div>
      </section>

      <EventCalendar onJump={onJump} />

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">다음 경기</h3>
          <span className="whitespace-nowrap text-[11px] font-bold text-slate-500">
            {state.matchday + 1} / {TOTAL_MATCHDAYS} 경기일
          </span>
        </div>

        {state.season.finished ? (
          <p className="mt-3 text-sm font-bold text-amber-300">시즌이 끝났습니다. 결과를 확인하세요.</p>
        ) : isCupDay && cupOver ? (
          <p className="mt-3 text-sm text-slate-400">이번 시즌 컵 일정은 끝났습니다.</p>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-black text-white">
                {opponent?.name ?? '상대 미정'}
              </div>
              <div className="text-xs text-slate-400">
                {isCupDay ? `FA컵 ${CUP_ROUND_LABELS[state.cup.round]}` : `리그 ${state.season.round + 1} / ${ROUNDS_PER_SEASON} 라운드`}{' '}
                · {venue} · 상대 전력 {opponent?.rating ?? '-'}
              </div>
            </div>
            <button
              onClick={() => onJump('match')}
              className="shrink-0 whitespace-nowrap rounded-xl btn-primary px-4 py-2.5 text-sm font-black transition"
            >
              경기장으로
            </button>
          </div>
        )}

        {!lineupReady && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            {gaps.empty.length > 0 && `빈 자리 ${gaps.empty.join(' · ')}`}
            {gaps.empty.length > 0 && (gaps.injured.length > 0 || gaps.duplicated.length > 0) && ' · '}
            {gaps.injured.length > 0 && `부상 ${gaps.injured.join(' · ')}`}
            {gaps.injured.length > 0 && gaps.duplicated.length > 0 && ' · '}
            {gaps.duplicated.length > 0 && `같은 선수 중복 ${gaps.duplicated.join(' · ')}`} — 선발 11명을
            채워야 경기를 시작할 수 있습니다.
          </p>
        )}
        {lineupReady && rating.overCap && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            선발 레벨 합 {rating.levelTotal} / 상한 {rating.levelCap} — 라인업을 등록할 수 없습니다.
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="골드" value={state.gold.toLocaleString()} hint={`조각 ${state.shards}`} />
        <Tile
          label="보관함"
          value={`${state.cards.length} / ${state.capacity}`}
          hint={state.cards.length >= state.capacity ? '가득 참' : `최대 ${MAX_CAPACITY}`}
          alert={state.cards.length >= state.capacity}
        />
        <Tile
          label="스쿼드"
          value={`${rating.overall}`}
          hint={`케미 ${rating.chemistry} · 부상 ${injured} · 지침 ${tired}`}
          alert={injured > 0}
        />
        <Tile
          label="오늘"
          value={`${miniGamesLeft(state.daily)} / ${tune('miniGameLimit')}`}
          hint={state.daily.freeDrawUsed ? '무료 스카우트 완료' : '무료 스카우트 가능'}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">오늘 할 일</h3>
        <ul className="mt-2 space-y-1.5 text-xs">
          {claimable > 0 && (
            <Todo tone="good" onClick={() => onJump('gacha')}>
              받을 수 있는 미션 보상 {claimable}개
            </Todo>
          )}
          {!state.daily.freeDrawUsed && (
            <Todo tone="good" onClick={() => onJump('gacha')}>
              무료 스카우트가 남아 있습니다
            </Todo>
          )}
          {!lineupReady && (
            <Todo tone="bad" onClick={() => onJump('squad')}>
              선발 11명을 채워야 합니다
            </Todo>
          )}
          {injured > 0 && (
            <Todo tone="warn" onClick={() => onJump('club')}>
              부상 {injured}명 — 치료하거나 교체하세요
            </Todo>
          )}
          {state.cards.length >= state.capacity && (
            <Todo tone="warn" onClick={() => onJump('club')}>
              보관함이 가득 찼습니다 — 증설하거나 정리하세요
            </Todo>
          )}
          {missionsLeft.length === 0 && claimable === 0 && state.daily.freeDrawUsed && lineupReady && (
            <li className="text-slate-500">급한 일은 없습니다. 경기를 치르세요.</li>
          )}
        </ul>
      </section>

      {form.length > 0 && (
        <section className="panel p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">최근 전적</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg px-2.5 py-1.5 text-center text-xs ${
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
                <div className="max-w-[84px] truncate opacity-70">{item.opponent}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
  alert,
}: {
  label: string
  value: string
  hint?: string
  alert?: boolean
}) {
  return (
    <div className="panel p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-black ${alert ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </div>
      {hint && <div className="truncate text-[11px] text-slate-500">{hint}</div>}
    </div>
  )
}

function Todo({
  children,
  tone,
  onClick,
}: {
  children: React.ReactNode
  tone: 'good' | 'warn' | 'bad'
  onClick: () => void
}) {
  const color =
    tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-rose-300'
  return (
    <li>
      <button onClick={onClick} className={`text-left font-bold ${color} hover:underline`}>
        · {children}
      </button>
    </li>
  )
}
