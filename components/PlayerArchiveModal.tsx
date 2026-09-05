'use client'

import { useEffect, useState } from 'react'
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
import { ratingInSlot } from '../lib/squad'
import { SUB_STAT_COUNT, STAT_GROUPS } from '../lib/subStats'
import { TRAITS, traitsOf } from '../lib/traits'
import HiddenStatsView from './HiddenStatsView'
import RealHintView from './RealHintView'
import StatBreakdown from './StatBreakdown'
import type { PlayerDef, Stats } from '../lib/types'
import PlayerCard from './PlayerCard'

const width = (value: number) => `${Math.max(0, Math.min(100, (value / 99) * 100))}%`

/**
 * The read-only twin of PlayerDetailModal, for browsing the roster itself
 * rather than a card someone owns. There is no level to pick — a directory
 * entry shows what the player becomes at their rarity's max level, since
 * that is the number worth comparing across the whole archive — and none of
 * the care actions (train, treat, sell) apply to a card nobody has pulled.
 */
export default function PlayerArchiveModal({
  player,
  onClose,
}: {
  player: PlayerDef
  onClose: () => void
}) {
  const [showSubs, setShowSubs] = useState(false)

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

  const atStart = effectiveStats(player, startLevel(player))
  const atCap = effectiveStats(player, cap)

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
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {player.club} · {player.league} · {player.nation} · 상한 오버롤{' '}
              <span className="font-bold text-white">{effectiveOvr(player, cap)}</span>
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
              <PlayerCard player={player} level={cap} size="lg" />
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

            <div className="rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
              시작 {startLevel(player)}레벨 · 상한 {cap}레벨. 뽑거나 이적으로 데려오면 이 사이를
              키우게 됩니다.
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-300">능력치 — 시작 대비 상한</h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm bg-emerald-400" /> 상한 {cap}레벨
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-0.5 bg-amber-400" /> 시작 {startLevel(player)}레벨
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
                        시작 {atStart[group]}
                        <span className="mx-1 text-slate-600">·</span>
                        <span className="font-bold text-white">상한 {atCap[group]}</span>
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: width(atCap[group]) }}
                      />
                      <span
                        className="absolute top-[-2px] h-3 w-0.5 bg-amber-400"
                        style={{ left: width(atStart[group]) }}
                        aria-hidden
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                레벨이 오르면 주요 능력치가 먼저 오릅니다. 99에 닿는 것은 10레벨뿐이고, 이 카드는
                상한 {cap}레벨에서 주요 능력치가 최대치에 닿습니다.
                {cap >= 10
                  ? ' 같은 99라도 화면에 보이지 않는 히든 능력치가 있어 등급이 높을수록 실제 경기력이 좋습니다. 히든은 레벨을 올려도 변하지 않고, 카드가 처음 가진 값 그대로입니다.'
                  : ' 10레벨까지 가는 골드 이상 카드와는 이 지점에서 차이가 벌어집니다.'}
              </p>
            </section>

            <section className="rounded-xl bg-white/5 p-4">
              <h3 className="text-sm font-bold text-slate-300">포지션별 능력치 (상한 레벨 기준)</h3>
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
                        style={{ width: width(ratingInSlot(player, cap, position)) }}
                      />
                    </span>
                    <span className="w-7 shrink-0 text-right font-bold text-white">
                      {ratingInSlot(player, cap, position)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white/5 p-4">
              <button
                onClick={() => setShowSubs((value) => !value)}
                className="flex w-full items-center justify-between text-sm font-bold text-slate-300"
              >
                <span>세부 능력치 {SUB_STAT_COUNT}개 (상한 레벨 기준)</span>
                <span className="text-xs text-slate-500">{showSubs ? '접기' : '펼치기'}</span>
              </button>

              {showSubs && <StatBreakdown player={player} level={cap} className="mt-3" />}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
