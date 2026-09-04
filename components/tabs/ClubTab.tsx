'use client'

import { useMemo, useState } from 'react'
import { FUSION_FEE, FUSION_SIZE, checkFusion } from '../../lib/fusion'
import { addExperience, expForLevel, materialExp, trainingFee } from '../../lib/growth'
import {
  PLAYERS,
  POSITION_GROUP,
  effectiveOvr,
  getPlayer,
  levelCap,
} from '../../lib/players'
import { RARITIES, RARITY_STYLES } from '../../lib/rarity'
import { releaseValue, sellPrice, shardsFor } from '../../lib/shards'
import { CAPACITY_STEP, MAX_CAPACITY, canExpand, expandCost } from '../../lib/vault'
import type { Card, PlayerDef, PositionGroup, Rarity } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'
import PlayerDetail from '../PlayerDetail'
import PlayerDetailModal from '../PlayerDetailModal'

type RarityFilter = Rarity | 'all'
type GroupFilter = PositionGroup | 'all'
type SortKey = 'ovr' | 'rarity' | 'level' | 'club' | 'league'
type Mode = 'manage' | 'train' | 'break' | 'fuse' | 'release'

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: '전체',
  GK: '골키퍼',
  DF: '수비',
  MF: '미드필더',
  FW: '공격',
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'manage', label: '선수 관리' },
  { id: 'train', label: '훈련(경험치)' },
  { id: 'break', label: '한계 돌파' },
  { id: 'fuse', label: '승급 합성' },
  { id: 'release', label: '일괄 방출' },
]

/** What each mode actually does, in one line plus the rule that trips people up. */
const MODE_HELP: Record<Mode, { what: string; rule: string }> = {
  manage: {
    what: '카드를 골라 능력치와 성장 여지를 보고, 부상 치료와 체력 회복을 합니다.',
    rule: '선발·벤치 선수도 모두 볼 수 있습니다.',
  },
  train: {
    what: '다른 카드를 재료로 먹여 경험치를 쌓고 레벨을 올립니다. 레벨이 오르면 능력치가 오릅니다.',
    rule: '키울 선수는 선발이어도 되지만, 재료로 넣는 카드는 선발·벤치에서 빼야 합니다. 레벨 한계까지만 오릅니다.',
  },
  break: {
    what: '같은 선수 카드 1장을 소모해 레벨 한계를 1 올립니다. 한계가 막혀 훈련이 안 될 때 씁니다.',
    rule: '돌파할 선수는 선발이어도 되지만, 재료는 같은 선수의 다른 카드여야 하고 선발·벤치는 쓸 수 없습니다.',
  },
  fuse: {
    what: `같은 등급 카드 ${FUSION_SIZE}장과 ${FUSION_FEE.toLocaleString()}G로 한 단계 위 등급 카드 1장을 만듭니다.`,
    rule: '어떤 선수가 나올지는 뽑기와 같습니다. 선발·벤치 카드는 재료로 쓸 수 없습니다.',
  },
  release: {
    what: '여러 명을 한 번에 내보내고 골드와 조각을 받습니다. 조각은 등급 확정 교환에 씁니다.',
    rule: '같은 선수 카드는 한계 돌파 재료이니, 남는 것만 내보내세요.',
  },
}

/** Vault size, and buying ten more slots at a time. */
function VaultPanel() {
  const { state, expandVault } = useGame()
  const held = state.cards.length
  const capacity = state.capacity
  const full = held >= capacity
  const maxed = !canExpand(capacity)
  const cost = expandCost(capacity)
  const affordable = state.gold >= cost

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">보관함</h3>
      <div className="mt-2 text-2xl font-black text-white">
        {held}
        <span className="text-base font-semibold text-slate-500"> / {capacity}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full transition-all ${full ? 'bg-rose-400' : 'bg-emerald-400'}`}
          style={{ width: `${Math.min(100, (held / capacity) * 100)}%` }}
        />
      </div>

      {maxed ? (
        <p className="mt-3 text-xs text-slate-500">
          보관함이 최대 {MAX_CAPACITY}칸까지 확장되었습니다.
        </p>
      ) : (
        <button
          onClick={expandVault}
          disabled={!affordable}
          className="mt-3 w-full whitespace-nowrap rounded-xl bg-amber-400 py-2.5 text-sm font-black text-slate-900 transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 sm:hover:bg-amber-300"
        >
          +{CAPACITY_STEP}칸 증설 · {cost.toLocaleString()}G
        </button>
      )}

      <p className="mt-2 text-[11px] text-slate-500">
        {full
          ? '보관함이 가득 찼습니다. 증설하거나 선수를 방출해야 새 카드를 받을 수 있습니다.'
          : `증설할수록 비용이 올라가고, 최대 ${MAX_CAPACITY}칸까지 늘릴 수 있습니다.`}
      </p>
    </section>
  )
}

export default function ClubTab() {
  const { state, sell, trainCard, limitBreakCard, fuse, treatInjury, restoreCondition } = useGame()
  const [mode, setMode] = useState<Mode>('manage')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  // 테스터 요청: 팀컬러("같은 클럽 3명" 등)를 맞출 때 보유 카드를 리그·클럽으로
  // 좁혀 볼 수 있게. 목록은 내가 가진 카드에서만 뽑는다 — 140개 클럽 전부를
  // 보여 주면 대부분 빈 항목이다.
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [clubFilter, setClubFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('ovr')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [materialUids, setMaterialUids] = useState<string[]>([])
  const [breakUid, setBreakUid] = useState<string | null>(null)
  const [fuseUids, setFuseUids] = useState<string[]>([])
  const [fused, setFused] = useState<PlayerDef | null>(null)
  const [releaseUids, setReleaseUids] = useState<string[]>([])
  const [detailUid, setDetailUid] = useState<string | null>(null)

  const inUse = useMemo(
    () =>
      new Set(
        [...Object.values(state.squad.slots), ...state.squad.bench].filter(Boolean) as string[],
      ),
    [state.squad],
  )

  /** Leagues and clubs present in this collection, for the two dropdowns. */
  const { leagues, clubs } = useMemo(() => {
    const leagueSet = new Set<string>()
    const clubSet = new Set<string>()
    for (const card of state.cards) {
      const player = getPlayer(card.playerId)
      if (!player) continue
      leagueSet.add(player.league)
      if (leagueFilter === 'all' || player.league === leagueFilter) clubSet.add(player.club)
    }
    const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, 'ko'))
    return { leagues: sorted(leagueSet), clubs: sorted(clubSet) }
  }, [state.cards, leagueFilter])

  const rows = useMemo(() => {
    const rarityOrder = (rarity: Rarity) => RARITIES.indexOf(rarity)
    return state.cards
      .map((card) => {
        const player = getPlayer(card.playerId)
        return player ? { card, player, ovr: effectiveOvr(player, card.level) } : null
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => rarityFilter === 'all' || row.player.rarity === rarityFilter)
      .filter((row) => groupFilter === 'all' || POSITION_GROUP[row.player.position] === groupFilter)
      .filter((row) => leagueFilter === 'all' || row.player.league === leagueFilter)
      .filter((row) => clubFilter === 'all' || row.player.club === clubFilter)
      .sort((a, b) => {
        if (sortKey === 'rarity') {
          const diff = rarityOrder(b.player.rarity) - rarityOrder(a.player.rarity)
          if (diff !== 0) return diff
        }
        if (sortKey === 'level' && a.card.level !== b.card.level) return b.card.level - a.card.level
        // Same team or same league next to each other, so team colour
        // requirements ("같은 클럽 3명" etc.) are easy to check at a glance.
        if (sortKey === 'club' && a.player.club !== b.player.club) {
          return a.player.club.localeCompare(b.player.club, 'ko')
        }
        if (sortKey === 'league' && a.player.league !== b.player.league) {
          return a.player.league.localeCompare(b.player.league, 'ko')
        }
        return b.ovr - a.ovr
      })
  }, [state.cards, rarityFilter, groupFilter, leagueFilter, clubFilter, sortKey])

  const selected = rows.find((row) => row.card.uid === selectedUid) ?? null
  const detailCard = detailUid
    ? (() => {
        const card = state.cards.find((item) => item.uid === detailUid)
        const player = card ? getPlayer(card.playerId) : undefined
        return card && player ? { card, player } : null
      })()
    : null

  const resetPicks = () => {
    setMaterialUids([])
    setBreakUid(null)
    setFuseUids([])
    setFused(null)
    setReleaseUids([])
  }

  /** Cards that can be let go: anything not in the eleven or on the bench. */
  const releasable = state.cards.filter((card) => !inUse.has(card.uid))

  /**
   * Cards whose player you already own another copy of. They are limit break
   * material, so the release screen flags them instead of offering to dump them.
   */
  const breakMaterial = new Set(
    releasable
      .filter((card) => state.cards.filter((item) => item.playerId === card.playerId).length > 1)
      .map((card) => card.uid),
  )

  const onCardClick = (card: Card) => {
    if (mode === 'manage') {
      setSelectedUid(card.uid === selectedUid ? null : card.uid)
      return
    }
    if (mode === 'release') {
      if (inUse.has(card.uid)) return
      setReleaseUids((current) =>
        current.includes(card.uid)
          ? current.filter((uid) => uid !== card.uid)
          : [...current, card.uid],
      )
      return
    }
    if (mode === 'fuse') {
      if (inUse.has(card.uid)) return
      setFused(null)
      setFuseUids((current) =>
        current.includes(card.uid)
          ? current.filter((uid) => uid !== card.uid)
          : current.length >= FUSION_SIZE
            ? current
            : [...current, card.uid],
      )
      return
    }
    if (!selectedUid || card.uid === selectedUid) {
      setSelectedUid(card.uid === selectedUid ? null : card.uid)
      resetPicks()
      return
    }
    if (mode === 'train') {
      // A card that cannot be material is a request to grow that player instead.
      if (inUse.has(card.uid)) {
        setSelectedUid(card.uid)
        resetPicks()
        return
      }
      setMaterialUids((current) =>
        current.includes(card.uid)
          ? current.filter((uid) => uid !== card.uid)
          : [...current, card.uid],
      )
      return
    }
    // 한계 돌파: only a spare copy of the same player is material. Anything else
    // becomes the new target, so a starter can be picked without clearing first.
    if (selected && card.playerId === selected.card.playerId && !inUse.has(card.uid)) {
      setBreakUid((current) => (current === card.uid ? null : card.uid))
      return
    }
    setSelectedUid(card.uid)
    resetPicks()
  }

  const isPicked = (card: Card) => {
    if (mode === 'release') return releaseUids.includes(card.uid)
    if (mode === 'fuse') return fuseUids.includes(card.uid)
    if (mode === 'train') return materialUids.includes(card.uid)
    if (mode === 'break') return breakUid === card.uid
    return selectedUid === card.uid
  }

  const isTarget = (card: Card) =>
    mode !== 'fuse' && mode !== 'release' && card.uid === selectedUid

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id)
                resetPicks()
              }}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition sm:px-3 sm:text-sm ${
                mode === item.id
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === 'release' && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2">
            <span className="text-xs text-slate-400">빠른 선택</span>
            <QuickPick
              onClick={() =>
                setReleaseUids(
                  releasable
                    .filter((card) => getPlayer(card.playerId)?.rarity === 'Normal')
                    .map((card) => card.uid),
                )
              }
            >
              일반 등급 전부
            </QuickPick>
            <QuickPick onClick={() => setReleaseUids(releasable.map((card) => card.uid))}>
              선발·벤치 제외 전부
            </QuickPick>
            <QuickPick onClick={() => setReleaseUids([])}>선택 해제</QuickPick>
          </div>
        )}

        <div className="mb-3 rounded-lg bg-white/5 p-3">
          <p className="text-xs leading-relaxed text-slate-300">{MODE_HELP[mode].what}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{MODE_HELP[mode].rule}</p>
        </div>

        {(mode === 'train' || mode === 'break') && (
          <p className="mb-3 rounded-lg bg-emerald-400/10 p-2 text-xs font-semibold text-emerald-200">
            {selected
              ? mode === 'train'
                ? `${selected.player.name}에게 먹일 재료 카드를 고르세요. 다른 카드를 누르면 그 선수가 대상이 됩니다.`
                : `${selected.player.name}과 같은 선수 카드를 고르면 한계가 1 올라갑니다. 다른 카드를 누르면 그 선수가 대상이 됩니다.`
              : '먼저 키울 카드를 고르세요. 선발 선수도 대상이 될 수 있습니다.'}
          </p>
        )}

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
            value={leagueFilter}
            onChange={(event) => {
              setLeagueFilter(event.target.value)
              // A club from another league would silently match nothing.
              setClubFilter('all')
            }}
            aria-label="리그 필터"
            className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-200 outline-none [color-scheme:dark]"
          >
            <option value="all">모든 리그</option>
            {leagues.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>
          <select
            value={clubFilter}
            onChange={(event) => setClubFilter(event.target.value)}
            aria-label="클럽 필터"
            className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-200 outline-none [color-scheme:dark]"
          >
            <option value="all">모든 클럽</option>
            {clubs.map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-200 outline-none [color-scheme:dark]"
          >
            <option value="ovr">전력순</option>
            <option value="rarity">등급순</option>
            <option value="level">레벨순</option>
            <option value="club">같은 클럽끼리</option>
            <option value="league">같은 리그끼리</option>
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
                condition={card.condition}
                injuredFor={card.injuredFor}
                selected={isPicked(card) || isTarget(card)}
                dimmed={
                  mode !== 'manage' &&
                  inUse.has(card.uid) &&
                  !isTarget(card) &&
                  // Before a target is chosen, a starter is a perfectly good
                  // one — only grey it out once we are picking material.
                  (mode === 'fuse' || mode === 'release' || selectedUid !== null)
                }
                badge={
                  isTarget(card)
                    ? '대상'
                    : inUse.has(card.uid)
                      ? Object.values(state.squad.slots).includes(card.uid)
                        ? '선발'
                        : '벤치'
                      : mode === 'release' && breakMaterial.has(card.uid)
                        ? '돌파 재료'
                        : undefined
                }
                onClick={() => onCardClick(card)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="space-y-4">
        <VaultPanel />

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
            보유 카드 {state.cards.length}장 · 조각 {state.shards}개
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            같은 선수 카드는 한계 돌파 재료입니다. 중복이라고 무턱대고 내보내지 말고, 한계
            돌파에 쓰고 남는 것만 방출하세요.
          </p>
        </section>

        {mode === 'release' ? (
          <ReleasePanel
            cards={state.cards.filter((card) => releaseUids.includes(card.uid))}
            materialCount={releaseUids.filter((uid) => breakMaterial.has(uid)).length}
            onClear={() => setReleaseUids([])}
            onRelease={() => {
              const count = releaseUids.length
              if (count === 0) return
              if (!window.confirm(`선수 ${count}명을 방출할까요? 되돌릴 수 없습니다.`)) return
              sell(releaseUids)
              setReleaseUids([])
            }}
          />
        ) : mode === 'fuse' ? (
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
        ) : mode === 'train' ? (
          <TrainPanel
            target={selected}
            materials={state.cards.filter((card) => materialUids.includes(card.uid))}
            gold={state.gold}
            onClear={() => setMaterialUids([])}
            onTrain={() => {
              if (!selected) return
              trainCard(selected.card.uid, materialUids)
              setMaterialUids([])
            }}
          />
        ) : mode === 'break' ? (
          <BreakPanel
            target={selected}
            material={state.cards.find((card) => card.uid === breakUid) ?? null}
            onBreak={() => {
              if (!selected || !breakUid) return
              limitBreakCard(selected.card.uid, breakUid)
              setBreakUid(null)
            }}
          />
        ) : !selected ? (
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선수 상세</h3>
            <p className="mt-3 text-sm text-slate-500">
              카드를 선택하면 가능 포지션과 세부 능력치를 보고 관리할 수 있습니다.
            </p>
          </section>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setDetailUid(selected.card.uid)}
              className="w-full rounded-xl bg-sky-500/80 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400"
            >
              상세 보기 — 능력치 · 경험치 · 성장 여지
            </button>
            <PlayerDetail
              card={selected.card}
              player={selected.player}
              gold={state.gold}
              inSquad={inUse.has(selected.card.uid)}
              onTreat={() => treatInjury(selected.card.uid)}
              onRecover={() => restoreCondition(selected.card.uid)}
              onSell={() => {
                sell([selected.card.uid])
                setSelectedUid(null)
              }}
            />
          </div>
        )}
      </div>

      {detailCard && (
        <PlayerDetailModal
          card={detailCard.card}
          player={detailCard.player}
          gold={state.gold}
          inSquad={inUse.has(detailCard.card.uid)}
          onClose={() => setDetailUid(null)}
          onTreat={() => treatInjury(detailCard.card.uid)}
          onRecover={() => restoreCondition(detailCard.card.uid)}
          onSell={() => {
            sell([detailCard.card.uid])
            setDetailUid(null)
            setSelectedUid(null)
          }}
        />
      )}

      {/* On a phone the release confirm button sits below a long card list —
          this bar stays reachable without scrolling past it. The desktop
          layout already keeps the sidebar in view alongside the card grid. */}
      {mode === 'release' && releaseUids.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-3 shadow-xl backdrop-blur lg:hidden">
          <span className="text-sm font-bold text-white">{releaseUids.length}명 선택됨</span>
          <button
            onClick={() => {
              const count = releaseUids.length
              if (!window.confirm(`선수 ${count}명을 방출할까요? 되돌릴 수 없습니다.`)) return
              sell(releaseUids)
              setReleaseUids([])
            }}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-900"
          >
            방출하기
          </button>
        </div>
      )}
    </div>
  )
}

function QuickPick({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 transition hover:bg-white/20"
    >
      {children}
    </button>
  )
}

function ReleasePanel({
  cards,
  materialCount,
  onRelease,
  onClear,
}: {
  cards: Card[]
  /** How many of the picked cards are duplicates you could break a limit with. */
  materialCount: number
  onRelease: () => void
  onClear: () => void
}) {
  const { gold, shards } = releaseValue(cards)

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">일괄 방출</h3>
      <p className="text-sm text-slate-400">
        여러 명을 한 번에 정리합니다. 선발과 벤치에 있는 선수는 선택할 수 없습니다.
      </p>

      {materialCount > 0 && (
        <p className="rounded-lg bg-amber-500/15 p-2 text-xs font-semibold text-amber-300">
          선택한 카드 중 {materialCount}장은 같은 선수를 이미 가지고 있는 카드입니다. 한계 돌파
          재료로 쓸 수 있으니 방출 전에 한 번 더 확인하세요.
        </p>
      )}

      <div className="rounded-lg bg-white/5 p-3 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>선택</span>
          <span className="font-bold text-white">{cards.length}명</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-300">
          <span>받는 골드</span>
          <span className="font-bold text-amber-300">+{gold.toLocaleString()}G</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-300">
          <span>받는 조각</span>
          <span className="font-bold text-sky-300">+{shards}</span>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto pr-1">
          {cards.map((card) => {
            const player = getPlayer(card.playerId)
            if (!player) return null
            return (
              <div
                key={card.uid}
                className="flex items-center justify-between rounded bg-white/5 px-2 py-1 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  {player.name}{' '}
                  <span className="text-slate-500">
                    {RARITY_STYLES[player.rarity].label} Lv.{card.level}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-amber-300">
                  +{sellPrice(card)}G · +{shardsFor(card)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onRelease}
          disabled={cards.length === 0}
          className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-400 disabled:opacity-40"
        >
          {cards.length}명 방출하기
        </button>
        <button
          onClick={onClear}
          disabled={cards.length === 0}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
        >
          선택 해제
        </button>
      </div>
    </section>
  )
}

function TrainPanel({
  target,
  materials,
  gold,
  onTrain,
  onClear,
}: {
  target: { card: Card; player: PlayerDef } | null
  materials: Card[]
  gold: number
  onTrain: () => void
  onClear: () => void
}) {
  if (!target) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">훈련</h3>
        <p className="mt-3 text-sm text-slate-500">
          키울 카드를 먼저 고른 뒤, 재료로 쓸 카드를 선택하세요. 재료는 사라집니다.
        </p>
      </section>
    )
  }

  const exp = materials.reduce((sum, card) => sum + materialExp(card), 0)
  const fee = trainingFee(target.card) * materials.length
  const preview = addExperience(target.card, exp)
  const atLimit = target.card.level >= target.card.limit
  const needed = expForLevel(target.card.level)

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">훈련 (경험치)</h3>
      <div className="flex justify-center">
        <PlayerCard player={target.player} level={target.card.level} size="md" />
      </div>

      <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
        <div className="flex justify-between">
          <span>현재</span>
          <span className="font-bold text-white">
            Lv.{target.card.level} ({target.card.exp}/{needed})
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>재료 {materials.length}장</span>
          <span className="font-bold text-sky-300">+{exp} exp</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>훈련 후</span>
          <span className="font-bold text-emerald-300">
            Lv.{preview.card.level}
            {preview.gained > 0 && ` (+${preview.gained})`}
          </span>
        </div>
        {atLimit && (
          <p className="mt-2 text-xs font-semibold text-amber-400">
            한계 레벨입니다. 같은 선수 카드로 한계 돌파를 먼저 하세요.
          </p>
        )}
        {!atLimit && preview.wasted > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            한계에 걸려 {preview.wasted} exp는 버려집니다.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onTrain}
          disabled={materials.length === 0 || gold < fee || atLimit}
          className="flex-1 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
        >
          훈련하기 ({fee}G)
        </button>
        <button
          onClick={onClear}
          disabled={materials.length === 0}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
        >
          재료 해제
        </button>
      </div>
    </section>
  )
}

function BreakPanel({
  target,
  material,
  onBreak,
}: {
  target: { card: Card; player: PlayerDef } | null
  material: Card | null
  onBreak: () => void
}) {
  if (!target) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">한계 돌파</h3>
        <p className="mt-3 text-sm text-slate-500">
          한계를 올릴 카드를 고르세요. 같은 선수 카드 1장을 소모합니다.
        </p>
      </section>
    )
  }

  const cap = levelCap(target.player)
  const maxed = target.card.limit >= cap
  const ready = Boolean(material) && !maxed

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">한계 돌파</h3>
      <div className="flex justify-center">
        <PlayerCard player={target.player} level={target.card.level} size="md" />
      </div>

      <div className="rounded-lg bg-white/5 p-3 text-sm text-slate-300">
        <div className="flex justify-between">
          <span>한계 레벨</span>
          <span className="font-bold text-white">
            {target.card.limit} → {Math.min(cap, target.card.limit + 1)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {RARITY_STYLES[target.player.rarity].label} 등급 상한은 {cap}레벨입니다.
        </div>
        <div className="mt-2 text-xs">
          {maxed ? (
            <span className="font-semibold text-amber-400">이미 등급 상한에 도달했습니다.</span>
          ) : material ? (
            <span className="font-semibold text-emerald-300">
              같은 선수 카드 1장이 소모됩니다.
            </span>
          ) : (
            <span className="text-slate-500">
              목록에서 {target.player.name} 카드를 한 장 더 선택하세요.
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onBreak}
        disabled={!ready}
        className="w-full rounded-lg bg-violet-400 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-violet-300 disabled:opacity-40"
      >
        한계 돌파
      </button>
    </section>
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
        선발·벤치 카드는 사용할 수 없습니다.
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
