'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { conditionFactor, isInjured } from '../../lib/condition'
import { FORMATIONS, FORMATION_KEYS } from '../../lib/formations'
import { getPlayer } from '../../lib/players'
import { BENCH_SIZE, positionFit, ratingInSlot } from '../../lib/squad'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import { colorName } from '../../lib/teamColor'
import {
  LINES,
  PLANS,
  PRESSINGS,
  TACTIC_PRESETS,
  TEMPOS,
  presetOf,
  tacticSummary,
} from '../../lib/tactics'
import { TRAITS, traitsOf } from '../../lib/traits'
import type { Card, FormationKey, Position } from '../../lib/types'
import { useGame } from '../GameProvider'
import TacticsSliders from '../TacticsSliders'
import TacticsCompare from '../TacticsCompare'
import PlayerCard from '../PlayerCard'
import PlayerStatsModal from '../PlayerStatsModal'
import TeamColorHelp from '../TeamColorHelp'

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
  // Looking a player up is not the same as picking one. Selecting a slot still
  // opens the swap list; this opens over it and changes nothing.
  const [inspecting, setInspecting] = useState<string | null>(null)
  const [showColorHelp, setShowColorHelp] = useState(false)

  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, state.season.division),
    [state.cards, state.squad, state.season.division],
  )
  const gaps = useMemo(() => missingSlots(rating.evaluations), [rating.evaluations])

  // On a phone the candidate list sits far below the pitch, so selecting a slot
  // has to bring it into view or nothing looks like it happened.
  const pickerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (target) pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [target])

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

  const inspected = useMemo(() => {
    if (!inspecting) return null
    const card = state.cards.find((item: Card) => item.uid === inspecting)
    const player = card ? getPlayer(card.playerId) : undefined
    return card && player ? { card, player } : null
  }, [inspecting, state.cards])

  // Whoever is in the selected slot right now, so their numbers are one tap away.
  const occupant = useMemo(() => {
    if (!target) return null
    const uid =
      target.kind === 'slot'
        ? (state.squad.slots[target.id] ?? null)
        : (state.squad.bench[target.index] ?? null)
    const card = uid ? state.cards.find((item: Card) => item.uid === uid) : undefined
    const player = card ? getPlayer(card.playerId) : undefined
    return card && player ? { card, player } : null
  }, [target, state.squad, state.cards])

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

          {(gaps.empty.length > 0 || gaps.injured.length > 0 || gaps.duplicated.length > 0) && (
            <p className="mt-2 rounded-lg bg-rose-500/15 px-3 py-2 text-[11px] font-bold text-rose-200">
              {gaps.empty.length > 0 && `빈 자리 ${gaps.empty.join(' · ')}`}
              {gaps.empty.length > 0 && (gaps.injured.length > 0 || gaps.duplicated.length > 0) && ' · '}
              {gaps.injured.length > 0 && `부상 ${gaps.injured.join(' · ')}`}
              {gaps.injured.length > 0 && gaps.duplicated.length > 0 && ' · '}
              {gaps.duplicated.length > 0 && `같은 선수 중복 ${gaps.duplicated.join(' · ')}`} — 11명을
              채워야 경기를 시작할 수 있습니다.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술</h3>
          <p className="mt-1 text-[11px] text-slate-500">{tacticSummary(state.tactic)}</p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {TACTIC_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setTactic(preset.setup)}
                title={preset.hint}
                className={`min-h-[44px] rounded-xl px-2 text-xs font-black transition ${
                  presetOf(state.tactic) === preset.key
                    ? 'bg-emerald-400 text-slate-900'
                    : 'bg-white/10 text-slate-200 active:bg-white/20 sm:hover:bg-white/20'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

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
                      className={`min-h-[40px] rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition ${
                        state.tactic[field] === option.key
                          ? 'bg-emerald-400 text-slate-900'
                          : 'bg-white/5 text-slate-300 active:bg-white/10 sm:hover:bg-white/10'
                      }`}
                    >
                      {option.label.replace(/^(압박|수비 라인|템포) /, '')}
                      <span className="ml-1 hidden opacity-50 sm:inline">{option.hotkey}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            경기 중에도 화면 아래 버튼으로 바꿀 수 있고, 지시는 경기가 멈추는 순간 적용됩니다.
            PC에서는 단축키(플랜 1 2 3 · 압박 Q W E · 라인 A S D · 템포 Z X C)도 씁니다.
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

        <TacticsSliders />
      <TacticsCompare />

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">팀 컬러</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300">
                +{rating.colors.bonus.rating} 전력 · +{rating.colors.bonus.chemistry} 케미
              </span>
              <button
                type="button"
                onClick={() => setShowColorHelp(true)}
                className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10"
              >
                규칙
              </button>
            </div>
          </div>

          {rating.colors.active.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              같은 클럽 3명, 같은 리그·국가 5명을 모으면 팀 컬러가 발동합니다. 같은 종류는 가장 큰 그룹 하나만 칩니다.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {rating.colors.active.map((color) => (
                <div
                  key={`${color.kind}-${color.key}`}
                  className={`rounded-lg px-2.5 py-1.5 ${color.counted ? 'bg-emerald-400/10' : 'bg-white/5 opacity-70'}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${color.counted ? 'text-emerald-200' : 'text-slate-400 line-through'}`}>
                      {colorName(color)}
                    </span>
                    <span className={`font-bold ${color.counted ? 'text-white' : 'text-slate-500'}`}>
                      +{color.tier.rating} / 케미 +{color.tier.chemistry}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {color.counted ? `${color.count}명 발동` : `${color.count}명 · 같은 종류의 더 큰 그룹이 있어 발동하지 않음`}
                    {color.counted && color.next && ` · ${color.next.missing}명 더 넣으면 +${color.next.tier.rating}`}
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

        <section
          ref={pickerRef}
          className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-4"
        >
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

          {occupant && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-400/10 p-2">
              <PlayerCard
                player={occupant.player}
                level={occupant.card.level}
                size="sm"
                condition={occupant.card.condition}
                injuredFor={occupant.card.injuredFor}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  지금 이 자리
                </div>
                <div className="truncate text-sm font-bold text-white">{occupant.player.name}</div>
                <div className="truncate text-[10px] text-slate-400">
                  {occupant.player.positions.join(' · ')} · Lv.{occupant.card.level}
                </div>
              </div>
              <button
                onClick={() => setInspecting(occupant.card.uid)}
                className="shrink-0 rounded-lg bg-white/10 px-2.5 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/20"
              >
                능력치 보기
              </button>
            </div>
          )}

          {!target ? (
            <p className="mt-3 text-sm text-slate-500">
              전술판이나 벤치에서 자리를 선택하면 배치할 수 있는 선수가 나타납니다. 후보의 능력치
              버튼을 누르면 세부 능력치를 볼 수 있습니다.
            </p>
          ) : (
            <div className="scrollbar-thin mt-3 max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
              {candidates.map(({ card, player, score, fit, inSquad, onBench }) => (
                <div
                  key={card.uid}
                  className="flex w-full items-center gap-2 rounded-xl bg-white/5 p-1.5 transition hover:bg-white/10"
                >
                  <button
                    onClick={() => pick(card.uid)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                      <div className="truncate text-xs text-slate-400">
                        {player.positions.join(' · ')} · Lv.{card.level} · 이 자리 {score} ·{' '}
                        {player.club}
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
                  <button
                    onClick={() => setInspecting(card.uid)}
                    aria-label={`${player.name} 능력치 보기`}
                    className="shrink-0 self-stretch rounded-lg bg-white/10 px-2 text-[10px] font-bold text-slate-300 hover:bg-white/20"
                  >
                    능력치
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {inspected && (
        <PlayerStatsModal
          card={inspected.card}
          player={inspected.player}
          slot={targetPosition}
          onClose={() => setInspecting(null)}
        />
      )}
      {showColorHelp && <TeamColorHelp onClose={() => setShowColorHelp(false)} />}
    </div>
  )
}
