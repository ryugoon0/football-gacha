'use client'

import { conditionFactor, isInjured } from '../lib/condition'
import { effectiveOvr } from '../lib/players'
import { RARITY_STYLES } from '../lib/rarity'
import { ratingInSlot } from '../lib/squad'
import { TRAITS, traitsOf } from '../lib/traits'
import type { Card, PlayerDef, Position } from '../lib/types'
import HiddenStatsView from './HiddenStatsView'
import PlayerCard from './PlayerCard'
import StatBreakdown from './StatBreakdown'

/**
 * A player's full numbers, read only.
 *
 * The squad screen is where a manager actually decides who plays, and until
 * now it was the one screen that could not answer "why is this one better".
 * Selling, treating and levelling stay in 선수단 — this opens over the pitch
 * and closes again without changing anything.
 */
export default function PlayerStatsModal({
  card,
  player,
  slot,
  onClose,
}: {
  card: Card
  player: PlayerDef
  /** The position being filled, when opened from a slot rather than the bench. */
  slot?: Position
  onClose: () => void
}) {
  const style = RARITY_STYLES[player.rarity]
  const traits = traitsOf(player)
  const injured = isInjured(card)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 p-4 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{player.name}</h3>
            <p className="truncate text-[11px] text-slate-400">
              {player.club} · {player.league} · {player.nation}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/20"
          >
            닫기
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-3">
          <PlayerCard
            player={player}
            level={card.level}
            size="lg"
            condition={card.condition}
            injuredFor={card.injuredFor}
          />
          <div className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-400">
            <p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${style.chip}`}>{style.label}</span> · Lv.{card.level} ·
              현재 오버롤 <span className="font-black text-white">{effectiveOvr(player, card.level)}</span>
            </p>
            <p>소화 가능 {player.positions.join(' · ')}</p>
            {slot && (
              <p>
                {slot} 자리 점수{' '}
                <span className="font-black text-emerald-300">
                  {Math.round(ratingInSlot(player, card.level, slot) * conditionFactor(card.condition))}
                </span>
                <span className="ml-1 text-slate-500">(체력 반영)</span>
              </p>
            )}
            <p className={injured ? 'font-bold text-rose-300' : ''}>
              체력 {card.condition}
              {injured && ` · 부상 ${card.injuredFor}경기`}
            </p>
            {traits.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {traits.map((id) => (
                  <span
                    key={id}
                    title={TRAITS[id].description}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
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
          </div>
        </div>

        <StatBreakdown player={player} level={card.level} className="mt-3" />

        <HiddenStatsView hidden={player.hidden} className="mt-3" />
      </div>
    </div>
  )
}
