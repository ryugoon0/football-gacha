'use client'

import { useState } from 'react'
import PlayerCareButtons from './PlayerCareButtons'
import HiddenStatsView from './HiddenStatsView'
import RealHintView from './RealHintView'
import StatBreakdown from './StatBreakdown'
import { SUB_STAT_COUNT } from '../lib/subStats'
import {
  MAX_CONDITION,
  TIRED_CONDITION,
  isInjured,
  recoveryCost,
  treatmentCost,
} from '../lib/condition'
import { expForLevel } from '../lib/growth'
import { effectiveOvr, levelCap } from '../lib/players'
import { RARITY_STYLES } from '../lib/rarity'
import { sellPrice, shardsFor } from '../lib/shards'
import { OUT_OF_POSITION_FACTOR, ratingInSlot } from '../lib/squad'
import { TRAITS, traitsOf } from '../lib/traits'
import type { Card, PlayerDef } from '../lib/types'
import PlayerCard from './PlayerCard'

export default function PlayerDetail({
  card,
  player,
  gold,
  inSquad,
  onTreat,
  onRecover,
  onSell,
}: {
  card: Card
  player: PlayerDef
  gold: number
  inSquad: boolean
  onTreat: () => void
  onRecover: () => void
  onSell: () => void
}) {
  const [showStats, setShowStats] = useState(true)
  const style = RARITY_STYLES[player.rarity]
  const cap = levelCap(player)
  const traits = traitsOf(player)
  const expNeeded = expForLevel(card.level)
  const atLimit = card.level >= card.limit
  const maxed = card.level >= cap

  return (
    <section className="space-y-3 panel p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선수 상세</h3>

      <div className="flex justify-center">
        <PlayerCard
          player={player}
          level={card.level}
          size="lg"
          condition={card.condition}
          injuredFor={card.injuredFor}
        />
      </div>

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

      <div className="rounded-lg bg-white/5 p-3">
        <div className="text-xs font-bold text-slate-400">가능 포지션</div>
        <div className="mt-2 space-y-1">
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
              <span className="h-1.5 flex-1 rounded-full bg-white/10">
                <span
                  className="block h-1.5 rounded-full bg-emerald-400/80"
                  style={{ width: `${ratingInSlot(player, card.level, position)}%` }}
                />
              </span>
              <span className="w-7 shrink-0 text-right font-bold text-white">
                {ratingInSlot(player, card.level, position)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          위 포지션이 아닌 자리에 넣으면 능력치가 {Math.round((1 - OUT_OF_POSITION_FACTOR) * 100)}%
          가까이 깎입니다. (주 포지션 {player.position} 기준 최고치)
        </p>
      </div>

      <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span>성장</span>
          <span className="font-bold text-white">
            Lv.{card.level}
            <span className="text-slate-500">
              {' '}
              / 한계 {card.limit} · {style.label} 상한 {cap}
            </span>
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full ${atLimit ? 'bg-rose-400' : 'bg-sky-400'}`}
            style={{ width: `${atLimit ? 100 : Math.min(100, (card.exp / expNeeded) * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {maxed
            ? '등급 상한까지 올라간 카드입니다.'
            : atLimit
              ? '한계에 도달했습니다. 같은 선수 카드로 한계를 돌파하세요.'
              : `경험치 ${card.exp} / ${expNeeded} — 훈련이나 경기로 채웁니다.`}
        </div>
      </div>

      <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span>체력</span>
          <span
            className={`font-bold ${
              card.condition < TIRED_CONDITION ? 'text-rose-300' : 'text-white'
            }`}
          >
            {card.condition} / {MAX_CONDITION}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full ${
              card.condition < TIRED_CONDITION ? 'bg-rose-500' : 'bg-emerald-400'
            }`}
            style={{ width: `${card.condition}%` }}
          />
        </div>
      </div>

      <HiddenStatsView hidden={player.hidden} />
      <RealHintView name={player.name} club={player.club} nation={player.nation} className="mt-2" />

      <button
        onClick={() => setShowStats((value) => !value)}
        className="w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-white/10"
      >
        세부 능력치 {SUB_STAT_COUNT}개 {showStats ? '접기' : '펼치기'}
      </button>

      {showStats && <StatBreakdown player={player} level={card.level} />}

      <div className="text-center text-xs text-slate-500">
        {player.season && <span className="mr-1 rounded bg-white/10 px-1.5 py-0.5 font-bold text-slate-300">{player.season}</span>}
        현재 오버롤 {effectiveOvr(player, card.level)} · {player.nation} · {player.club} ·{' '}
        {player.league}
      </div>

      <PlayerCareButtons card={card} gold={gold} onTreat={onTreat} onRecover={onRecover} />

      <button
        onClick={onSell}
        className="w-full rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/30"
      >
        방출하기 (+{sellPrice(card)}G · +{shardsFor(card)}조각)
      </button>

      {inSquad && (
        <p className="text-xs font-semibold text-amber-400">
          선발 또는 벤치에 있는 선수입니다. 방출하면 자리가 비워집니다.
        </p>
      )}
    </section>
  )
}
