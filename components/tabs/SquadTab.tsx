'use client'

import { useMemo, useState } from 'react'
import { FORMATIONS, FORMATION_KEYS } from '../../lib/formations'
import { effectiveOvr, getPlayer } from '../../lib/players'
import { conditionFactor, isInjured } from '../../lib/condition'
import { colorName } from '../../lib/teamColor'
import { TRAITS, traitsOf } from '../../lib/traits'
import { evaluateSquad, positionPenalty } from '../../lib/squad'
import { TACTICS, TACTIC_KEYS } from '../../lib/tactics'
import type { Card, FormationKey, Position } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

const FIT_RING: Record<string, string> = {
  perfect: 'ring-emerald-400',
  ok: 'ring-amber-400',
  poor: 'ring-rose-500',
  empty: 'ring-white/20',
}
const INJURED_RING = 'ring-rose-600'

export default function SquadTab() {
  const { state, assign, clearSlot, setFormation, setTactic, autoFillSquad } = useGame()
  const [activeSlot, setActiveSlot] = useState<string | null>(null)

  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])
  const activeSlotPosition: Position | undefined = formation.slots.find(
    (slot) => slot.id === activeSlot,
  )?.position

  const squadTraits = useMemo(
    () =>
      Array.from(
        new Set(
          rating.evaluations
            .filter((item) => item.player && !item.injured)
            .flatMap((item) => traitsOf(item.player!)),
        ),
      ),
    [rating.evaluations],
  )

  const candidates = useMemo(() => {
    if (!activeSlotPosition) return []
    const onPitch = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
    const rows = state.cards.flatMap((card: Card) => {
      const player = getPlayer(card.playerId)
      if (!player) return []
      const ovr = effectiveOvr(player, card.level)
      return [
        {
          card,
          player,
          score: Math.round(
            (ovr - positionPenalty(player.position, activeSlotPosition)) *
              conditionFactor(card.condition),
          ),
          inSquad: onPitch.has(card.uid),
        },
      ]
    })
    // Injured players sink to the bottom of the list.
    return rows.sort(
      (a, b) =>
        Number(isInjured(a.card)) - Number(isInjured(b.card)) || b.score - a.score,
    )
  }, [activeSlotPosition, state.cards, state.squad.slots])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FORMATION_KEYS.map((key: FormationKey) => (
            <button
              key={key}
              onClick={() => setFormation(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                state.squad.formation === key
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
          <button
            onClick={autoFillSquad}
            className="ml-auto rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20"
          >
            자동 배치
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">{formation.description}</p>

        <div className="pitch relative mx-auto aspect-[3/4] w-full max-w-md rounded-xl border border-white/15">
          <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/25" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 border border-white/25" />
          <div className="pointer-events-none absolute top-3 left-1/2 h-16 w-40 -translate-x-1/2 border border-white/25" />

          {formation.slots.map((slot) => {
            const evaluation = rating.evaluations.find((item) => item.slotId === slot.id)
            const player = evaluation?.player
            const isActive = activeSlot === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => setActiveSlot(isActive ? null : slot.id)}
                style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                className={`absolute -translate-x-1/2 translate-y-1/2 rounded-xl ring-2 transition ${
                  evaluation?.injured ? INJURED_RING : FIT_RING[evaluation?.fit ?? 'empty']
                } ${isActive ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'}`}
              >
                {player && evaluation?.card ? (
                  <PlayerCard
                    player={player}
                    level={evaluation.card.level}
                    size="sm"
                    condition={evaluation.card.condition}
                    injuredFor={evaluation.card.injuredFor}
                    badge={slot.position}
                  />
                ) : (
                  <span className="flex h-16 w-14 flex-col items-center justify-center rounded-xl border border-dashed border-white/40 bg-black/30 text-[10px] font-bold text-white/70">
                    {slot.position}
                    <span className="text-[9px] font-normal opacity-70">비어 있음</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TACTIC_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setTactic(key)}
                className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                  state.tactic === key
                    ? 'bg-emerald-400 text-slate-900'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {TACTICS[key].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{TACTICS[state.tactic].description}</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">팀 컬러</h3>
            <span className="text-xs font-bold text-emerald-300">
              +{rating.colors.bonus.rating} 전력 · +{rating.colors.bonus.chemistry} 케미
            </span>
          </div>

          {rating.colors.active.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              같은 클럽 3명, 같은 리그·국가 5명을 모으면 팀 컬러가 발동합니다.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {rating.colors.active.map((color) => (
                <div
                  key={`${color.kind}-${color.key}`}
                  className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-200">{colorName(color)}</span>
                    <span className="font-bold text-white">
                      +{color.tier.rating} / 케미 +{color.tier.chemistry}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {color.count}명 발동
                    {color.next && ` · ${color.next.missing}명 더 넣으면 +${color.next.tier.rating}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {rating.colors.hints.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[11px] font-bold text-slate-500">발동까지 조금 남았습니다</div>
              {rating.colors.hints.map((hint) => (
                <div
                  key={`${hint.kind}-${hint.key}`}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
                >
                  <span>{colorName(hint)}</span>
                  <span className="font-bold text-amber-300">{hint.missing}명 더</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">팀 전력</h3>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-black text-white">{rating.overall}</span>
            <span className="pb-2 text-xs text-slate-400">
              선발 {rating.filled}/11 · 케미 {rating.chemistry}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ['공격', rating.att, 'bg-rose-400'],
              ['미드', rating.mid, 'bg-amber-400'],
              ['수비', rating.def, 'bg-sky-400'],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{label as string}</span>
                  <span className="font-bold text-slate-200">{value as number}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full ${color as string}`}
                    style={{ width: `${Math.min(100, (value as number))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {squadTraits.length > 0 && (
            <div className="mt-4 rounded-lg bg-white/5 p-2 text-[11px] text-slate-300">
              <div className="mb-1 font-bold text-slate-400">선발 특성 효과</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {rating.traits.goal > 0 && (
                  <span>득점 확률 +{(rating.traits.goal * 100).toFixed(1)}%p</span>
                )}
                {rating.traits.concede > 0 && (
                  <span>실점 확률 -{(rating.traits.concede * 100).toFixed(1)}%p</span>
                )}
                {rating.traits.tempo > 1 && (
                  <span>공격 빈도 +{Math.round((rating.traits.tempo - 1) * 100)}%</span>
                )}
                {rating.traits.chemistry > 0 && <span>케미 +{rating.traits.chemistry}</span>}
                {rating.traits.cup > 0 && <span>컵 경기 전력 +{rating.traits.cup}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {squadTraits.map((id) => (
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
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            포지션이 맞으면 초록, 비슷하면 노랑, 어울리지 않으면 빨강 테두리로 표시됩니다.
            케미가 높을수록 팀 전력이 올라가고, 체력이 낮거나 부상인 선수는 제 실력을 내지 못합니다.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              {activeSlotPosition ? `${activeSlotPosition} 자리 후보` : '선수 배치'}
            </h3>
            {activeSlot && (
              <button
                onClick={() => {
                  clearSlot(activeSlot)
                  setActiveSlot(null)
                }}
                className="rounded bg-white/10 px-2 py-1 text-xs font-bold text-white hover:bg-white/20"
              >
                비우기
              </button>
            )}
          </div>

          {!activeSlot ? (
            <p className="mt-3 text-sm text-slate-500">
              전술판에서 자리를 선택하면 배치할 수 있는 선수가 나타납니다.
            </p>
          ) : (
            <div className="scrollbar-thin mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {candidates.map(({ card, player, score, inSquad }) => (
                <button
                  key={card.uid}
                  onClick={() => {
                    assign(activeSlot, card.uid)
                    setActiveSlot(null)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-2 text-left transition hover:bg-white/10"
                >
                  <PlayerCard
                    player={player}
                    level={card.level}
                    size="sm"
                    condition={card.condition}
                    injuredFor={card.injuredFor}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{player.name}</div>
                    <div className="text-xs text-slate-400">
                      {player.position} · 이 자리 능력치 {score}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {player.club} · {player.league} · {player.nation}
                    </div>
                    {card.injuredFor > 0 && (
                      <div className="mt-1 inline-block rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        부상 {card.injuredFor}경기
                      </div>
                    )}
                    {inSquad && (
                      <div className="mt-1 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        선발 중 (교체됨)
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
