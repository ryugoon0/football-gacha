'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { conditionFactor, isSidelined } from '../../lib/condition'
import { FORMATIONS, FORMATION_FAMILIES, familyOf } from '../../lib/formations'
import { getPlayer } from '../../lib/players'
import { BENCH_SIZE, lineupDivisionOf, positionFit, ratingInSlot } from '../../lib/squad'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import { colorName } from '../../lib/teamColor'
import { TRAITS, traitsOf } from '../../lib/traits'
import type { Card, FormationKey, Position } from '../../lib/types'
import { SAVED_LINEUP_SLOTS } from '../../lib/gameReducer'
import { useGame } from '../GameProvider'
import LineupShelf, { useLineupDraft } from '../LineupShelf'
import TacticsPanel from '../TacticsPanel'
import PlayerCard from '../PlayerCard'
import PlayerStatsModal from '../PlayerStatsModal'
import TeamColorHelp from '../TeamColorHelp'
import BulkCareButtons from '../BulkCareButtons'

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
    autoFillSquad,
    treatInjury,
    restoreCondition,
    toggleLock,
  } = useGame()
  // The level budget follows the 경쟁 리그 tier (lib/squad.ts lineupDivisionOf).
  const capDivision = lineupDivisionOf(state)
  const [target, setTarget] = useState<Target | null>(null)
  // Looking a player up is not the same as picking one. Selecting a slot still
  // opens the swap list; this opens over it and changes nothing.
  const [inspecting, setInspecting] = useState<string | null>(null)
  // Tapping an occupied slot asks first: swap the player, or look at them.
  const [choice, setChoice] = useState<{ target: Target; uid: string } | null>(null)
  const [showColorHelp, setShowColorHelp] = useState(false)
  // Team filters: the club to build 자동 배치 around, and the club the candidate
  // list is narrowed to. Both default to everyone.
  const [autoClub, setAutoClub] = useState<string>('')
  const [candidateClub, setCandidateClub] = useState<string>('')
  const ownedClubs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const card of state.cards) {
      const player = getPlayer(card.playerId)
      if (player) counts.set(player.club, (counts.get(player.club) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
  }, [state.cards])
  // Edits here are a draft until 저장: leaving the tab without saving puts the
  // lineup back the way it was, so trying things out costs nothing.
  const draft = useLineupDraft()

  const formation = FORMATIONS[state.squad.formation] ?? FORMATIONS['4-3-3']
  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, capDivision),
    [state.cards, state.squad, capDivision],
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
        if (candidateClub && player.club !== candidateClub) return []
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
          Number(isSidelined(a.card)) - Number(isSidelined(b.card)) ||
          Number(a.fit === 'out') - Number(b.fit === 'out') ||
          b.score - a.score,
      )
  }, [target, targetPosition, state.cards, state.squad, candidateClub])

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

  /** A tap on a slot or bench seat: empty seats go straight to the swap list, occupied ones ask. */
  const tap = (next: Target, uid: string | null, isActive: boolean) => {
    if (isActive) {
      setTarget(null)
      return
    }
    if (uid) setChoice({ target: next, uid })
    else setTarget(next)
  }
  const chosenCard = choice ? state.cards.find((item: Card) => item.uid === choice.uid) : undefined
  const chosenPlayer = chosenCard ? getPlayer(chosenCard.playerId) : undefined
  const chosenLabel = !choice
    ? ''
    : choice.target.kind === 'slot'
      ? `${formation.slots.find((slot) => choice.target.kind === 'slot' && slot.id === choice.target.id)?.position ?? ''} 자리`
      : `벤치 ${choice.target.index + 1}번`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {draft.dirty && (
        <div className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 backdrop-blur lg:col-span-2">
          <div className="min-w-0 text-[11px] text-amber-100">
            <b>저장하지 않은 변경</b> — 저장하지 않고 다른 탭으로 가거나 게임을 다시 열면 원래 라인업으로 돌아갑니다.
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={draft.revert} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold">
              되돌리기
            </button>
            <button onClick={draft.commit} className="rounded-lg btn-primary px-3 py-1.5 text-xs font-black">
              현재 라인업 저장
            </button>
          </div>
        </div>
      )}
      <section className="panel p-4">
        <BulkCareButtons
          uids={[...Object.values(state.squad.slots), ...state.squad.bench].filter((uid): uid is string => Boolean(uid))}
          label="선발·벤치 18명"
          className="mb-3"
        />
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {FORMATION_FAMILIES.map((family) => (
            <button
              key={family.family}
              // Tapping a shape keeps the variant if the current one belongs to it; otherwise the family default.
              onClick={() => setFormation(family.keys.includes(state.squad.formation) ? state.squad.formation : family.keys[0])}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                familyOf(state.squad.formation).family === family.family
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {family.family}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={autoClub}
              onChange={(event) => setAutoClub(event.target.value)}
              aria-label="자동 배치 기준 클럽"
              title="고른 클럽 선수를 먼저 채우고(포지션이 맞는 경우), 남는 자리는 전체에서 채웁니다"
              className="max-w-[150px] rounded-lg bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none [color-scheme:dark]"
            >
              <option className="bg-slate-900 text-slate-100" value="">전체 선수로</option>
              {ownedClubs.map(([club, count]) => (
                <option className="bg-slate-900 text-slate-100" key={club} value={club}>
                  {club} ({count})
                </option>
              ))}
            </select>
            <button
              onClick={() => autoFillSquad(autoClub || undefined)}
              className="rounded-lg btn-ghost px-3 py-1.5 text-sm font-bold text-white"
            >
              자동 배치
            </button>
          </div>
        </div>
        {familyOf(state.squad.formation).keys.length > 1 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">유형</span>
            {familyOf(state.squad.formation).keys.map((key: FormationKey) => (
              <button
                key={key}
                onClick={() => setFormation(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  state.squad.formation === key ? 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/50' : 'btn-ghost'
                }`}
              >
                {FORMATIONS[key].variant}
              </button>
            ))}
          </div>
        )}
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
                onClick={() => tap({ kind: 'slot', id: slot.id }, evaluation?.card?.uid ?? null, isActive)}
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
                    suspendedFor={evaluation.card.suspendedFor ?? 0}
                    slotPosition={slot.position}
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
                  onClick={() => tap({ kind: 'bench', index }, uid, isActive)}
                  className={`rounded-xl ring-2 transition ${
                    card && isSidelined(card) ? INJURED_RING : 'ring-white/15'
                  } ${isActive ? 'scale-105 ring-4 ring-white' : 'hover:scale-105'}`}
                >
                  {card && player ? (
                    <PlayerCard
                      player={player}
                      level={card.level}
                      size="sm"
                      condition={card.condition}
                      injuredFor={card.injuredFor}
                      suspendedFor={card.suspendedFor ?? 0}
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
        <LineupShelf slots={SAVED_LINEUP_SLOTS} draft={draft} />

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
            <span className="pb-1 text-sm text-slate-400">
              / 상한 {rating.levelCap}
              <span className="ml-1 text-[11px] text-slate-500">
                {state.weeklyTier == null ? '경쟁 리그 미배정(최하위 기준)' : `경쟁 리그 ${state.weeklyTier}등급 기준`}
              </span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className={`h-2 rounded-full ${rating.overCap ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (rating.levelTotal / rating.levelCap) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            선발 11명의 레벨 합이 상한을 넘으면 경기에 등록할 수 없습니다. 상한은 경쟁 리그 등급이
            정합니다(0등급 110 · 1등급 89 · 2등급 77 · 3등급 66). 승격하면 다음 주부터 올라갑니다.
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

        <TacticsPanel />

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">팀 컬러</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300">
                +{rating.colors.bonus.rating} 전력 · +{rating.colors.bonus.chemistry} 케미
              </span>
              <button
                type="button"
                onClick={() => setShowColorHelp(true)}
                className="rounded-lg btn-ghost px-2 py-1 text-[10px] font-bold"
              >
                규칙
              </button>
            </div>
          </div>

          {rating.colors.active.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              선발과 후보 18명 중 같은 클럽 8명, 같은 리그·국가 11명을 모으면 팀 컬러가 발동합니다. 같은 종류는 가장 큰 그룹 하나만 칩니다.
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

        <section className="panel p-4">
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
          className="scroll-mt-24 panel p-4"
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
                suspendedFor={occupant.card.suspendedFor ?? 0}
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
            <>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={candidateClub}
                onChange={(event) => setCandidateClub(event.target.value)}
                aria-label="후보 클럽 필터"
                className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none [color-scheme:dark]"
              >
                <option className="bg-slate-900 text-slate-100" value="">모든 클럽</option>
                {ownedClubs.map(([club, count]) => (
                  <option className="bg-slate-900 text-slate-100" key={club} value={club}>
                    {club} ({count})
                  </option>
                ))}
              </select>
              {candidateClub && (
                <button type="button" onClick={() => setCandidateClub('')} className="rounded-lg btn-ghost px-2 py-1.5 text-xs font-bold">
                  해제
                </button>
              )}
            </div>
            {candidates.length === 0 && <p className="mt-3 text-xs text-slate-500">이 클럽에는 배치할 선수가 없습니다.</p>}
            <div className="scrollbar-thin mt-2 max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
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
                      suspendedFor={card.suspendedFor ?? 0}
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
                        {(card.suspendedFor ?? 0) > 0 && (
                          <span className="rounded bg-red-700/30 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                            🟥 출전정지 {card.suspendedFor}경기
                          </span>
                        )}
                        {(card.yellows ?? 0) > 0 && (
                          <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-200">
                            🟨 {card.yellows}장
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
            </>
          )}
        </section>
      </div>

      {choice && chosenCard && chosenPlayer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setChoice(null)}>
          <div className="panel rise-in w-full max-w-sm p-4" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center gap-3">
              <PlayerCard
                player={chosenPlayer}
                level={chosenCard.level}
                size="sm"
                condition={chosenCard.condition}
                injuredFor={chosenCard.injuredFor}
                suspendedFor={chosenCard.suspendedFor ?? 0}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{chosenLabel}</div>
                <div className="truncate text-sm font-black text-white">{chosenPlayer.name}</div>
                <div className="truncate text-[11px] text-slate-400">
                  {chosenPlayer.positions.join(' · ')} · Lv.{chosenCard.level} · 체력 {chosenCard.condition}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setInspecting(choice.uid)
                  setChoice(null)
                }}
                className="rounded-lg btn-ghost py-2 text-xs font-bold"
              >
                선수 정보
              </button>
              <button
                onClick={() => {
                  setTarget(choice.target)
                  setChoice(null)
                }}
                className="rounded-lg btn-primary py-2 text-xs font-black"
              >
                교체하기
              </button>
            </div>
            <button onClick={() => setChoice(null)} className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300">
              취소
            </button>
          </div>
        </div>
      )}

      {inspected && (
        <PlayerStatsModal
          card={inspected.card}
          player={inspected.player}
          slot={targetPosition}
          onClose={() => setInspecting(null)}
          care={{
            gold: state.gold,
            onTreat: () => treatInjury(inspected.card.uid),
            onRecover: () => restoreCondition(inspected.card.uid),
            onToggleLock: () => toggleLock(inspected.card.uid),
          }}
        />
      )}
      {showColorHelp && <TeamColorHelp onClose={() => setShowColorHelp(false)} />}
    </div>
  )
}
