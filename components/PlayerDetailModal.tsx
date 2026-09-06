'use client'

import { useEffect, useState } from 'react'
import PlayerCareButtons from './PlayerCareButtons'
import { tune } from '../lib/tuning'
import {
  MAX_CONDITION,
  isInjured,
  recoveryCost,
  treatmentCost,
} from '../lib/condition'
import { expForLevel } from '../lib/growth'
import {
  GK_STAT_LABELS,
  STAT_LABELS,
  effectiveOvr,
  effectiveStats,
  keyStatsOf,
  levelCap,
  startLevel,
} from '../lib/players'
import { RARITY_STYLES } from '../lib/rarity'
import { sellPrice, shardsFor } from '../lib/shards'
import { ratingInSlot } from '../lib/squad'
import { SUB_STAT_COUNT, STAT_GROUPS } from '../lib/subStats'
import { TRAITS, traitsOf } from '../lib/traits'
import HiddenStatsView from './HiddenStatsView'
import RealHintView from './RealHintView'
import StatBreakdown from './StatBreakdown'
import PositionMap from './PositionMap'
import type { Card, PlayerDef, Stats } from '../lib/types'
import PlayerCard from './PlayerCard'

/** Every attribute is on the same 0-99 scale, so one width formula serves all. */
const width = (value: number) => `${Math.max(0, Math.min(100, (value / 99) * 100))}%`

export default function PlayerDetailModal({
  card,
  player,
  gold,
  inSquad,
  onClose,
  onTreat,
  onRecover,
  onSell,
  onToggleLock,
}: {
  card: Card
  player: PlayerDef
  gold: number
  inSquad: boolean
  onClose: () => void
  onTreat: () => void
  onRecover: () => void
  onSell: () => void
  /** Lock or unlock the card — absent when the screen cannot change it (another club's card). */
  onToggleLock?: () => void
}) {
  const [showSubs, setShowSubs] = useState(false)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const style = RARITY_STYLES[player.rarity]
  const cap = levelCap(player)
  const isKeeper = player.position === 'GK'
  const labels = isKeeper ? GK_STAT_LABELS : STAT_LABELS
  const keys = new Set(keyStatsOf(player.position))
  const traits = traitsOf(player)

  const now = effectiveStats(player, card.level)
  const atLimit = effectiveStats(player, card.limit)
  const atCap = effectiveStats(player, cap)
  const expNeeded = expForLevel(card.level)
  const topAtCap = Math.max(...keyStatsOf(player.position).map((key) => atCap[key]))
  const stuck = card.level >= card.limit
  const maxed = card.level >= cap

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="rise-in my-6 w-full max-w-4xl panel-strong p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white">{player.name}</h2>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${style.chip}`}>
                {style.label}
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-200">
                {player.position}
              </span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-300">
                Lv.{card.level}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {player.limited ? (
                <span className="mr-1 rounded bg-fuchsia-400/20 px-1.5 py-0.5 text-[11px] font-bold text-fuchsia-200" title={player.limited.story}>
                  리미티드 · {player.limited.label}
                </span>
              ) : (
                player.season && (
                  <span className="mr-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-slate-200" title="이 카드가 나타내는 시즌">
                    {player.season}
                  </span>
                )
              )}
              {player.club} · {player.league} · {player.nation} · 현재 오버롤{' '}
              <span className="font-bold text-white">{effectiveOvr(player, card.level)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-slate-200 hover:bg-white/20"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex justify-center">
              <PlayerCard
                player={player}
                level={card.level}
                size="lg"
                condition={card.condition}
                injuredFor={card.injuredFor}
              />
            </div>

            <HiddenStatsView hidden={player.hidden} />
            <RealHintView name={player.name} club={player.club} nation={player.nation} className="mt-2" />

            {traits.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {traits.map((id) => (
                  <span
                    key={id}
                    title={TRAITS[id].description}
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      TRAITS[id].tone === 'good'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {TRAITS[id].name}
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>체력</span>
                <span
                  className={`font-bold ${
                    card.condition < tune('tiredCondition') ? 'text-rose-300' : 'text-white'
                  }`}
                >
                  {card.condition} / {MAX_CONDITION}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-700">
                <div
                  className={`h-1.5 rounded-full ${
                    card.condition < tune('tiredCondition') ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${card.condition}%` }}
                />
              </div>
              {card.injuredFor > 0 && (
                <div className="mt-2 text-xs font-bold text-rose-300">
                  부상 — {card.injuredFor}경기 결장
                </div>
              )}
            </div>

            <PlayerCareButtons card={card} gold={gold} onTreat={onTreat} onRecover={onRecover} />
            {onToggleLock && (
              <button
                onClick={onToggleLock}
                className={`w-full rounded-lg px-3 py-2 text-sm font-bold transition ${
                  card.locked ? 'bg-amber-400/25 text-amber-100 hover:bg-amber-400/35' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {card.locked ? '🔒 잠금 해제' : '🔓 카드 잠금 (방출·재료 사용 금지)'}
              </button>
            )}
            {card.locked ? (
              <p className="rounded-lg bg-white/5 px-3 py-2 text-[11px] text-slate-400">
                잠긴 카드입니다. 방출·합성·훈련 재료·한계 돌파 재료로 쓸 수 없습니다.
              </p>
            ) : (
              <button
                onClick={onSell}
                className="w-full rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/30"
              >
                방출 (+{sellPrice(card)}G · +{shardsFor(card)}조각)
              </button>
            )}
            {inSquad && (
              <p className="text-[11px] font-semibold text-amber-400">
                선발 또는 벤치에 있는 선수입니다.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <section className="rounded-xl bg-white/5 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-300">레벨과 경험치</h3>
                <span className="text-xs text-slate-400">
                  시작 {startLevel(player)} · 한계 {card.limit} · {style.label} 상한 {cap}
                </span>
              </div>

              <div className="mt-3 flex items-end gap-3">
                <span className="text-4xl font-black text-white">Lv.{card.level}</span>
                <span className="pb-1 text-sm text-slate-400">
                  {maxed
                    ? '등급 상한 도달'
                    : stuck
                      ? '한계 도달 — 같은 선수 카드로 돌파'
                      : `다음 레벨까지 ${Math.max(0, expNeeded - card.exp)} exp`}
                </span>
              </div>

              <div className="mt-2 h-2.5 rounded-full bg-slate-700">
                <div
                  className={`h-2.5 rounded-full ${stuck ? 'bg-rose-400' : 'bg-sky-400'}`}
                  style={{
                    width: stuck ? '100%' : `${Math.min(100, (card.exp / expNeeded) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>경험치 {card.exp}</span>
                <span>{expNeeded}</span>
              </div>
            </section>

            <section className="rounded-xl bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-300">능력치와 성장 여지</h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm bg-emerald-400" /> 현재
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-0.5 bg-amber-400" /> 한계 레벨 {card.limit}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {STAT_GROUPS.map((group) => (
                  <div key={group}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        {labels[group]}
                        {keys.has(group as keyof Stats) && (
                          <span className="ml-1 rounded bg-white/10 px-1 text-[9px] font-bold text-slate-300">
                            주요
                          </span>
                        )}
                      </span>
                      <span className="text-slate-400">
                        <span className="font-bold text-white">{now[group]}</span>
                        <span className="mx-1 text-slate-600">·</span>
                        한계 {atLimit[group]}
                        <span className="mx-1 text-slate-600">·</span>
                        상한 {atCap[group]}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: width(now[group]) }}
                      />
                      <span
                        className="absolute top-[-2px] h-3 w-0.5 bg-amber-400"
                        style={{ left: width(atLimit[group]) }}
                        aria-hidden
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                레벨이 오르면 주요 능력치가 먼저 오릅니다. 99에 닿는 것은 10레벨뿐이고, 이 카드는
                상한 {cap}레벨에서 주요 능력치가 최대 {topAtCap}까지 오릅니다.
                {cap >= 10
                  ? ' 같은 99라도 화면에 보이지 않는 히든 능력치가 있어 등급이 높을수록 실제 경기력이 좋습니다. 히든은 레벨을 올려도 변하지 않고, 카드가 처음 가진 값 그대로입니다.'
                  : ' 10레벨까지 가는 골드 이상 카드와는 이 지점에서 차이가 벌어집니다.'}
              </p>
            </section>

            <section className="rounded-xl bg-white/5 p-4">
              <h3 className="text-sm font-bold text-slate-300">포지션별 능력치</h3>
              <div className="mt-3 space-y-2">
                {player.positions.map((position) => (
                  <div key={position} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-12 shrink-0 rounded px-1 py-0.5 text-center font-bold ${
                        position === player.position
                          ? 'btn-primary'
                          : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      {position}
                    </span>
                    <span className="h-2 flex-1 rounded-full bg-slate-700">
                      <span
                        className="block h-2 rounded-full bg-emerald-400"
                        style={{ width: width(ratingInSlot(player, card.level, position)) }}
                      />
                    </span>
                    <span className="w-7 shrink-0 text-right font-bold text-white">
                      {ratingInSlot(player, card.level, position)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                이 외의 자리에 넣으면 능력치가 약 {Math.round((1 - tune('outOfPositionFactor')) * 100)}%
                깎입니다.
              </p>
              <button
                onClick={() => setShowMap((value) => !value)}
                className="mt-2 w-full rounded-lg bg-white/5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                {showMap ? '전술판 접기' : '전술판에서 모든 자리 점수 보기'}
              </button>
              {showMap && (
                <div className="mt-3">
                  <PositionMap player={player} level={card.level} condition={card.condition} />
                </div>
              )}
            </section>

            <section className="rounded-xl bg-white/5 p-4">
              <button
                onClick={() => setShowSubs((value) => !value)}
                className="flex w-full items-center justify-between text-sm font-bold text-slate-300"
              >
                <span>세부 능력치 {SUB_STAT_COUNT}개</span>
                <span className="text-xs text-slate-500">{showSubs ? '접기' : '펼치기'}</span>
              </button>

              {showSubs && <StatBreakdown player={player} level={card.level} className="mt-3" />}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
