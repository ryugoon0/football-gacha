'use client'

import { useMemo, useState } from 'react'
import { FORMATIONS, FORMATION_KEYS } from '../../lib/formations'
import { effectiveOvr, getPlayer } from '../../lib/players'
import { evaluateSquad, positionPenalty } from '../../lib/squad'
import type { FormationKey, Position } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

const FIT_RING: Record<string, string> = {
  perfect: 'ring-emerald-400',
  ok: 'ring-amber-400',
  poor: 'ring-rose-500',
  empty: 'ring-white/20',
}

export default function SquadTab() {
  const { state, assign, clearSlot, setFormation, autoFillSquad } = useGame()
  const [activeSlot, setActiveSlot] = useState<string | null>(null)

  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])
  const activeSlotPosition: Position | undefined = formation.slots.find(
    (slot) => slot.id === activeSlot,
  )?.position

  const candidates = useMemo(() => {
    if (!activeSlotPosition) return []
    const onPitch = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
    return state.cards
      .map((card) => {
        const player = getPlayer(card.playerId)
        if (!player) return null
        const ovr = effectiveOvr(player, card.level)
        return {
          card,
          player,
          score: ovr - positionPenalty(player.position, activeSlotPosition),
          inSquad: onPitch.has(card.uid),
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as {
      card: { uid: string; level: number; playerId: string }
      player: NonNullable<ReturnType<typeof getPlayer>>
      score: number
      inSquad: boolean
    }[]
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
                  FIT_RING[evaluation?.fit ?? 'empty']
                } ${isActive ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'}`}
              >
                {player && evaluation?.card ? (
                  <PlayerCard
                    player={player}
                    level={evaluation.card.level}
                    size="sm"
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
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            포지션이 맞으면 초록, 비슷하면 노랑, 어울리지 않으면 빨강 테두리로 표시됩니다.
            케미가 높을수록 팀 전력이 올라갑니다.
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
                  <PlayerCard player={player} level={card.level} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{player.name}</div>
                    <div className="text-xs text-slate-400">
                      {player.position} · 이 자리 능력치 {score}
                    </div>
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
