'use client'

import { useMemo, useState } from 'react'
import { conditionFactor, isInjured } from '../../lib/condition'
import { FORMATIONS, FORMATION_KEYS } from '../../lib/formations'
import { getPlayer } from '../../lib/players'
import { BENCH_SIZE, positionFit, ratingInSlot } from '../../lib/squad'
import { evaluateSquad } from '../../lib/squad'
import { colorName } from '../../lib/teamColor'
import { LINES, PLANS, PRESSINGS, TEMPOS, tacticSummary } from '../../lib/tactics'
import { TRAITS, traitsOf } from '../../lib/traits'
import type { Card, FormationKey, Position } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

const FIT_RING: Record<string, string> = {
  main: 'ring-emerald-400',
  sub: 'ring-amber-400',
  out: 'ring-rose-500',
  empty: 'ring-white/20',
}
const INJURED_RING = 'ring-rose-600'

type Target = { kind: 'slot'; id: string } | { kind: 'bench'; index: number }

export default function SquadTab() {
  const {
    state,
    assign,
    clearSlot,
    assignBench,
    clearBench,
    setFormation,
    setTactic,
    setAutoSub,
    autoFillSquad,
  } = useGame()
  const [target, setTarget] = useState<Target | null>(null)

  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, state.season.division),
    [state.cards, state.squad, state.season.division],
  )

  const targetPosition: Position | undefined =
    target?.kind === 'slot'
      ? formation.slots.find((slot) => slot.id === target.id)?.position
      : undefined

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
    if (!target) return []
    const onPitch = new Set(Object.values(state.squad.slots).filter(Boolean) as string[])
    const onBench = new Set(state.squad.bench.filter(Boolean) as string[])

    return state.cards
      .flatMap((card: Card) => {
        const player = getPlayer(card.playerId)
        if (!player) return []
        const position = targetPosition
        const score = position
          ? Math.round(ratingInSlot(player, card.level, position) * conditionFactor(card.condition))
          : Math.round(
              ratingInSlot(player, card.level, player.position) * conditionFactor(card.condition),
            )
        return [
          {
            card,
            player,
            score,
            fit: position ? positionFit(player, position) : 'main',
            inSquad: onPitch.has(card.uid),
            onBench: onBench.has(card.uid),
          },
        ]
      })
      .sort(
        (a, b) =>
          Number(isInjured(a.card)) - Number(isInjured(b.card)) ||
          Number(a.fit === 'out') - Number(b.fit === 'out') ||
          b.score - a.score,
      )
  }, [target, targetPosition, state.cards, state.squad])

  const pick = (uid: string) => {
    if (!target) return
    if (target.kind === 'slot') assign(target.id, uid)
    else assignBench(target.index, uid)
    setTarget(null)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
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
            const isActive = target?.kind === 'slot' && target.id === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => setTarget(isActive ? null : { kind: 'slot', id: slot.id })}
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

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              벤치 ({state.squad.bench.filter(Boolean).length}/{BENCH_SIZE})
            </h3>
            <span className="text-[11px] text-slate-500">자동 교체는 벤치에서 투입됩니다</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: BENCH_SIZE }).map((_, index) => {
              const uid = state.squad.bench[index] ?? null
              const card = uid ? state.cards.find((item) => item.uid === uid) : undefined
              const player = card ? getPlayer(card.playerId) : undefined
              const isActive = target?.kind === 'bench' && target.index === index
              return (
                <button
                  key={index}
                  onClick={() => setTarget(isActive ? null : { kind: 'bench', index })}
                  className={`rounded-xl ring-2 transition ${
                    card && isInjured(card) ? INJURED_RING : 'ring-white/15'
                  } ${isActive ? 'scale-105 ring-4 ring-white' : 'hover:scale-105'}`}
                >
                  {card && player ? (
                    <PlayerCard
                      player={player}
                      level={card.level}
                      size="sm"
                      condition={card.condition}
                      injuredFor={card.injuredFor}
                    />
                  ) : (
                    <span className="flex h-16 w-14 items-center justify-center rounded-xl border border-dashed border-white/30 bg-black/20 text-[10px] font-bold text-white/50">
                      빈 자리
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <section
          className={`rounded-2xl border p-4 ${
            rating.overCap
              ? 'border-rose-500/60 bg-rose-500/10'
              : 'border-white/10 bg-slate-900/60'
          }`}
        >
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            라인업 등록 제한
          </h3>
          <div className="mt-2 flex items-end justify-between">
            <span
              className={`text-3xl font-black ${rating.overCap ? 'text-rose-300' : 'text-white'}`}
            >
              {rating.levelTotal}
            </span>
            <span className="pb-1 text-sm text-slate-400">/ 상한 {rating.levelCap}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className={`h-2 rounded-full ${rating.overCap ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (rating.levelTotal / rating.levelCap) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            선발 11명의 레벨 합이 상한을 넘으면 경기에 등록할 수 없습니다. 상위 리그로 올라갈수록
            상한이 올라갑니다.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술</h3>
          <p className="mt-1 text-[11px] text-slate-500">{tacticSummary(state.tactic)}</p>

          <div className="mt-3 space-y-3">
            {[
              { label: '기본 전술', field: 'plan' as const, options: PLANS },
              { label: '압박', field: 'pressing' as const, options: PRESSINGS },
              { label: '수비 라인', field: 'line' as const, options: LINES },
              { label: '템포', field: 'tempo' as const, options: TEMPOS },
            ].map(({ label, field, options }) => (
              <div key={field}>
                <div className="mb-1 text-[11px] font-bold text-slate-400">{label}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {options.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setTactic({ ...state.tactic, [field]: option.key })}
                      title={`${option.description} (단축키 ${option.hotkey})`}
                      className={`rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition ${
                        state.tactic[field] === option.key
                          ? 'bg-emerald-400 text-slate-900'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {option.label.replace(/^(압박|수비 라인|템포) /, '')}
                      <span className="ml-1 opacity-50">{option.hotkey}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            경기 중에도 중단된 순간에 단축키로 바꿀 수 있습니다.
          </p>

          <button
            onClick={() => setAutoSub(!state.autoSub)}
            className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-bold transition ${
              state.autoSub
                ? 'bg-emerald-400/15 text-emerald-200'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <span>자동 교체</span>
            <span
              className={`rounded px-2 py-0.5 text-[11px] ${
                state.autoSub ? 'bg-emerald-400 text-slate-900' : 'bg-white/10 text-slate-300'
              }`}
            >
              {state.autoSub ? '켜짐' : '꺼짐'}
            </span>
          </button>
          <p className="mt-1 text-[11px] text-slate-500">
            부상이거나 체력이 45 아래인 선발을 킥오프 전에 벤치 선수와 바꿉니다.
          </p>
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
                    style={{ width: `${Math.min(100, value as number)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {squadTraits.length > 0 && (
            <div className="mt-4 rounded-lg bg-white/5 p-2 text-[11px] text-slate-300">
              <div className="mb-1 font-bold text-slate-400">선발 특성</div>
              <div className="flex flex-wrap gap-1">
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

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            주 포지션은 초록, 가능 포지션은 노랑, 불가능한 자리는 빨강입니다. 불가능한 자리에
            넣으면 능력치가 크게 깎입니다.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              {target
                ? target.kind === 'slot'
                  ? `${targetPosition} 자리 후보`
                  : `벤치 ${target.index + 1}번 후보`
                : '선수 배치'}
            </h3>
            {target && (
              <button
                onClick={() => {
                  if (target.kind === 'slot') clearSlot(target.id)
                  else clearBench(target.index)
                  setTarget(null)
                }}
                className="rounded bg-white/10 px-2 py-1 text-xs font-bold text-white hover:bg-white/20"
              >
                비우기
              </button>
            )}
          </div>

          {!target ? (
            <p className="mt-3 text-sm text-slate-500">
              전술판이나 벤치에서 자리를 선택하면 배치할 수 있는 선수가 나타납니다.
            </p>
          ) : (
            <div className="scrollbar-thin mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {candidates.map(({ card, player, score, fit, inSquad, onBench }) => (
                <button
                  key={card.uid}
                  onClick={() => pick(card.uid)}
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
                      {player.positions.join(' · ')} · Lv.{card.level} · 이 자리 {score}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {player.club} · {player.league} · {player.nation}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {target.kind === 'slot' && fit === 'out' && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          불가능 포지션 — 능력치 급감
                        </span>
                      )}
                      {target.kind === 'slot' && fit === 'sub' && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          가능 포지션
                        </span>
                      )}
                      {card.injuredFor > 0 && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          부상 {card.injuredFor}경기
                        </span>
                      )}
                      {inSquad && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          선발
                        </span>
                      )}
                      {onBench && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                          벤치
                        </span>
                      )}
                    </div>
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
