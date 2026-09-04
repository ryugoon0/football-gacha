'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LINES, PLANS, PRESSINGS, TEMPOS, DEFAULT_TACTIC, type TacticSetup } from '../lib/tactics'
import {
  LIVE_COMMAND_FAILURE_MESSAGE,
  getWeeklyLiveState,
  pitchStateOf,
  submitWeeklyCommand,
  type WeeklyLiveView,
} from '../lib/weeklyLive'
import PitchView from './PitchView'
import TacticCardHelp from './TacticCardHelp'
import { isHotTime } from '../lib/weeklyLeague/rewards'
import { TACTIC_CARDS, TACTIC_CARD_IDS, boostLabel, type TacticCardId } from '../lib/weeklyLeague/tacticCards'
import { itemCount } from '../lib/items'
import { useGame } from './GameProvider'

/**
 * A live weekly fixture, as the server replays it. Polls get_state every few
 * seconds — the server is the only clock, so two managers watching the same
 * match see the same minute and the same events. A participant's orders
 * (tactic dials, substitutions) go to the server and land at the next
 * stoppage; the feed shows exactly when each one took effect.
 *
 * docs/WEEKLY_LIVE_MATCH_DESIGN.md — 2단계. Text feed first; a pitch view
 * can come later, the state it would need is already in `state`.
 */
/** 10 real seconds = 1 match minute, so 3s live polling never skips a minute; idle screens poll slower. */
const POLL_MS_LIVE = 3000
const POLL_MS_IDLE = 8000

export default function WeeklyLiveMatch({
  fixtureId,
  onClose,
  onPlayed,
}: {
  fixtureId: number
  onClose: () => void
  /** Fired once when the fixture is seen settled — the moment its rewards exist. */
  onPlayed?: () => void
}) {
  const { state: game, consumeItem } = useGame()
  const [view, setView] = useState<WeeklyLiveView | null>(null)
  const playedNotified = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tactic, setTactic] = useState<TacticSetup>(DEFAULT_TACTIC)
  const [subSlot, setSubSlot] = useState<string>('')
  const [subIn, setSubIn] = useState<string>('')
  // Same two ways to watch as casual mode; here the pitch sits above the feed.
  const [showPitch, setShowPitch] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const feedRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    const result = await getWeeklyLiveState(fixtureId)
    if (!result.ok) {
      setError(LIVE_COMMAND_FAILURE_MESSAGE[result.reason] ?? '경기 정보를 불러오지 못했습니다.')
      return
    }
    setError(null)
    setView(result.view)
    if (result.view.status === 'played' && !playedNotified.current) {
      playedNotified.current = true
      onPlayed?.()
    }
  }, [fixtureId, onPlayed])

  const pollMs = view?.status === 'live' || view?.status === 'pre' ? POLL_MS_LIVE : POLL_MS_IDLE
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(timer)
  }, [refresh, pollMs])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [view])

  const isParticipant = Boolean(view && view.side)
  // Orders are open from three minutes before kick-off ('pre') through the
  // live window; a 'pre' order is stamped minute 0 and lands at kick-off.
  const live = view?.status === 'live' || view?.status === 'pre' ? view : null
  const lineup = live?.lineup ?? null

  const sendTactic = async () => {
    setBusy(true)
    const result = await submitWeeklyCommand(fixtureId, { kind: 'tactic', tactic })
    setBusy(false)
    setNotice(
      result.ok
        ? `전술 지시 접수 (${result.minute}분) — 다음 정지 때 적용됩니다`
        : LIVE_COMMAND_FAILURE_MESSAGE[result.reason] ?? '지시를 보내지 못했습니다.',
    )
    void refresh()
  }

  const playCard = async (cardId: TacticCardId) => {
    setBusy(true)
    const result = await submitWeeklyCommand(fixtureId, { kind: 'card', cardId })
    setBusy(false)
    if (result.ok) {
      // The server accepted it against the save it last saw; the copy comes
      // off the shelf here so the next sync agrees.
      if (!result.duplicate) consumeItem(cardId)
      setNotice(`히든 카드 ${TACTIC_CARDS[cardId].name} — 킥오프와 함께 발동합니다`)
    } else {
      setNotice(LIVE_COMMAND_FAILURE_MESSAGE[result.reason] ?? '히든 카드를 쓰지 못했습니다.')
    }
    void refresh()
  }

  const sendAutoSub = async () => {
    setBusy(true)
    const result = await submitWeeklyCommand(fixtureId, { kind: 'autosub' })
    setBusy(false)
    setNotice(
      result.ok
        ? `지친 선수 교체 지시 접수 (${result.minute}분) — 다음 정지 때 체력이 부족한 선수를 빼고 투입합니다`
        : LIVE_COMMAND_FAILURE_MESSAGE[result.reason] ?? '지시를 보내지 못했습니다.',
    )
    void refresh()
  }

  const sendSub = async () => {
    if (!subSlot || !subIn) return
    setBusy(true)
    const result = await submitWeeklyCommand(fixtureId, { kind: 'substitution', slotId: subSlot, inUid: subIn })
    setBusy(false)
    setNotice(
      result.ok
        ? `교체 지시 접수 (${result.minute}분) — 다음 정지 때 투입됩니다`
        : LIVE_COMMAND_FAILURE_MESSAGE[result.reason] ?? '지시를 보내지 못했습니다.',
    )
    setSubSlot('')
    setSubIn('')
    void refresh()
  }

  const events = useMemo(() => (view && 'state' in view ? view.state.events : []), [view])

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-slate-950/80 p-4">
      {showHelp && <TacticCardHelp onClose={() => setShowHelp(false)} />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {view?.status === 'live'
              ? 'LIVE'
              : view?.status === 'pre'
                ? '킥오프 준비'
                : view?.status === 'upcoming'
                  ? '킥오프 전'
                  : '경기 종료'}
          </div>
          <h3 className="mt-1 text-base font-black text-white">
            {view ? `${view.home} vs ${view.away}` : '불러오는 중...'}
          </h3>
          {view && 'kickoffAt' in view && isHotTime(Date.parse(view.kickoffAt)) && (
            <div className="mt-1 inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
              🔥 핫타임 — 지시를 하나라도 내리면 보너스 골드
            </div>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/20">
          닫기
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {view?.status === 'upcoming' && (
        <p className="mt-3 text-sm text-slate-400">
          {Math.max(1, Math.ceil(view.secondsToKickoff / 60))}분 뒤 킥오프. 10분 전부터 입장해 라인업을 확인하고 지시를 준비할 수 있고, 킥오프 뒤 15분 동안 경기가 진행됩니다.
        </p>
      )}

      {view?.status === 'pre' && (
        <p className="mt-3 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-100">
          킥오프 {Math.max(0, view.secondsToKickoff)}초 전 — 라인업이 확정됐습니다. 지금 내리는 지시는 킥오프와 함께 적용됩니다.
        </p>
      )}

      {view && 'state' in view && (
        <>
          <div className="mt-3 flex items-center justify-center gap-4 rounded-xl bg-white/5 py-3">
            <span className="text-3xl font-black tabular-nums text-white">{view.state.scoreHome}</span>
            <span className="text-xs text-slate-500">
              {view.state.finished ? '종료' : `${view.state.minute}'`}
              {view.state.stoppage ? ` · ${view.state.stoppage}` : ''}
            </span>
            <span className="text-3xl font-black tabular-nums text-white">{view.state.scoreAway}</span>
          </div>
          <div className="mt-1 flex justify-between px-2 text-[11px] text-slate-500">
            <span>슛 {view.state.shotsHome} · 점유 {view.state.possessionHome}%</span>
            <span>점유 {100 - view.state.possessionHome}% · 슛 {view.state.shotsAway}</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {showPitch ? '바둑판 + 텍스트' : '텍스트만'} · 5초마다 갱신
            </span>
            <button
              onClick={() => setShowPitch((value) => !value)}
              className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/20"
            >
              {showPitch ? '바둑판 숨기기' : '바둑판 보기'}
            </button>
          </div>
          {showPitch && (view.state.home?.length ?? 0) > 0 && (
            <div className="mt-2">
              <PitchView state={pitchStateOf(view.state)} homeName={view.home} awayName={view.away} />
            </div>
          )}

          <div ref={feedRef} className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl bg-black/30 p-2 text-[12px]">
            {events.map((event, index) => (
              <div
                key={`${event.minute}-${index}`}
                className={`flex gap-2 ${
                  event.type === 'goal' ? 'font-bold text-emerald-300' : event.type === 'note' ? 'text-sky-300' : 'text-slate-300'
                }`}
              >
                <span className="w-8 shrink-0 tabular-nums text-slate-500">{event.minute}&apos;</span>
                <span>{event.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {live && isParticipant && lineup && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              지시 ({live.side === 'home' ? '홈' : '원정'} 감독{live.status === 'pre' ? ' · 킥오프에 적용' : ''})
            </span>
            <span className="text-[11px] text-slate-500">
              교체 {lineup.subsLeft}명 남음{live.pending ? ` · 대기 중 ${live.pending}` : ''}
            </span>
          </div>

          {live.status === 'pre' && (
            <div className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-fuchsia-200">
                  히든 카드 · 킥오프 전에만, 한 경기 한 장
                  <button
                    onClick={() => setShowHelp(true)}
                    className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 hover:bg-white/20"
                  >
                    사용법
                  </button>
                </span>
                {live.cardPlayed && (
                  <span className="text-[11px] font-black text-fuchsia-100">
                    {TACTIC_CARDS[live.cardPlayed].icon} {TACTIC_CARDS[live.cardPlayed].name} 발동 예정
                  </span>
                )}
              </div>
              {!live.cardPlayed && (
                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {TACTIC_CARD_IDS.map((id) => {
                    const held = itemCount(game.items, id)
                    const card = TACTIC_CARDS[id]
                    return (
                      <button
                        key={id}
                        onClick={() => void playCard(id)}
                        disabled={busy || held <= 0}
                        title={`${card.when} — ${boostLabel(card.boost)}`}
                        className="rounded-md bg-white/10 px-2 py-1.5 text-left text-[11px] text-slate-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className="font-bold">
                          {card.icon} {card.name} <span className="text-slate-400">×{held}</span>
                        </div>
                        <div className="text-[10px] text-fuchsia-200">{boostLabel(card.boost)}</div>
                        <div className="text-[10px] text-slate-400">{card.when}</div>
                      </button>
                    )
                  })}
                </div>
              )}
              {!live.cardPlayed && TACTIC_CARD_IDS.every((id) => itemCount(game.items, id) <= 0) && (
                <p className="mt-1.5 text-[10px] text-slate-500">
                  가진 히든 카드가 없습니다 — 상점에서 골드·조각으로, 또는 리그 주 종료·컵 결승 보상으로 얻습니다.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['plan', PLANS],
                ['pressing', PRESSINGS],
                ['line', LINES],
                ['tempo', TEMPOS],
              ] as const
            ).map(([field, options]) => (
              <div key={field} className="flex flex-wrap gap-1">
                {options.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setTactic((current) => ({ ...current, [field]: option.key }))}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                      tactic[field] === option.key ? 'bg-emerald-400 text-slate-900' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => void sendTactic()}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
          >
            전술 지시 보내기
          </button>

          <div className="flex flex-wrap gap-2">
            <select
              value={subSlot}
              onChange={(event) => setSubSlot(event.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-100 [color-scheme:dark]"
            >
              <option value="">빠질 선수</option>
              {lineup.slots
                .filter((slot) => slot.uid)
                .map((slot) => (
                  <option key={slot.slotId} value={slot.slotId}>
                    {slot.position} {slot.name}
                    {slot.stamina !== null ? ` · 체력 ${Math.round(slot.stamina)}` : ''}
                  </option>
                ))}
            </select>
            <select
              value={subIn}
              onChange={(event) => setSubIn(event.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-100 [color-scheme:dark]"
            >
              <option value="">들어올 선수</option>
              {lineup.bench.map((player) => (
                <option key={player.uid} value={player.uid}>
                  {player.name} · 컨디션 {player.condition}
                </option>
              ))}
            </select>
            <button
              onClick={() => void sendSub()}
              disabled={busy || !subSlot || !subIn || lineup.subsLeft <= 0}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
            >
              교체
            </button>
          </div>
          <button
            onClick={() => void sendAutoSub()}
            disabled={busy || lineup.subsLeft <= 0}
            className="w-full rounded-lg bg-white/10 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/20 disabled:text-slate-500"
          >
            지친 선수 자동 교체
          </button>
          {notice && <p className="text-[11px] text-emerald-200">{notice}</p>}
        </div>
      )}

      {live && !isParticipant && (
        <p className="mt-3 text-[11px] text-slate-500">관전 중입니다. 지시는 이 경기의 두 감독만 낼 수 있습니다.</p>
      )}
    </section>
  )
}
