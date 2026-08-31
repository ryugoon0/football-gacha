'use client'

import { useState } from 'react'
import {
  MAX_CONDITION,
  TIRED_CONDITION,
  isInjured,
  recoveryCost,
  treatmentCost,
} from '../lib/condition'
import { expForLevel, maxLevelOf } from '../lib/growth'
import { effectiveOvr } from '../lib/players'
import { RARITY_STYLES, trainCost } from '../lib/rarity'
import { shardsFor } from '../lib/shards'
import { STAT_GROUPS, SUB_STATS, subStatLabel, subStatsOf } from '../lib/subStats'
import { GK_STAT_LABELS, STAT_LABELS } from '../lib/players'
import { TRAITS, traitsOf } from '../lib/traits'
import type { Card, PlayerDef } from '../lib/types'
import PlayerCard from './PlayerCard'

export default function PlayerDetail({
  card,
  player,
  gold,
  inSquad,
  onTrain,
  onTreat,
  onRecover,
  onSell,
}: {
  card: Card
  player: PlayerDef
  gold: number
  inSquad: boolean
  onTrain: () => void
  onTreat: () => void
  onRecover: () => void
  onSell: () => void
}) {
  const [showStats, setShowStats] = useState(true)
  const style = RARITY_STYLES[player.rarity]
  const ceiling = maxLevelOf(player)
  const maxed = card.level >= ceiling
  const upgradeCost = trainCost(player.rarity, card.level)
  const sellValue = style.sell + (card.level - 1) * Math.round(style.sell * 0.3)
  const isKeeper = player.position === 'GK'
  const labels = isKeeper ? GK_STAT_LABELS : STAT_LABELS
  const traits = traitsOf(player)
  const expNeeded = expForLevel(card.level)

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
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

      <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span>성장</span>
          <span className="font-bold text-white">
            Lv.{card.level}
            <span className="text-slate-500"> / 잠재력 {ceiling}</span>
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-sky-400"
            style={{ width: `${maxed ? 100 : Math.min(100, ((card.exp ?? 0) / expNeeded) * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {maxed
            ? '잠재력을 모두 채웠습니다.'
            : `경험치 ${card.exp ?? 0} / ${expNeeded} — 경기에 나가면 평점만큼 쌓입니다.`}
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

      <button
        onClick={() => setShowStats((value) => !value)}
        className="w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-white/10"
      >
        세부 능력치 {showStats ? '접기' : '펼치기'}
      </button>

      {showStats && (
        <div className="space-y-2">
          {STAT_GROUPS.map((group) => {
            const subs = subStatsOf(player, group, card.level)
            const groupValue = Math.round(
              subs.reduce((sum, item) => sum + item.value, 0) / subs.length,
            )
            return (
              <div key={group} className="rounded-lg bg-white/5 p-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{labels[group]}</span>
                  <span className="text-white">{groupValue}</span>
                </div>
                <div className="mt-1 space-y-1">
                  {subs.map(({ stat, value }, index) => (
                    <div key={stat.key} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] text-slate-500">
                        {subStatLabel(SUB_STATS[group][index], isKeeper)}
                      </span>
                      <span className="h-1 flex-1 rounded-full bg-white/10">
                        <span
                          className="block h-1 rounded-full bg-emerald-400/80"
                          style={{ width: `${value}%` }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right text-[10px] font-bold text-slate-300">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-center text-xs text-slate-500">
        현재 오버롤 {effectiveOvr(player, card.level)} · {player.nation} · {player.club}
      </div>

      <button
        onClick={onTrain}
        disabled={maxed || gold < upgradeCost}
        className="w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
      >
        {maxed ? '잠재력 한계' : `강화하기 (${upgradeCost}G)`}
      </button>

      {isInjured(card) && (
        <button
          onClick={onTreat}
          disabled={gold < treatmentCost(card)}
          className="w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-400 disabled:opacity-40"
        >
          부상 치료 ({treatmentCost(card)}G · {card.injuredFor}경기 결장)
        </button>
      )}

      {card.condition < MAX_CONDITION && (
        <button
          onClick={onRecover}
          disabled={gold < recoveryCost(card)}
          className="w-full rounded-lg bg-sky-500/80 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-40"
        >
          체력 회복 ({recoveryCost(card)}G)
        </button>
      )}

      <button
        onClick={onSell}
        className="w-full rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/30"
      >
        방출하기 (+{sellValue}G · +{shardsFor(card)}조각)
      </button>

      {inSquad && (
        <p className="text-xs font-semibold text-amber-400">
          선발 명단에 있는 선수입니다. 방출하면 자리가 비워집니다.
        </p>
      )}
    </section>
  )
}
