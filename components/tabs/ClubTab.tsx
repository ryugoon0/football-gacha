'use client'

import { useMemo, useState } from 'react'
import { FUSION_FEE, FUSION_SIZE, checkFusion } from '../../lib/fusion'
import { PLAYERS, POSITION_GROUP, effectiveOvr, getPlayer } from '../../lib/players'
import { MAX_LEVEL, RARITIES, RARITY_STYLES, trainCost } from '../../lib/rarity'
import type { PlayerDef, PositionGroup, Rarity } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

type RarityFilter = Rarity | 'all'
type GroupFilter = PositionGroup | 'all'
type SortKey = 'ovr' | 'rarity' | 'level'

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: '전체',
  GK: '골키퍼',
  DF: '수비',
  MF: '미드필더',
  FW: '공격',
}

export default function ClubTab() {
  const { state, sell, sellDuplicates, train, fuse } = useGame()
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('ovr')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [fusing, setFusing] = useState(false)
  const [fuseUids, setFuseUids] = useState<string[]>([])
  const [fused, setFused] = useState<PlayerDef | null>(null)

  const inSquad = useMemo(
    () => new Set(Object.values(state.squad.slots).filter(Boolean) as string[]),
    [state.squad.slots],
  )

  const rows = useMemo(() => {
    const rarityOrder = (rarity: Rarity) => RARITIES.indexOf(rarity)
    return state.cards
      .map((card) => {
        const player = getPlayer(card.playerId)
        return player ? { card, player, ovr: effectiveOvr(player, card.level) } : null
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => rarityFilter === 'all' || row.player.rarity === rarityFilter)
      .filter(
        (row) => groupFilter === 'all' || POSITION_GROUP[row.player.position] === groupFilter,
      )
      .sort((a, b) => {
        if (sortKey === 'rarity') {
          const diff = rarityOrder(b.player.rarity) - rarityOrder(a.player.rarity)
          if (diff !== 0) return diff
        }
        if (sortKey === 'level' && a.card.level !== b.card.level) {
          return b.card.level - a.card.level
        }
        return b.ovr - a.ovr
      })
  }, [state.cards, rarityFilter, groupFilter, sortKey])

  const selected = rows.find((row) => row.card.uid === selectedUid) ?? null
  const selectedStyle = selected ? RARITY_STYLES[selected.player.rarity] : null
  const upgradeCost = selected ? trainCost(selected.player.rarity, selected.card.level) : 0
  const sellValue = selected
    ? selectedStyle!.sell + (selected.card.level - 1) * Math.round(selectedStyle!.sell * 0.3)
    : 0
  const spares = state.cards.length - new Set(state.cards.map((card) => card.playerId)).size

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setFusing(false)
              setFuseUids([])
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              !fusing ? 'bg-emerald-400 text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            선수 관리
          </button>
          <button
            onClick={() => {
              setFusing(true)
              setSelectedUid(null)
              setFused(null)
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              fusing ? 'bg-emerald-400 text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            승급 합성
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChip active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>
            전체 등급
          </FilterChip>
          {RARITIES.map((rarity) => (
            <FilterChip
              key={rarity}
              active={rarityFilter === rarity}
              onClick={() => setRarityFilter(rarity)}
            >
              {RARITY_STYLES[rarity].label}
            </FilterChip>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(GROUP_LABELS) as GroupFilter[]).map((group) => (
            <FilterChip
              key={group}
              active={groupFilter === group}
              onClick={() => setGroupFilter(group)}
            >
              {GROUP_LABELS[group]}
            </FilterChip>
          ))}
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-200 outline-none"
          >
            <option value="ovr">전력순</option>
            <option value="rarity">등급순</option>
            <option value="level">강화순</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">조건에 맞는 선수가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {rows.map(({ card, player }) => (
              <PlayerCard
                key={card.uid}
                player={player}
                level={card.level}
                size="md"
                selected={fusing ? fuseUids.includes(card.uid) : selectedUid === card.uid}
                dimmed={fusing && inSquad.has(card.uid)}
                badge={inSquad.has(card.uid) ? '선발' : undefined}
                onClick={() => {
                  if (!fusing) {
                    setSelectedUid(card.uid === selectedUid ? null : card.uid)
                    return
                  }
                  if (inSquad.has(card.uid)) return
                  setFused(null)
                  setFuseUids((current) =>
                    current.includes(card.uid)
                      ? current.filter((uid) => uid !== card.uid)
                      : current.length >= FUSION_SIZE
                        ? current
                        : [...current, card.uid],
                  )
                }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">도감</h3>
          <div className="mt-2 text-2xl font-black text-white">
            {state.collected.length}
            <span className="text-base font-semibold text-slate-500"> / {PLAYERS.length}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-amber-400"
              style={{ width: `${(state.collected.length / PLAYERS.length) * 100}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            보유 카드 {state.cards.length}장 · 중복 {spares}장
          </div>
          <button
            onClick={sellDuplicates}
            disabled={spares === 0}
            className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
          >
            중복 카드 일괄 방출
          </button>
        </section>

        {fusing ? (
          <FusionPanel
            uids={fuseUids}
            check={checkFusion(state.cards, fuseUids, state.squad, state.gold)}
            result={fused}
            onClear={() => {
              setFuseUids([])
              setFused(null)
            }}
            onFuse={() => {
              const player = fuse(fuseUids)
              if (player) {
                setFused(player)
                setFuseUids([])
              }
            }}
          />
        ) : (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선수 관리</h3>
          {!selected ? (
            <p className="mt-3 text-sm text-slate-500">카드를 선택하면 강화와 방출을 할 수 있습니다.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex justify-center">
                <PlayerCard player={selected.player} level={selected.card.level} size="lg" />
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
                강화 레벨 <span className="font-bold text-white">{selected.card.level}</span> /{' '}
                {MAX_LEVEL}
                <div className="mt-1 text-xs text-slate-500">
                  강화 1단계마다 전 능력치가 1씩 오릅니다.
                </div>
              </div>
              <button
                onClick={() => train(selected.card.uid)}
                disabled={selected.card.level >= MAX_LEVEL || state.gold < upgradeCost}
                className="w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
              >
                {selected.card.level >= MAX_LEVEL ? '최대 강화' : `강화하기 (${upgradeCost}G)`}
              </button>
              <button
                onClick={() => {
                  sell([selected.card.uid])
                  setSelectedUid(null)
                }}
                className="w-full rounded-lg bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-500/30"
              >
                방출하기 (+{sellValue}G)
              </button>
              {inSquad.has(selected.card.uid) && (
                <p className="text-xs font-semibold text-amber-400">
                  선발 명단에 있는 선수입니다. 방출하면 자리가 비워집니다.
                </p>
              )}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  )
}

function FusionPanel({
  uids,
  check,
  result,
  onFuse,
  onClear,
}: {
  uids: string[]
  check: ReturnType<typeof checkFusion>
  result: PlayerDef | null
  onFuse: () => void
  onClear: () => void
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">승급 합성</h3>
      <p className="mt-2 text-sm text-slate-400">
        같은 등급 카드 {FUSION_SIZE}장과 {FUSION_FEE}G로 한 단계 위 등급 카드 1장을 만듭니다.
        선발 명단의 카드는 사용할 수 없습니다.
      </p>

      <div className="mt-3 flex gap-2">
        {Array.from({ length: FUSION_SIZE }).map((_, index) => (
          <div
            key={index}
            className={`flex h-16 flex-1 items-center justify-center rounded-lg border border-dashed text-xs font-bold ${
              uids[index]
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                : 'border-white/20 text-slate-600'
            }`}
          >
            {uids[index] ? '선택됨' : index + 1}
          </div>
        ))}
      </div>

      {check.from && check.to && (
        <div className="mt-3 rounded-lg bg-white/5 p-3 text-center text-sm text-slate-300">
          <span className="font-bold text-white">{RARITY_STYLES[check.from].label}</span> ×{' '}
          {FUSION_SIZE} →{' '}
          <span className="font-bold text-amber-300">{RARITY_STYLES[check.to].label}</span> 1장
        </div>
      )}
      {!check.ok && check.reason && !(result && uids.length === 0) && (
        <p className="mt-2 text-xs font-semibold text-amber-400">{check.reason}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onFuse}
          disabled={!check.ok}
          className="flex-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
        >
          합성하기 ({FUSION_FEE}G)
        </button>
        <button
          onClick={onClear}
          disabled={uids.length === 0}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
        >
          선택 해제
        </button>
      </div>

      {result && (
        <div className="card-pop mt-4 flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-emerald-300">합성 성공!</span>
          <PlayerCard player={result} size="lg" />
        </div>
      )}
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
