'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DAILY_MISSIONS, missionClaimable, missionDone } from '../../lib/daily'
import {
  PACKS,
  PACK_RATES,
  PITY_LIMIT,
  drawSession,
  familyLabel,
  featuredPlayer,
  packDisplayName,
  packsOfFamily,
  type PackDef,
  type RollKey,
  pickupWeekKey,
  type PackFamily,
} from '../../lib/gacha'
import { tune } from '../../lib/tuning'
import { PLAYERS_BY_RARITY, getPlayer } from '../../lib/players'
import { planReel, type ReelPlan } from '../../lib/scoutReel'
import {
  DRAW_FAILURE_MESSAGE,
  drawOnServer,
  fetchScoutTickets,
  fetchWorldPacks,
  lastDrawDetail,
  serverDrawAvailable,
  type PayWith,
} from '../../lib/serverDraw'
import { RARITIES, RARITY_STYLES } from '../../lib/rarity'
import { hasRoomFor } from '../../lib/vault'
import { offerLabel, shardOffers } from '../../lib/shards'
import type { PlayerDef, Rarity } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'
import PlayerStatsModal from '../PlayerStatsModal'
import LimitedBanner, { useLimitedPhase } from '../LimitedBanner'
import ScoutReel from '../ScoutReel'
import { newCard } from '../../lib/storage'
import { useCardStyle } from '../CardStyle'
import { RETRO_COLORS } from '../RetroPlayerCard'

/** 일반 스카우트: the pack shakes for this long, then every card is on the table. */
const SPIN_MS = 1400
/** 프리미엄: after a reel lands, how long the result sits before the next one rolls. */
const LANDED_PAUSE_MS = 1100
const LANDED_PAUSE_FAST_MS = 200

type Drawn = { player: PlayerDef; isNew: boolean }

/**
 * 스카우트 — where cards come from. 일반 opens at once; 프리미엄 runs each
 * card through a horizontal reel (ScoutReel) one at a time, ten in a row for
 * a ten-pull. The server decides every card before anything moves; the reel
 * is how it is told.
 */
export default function GachaTab() {
  const { state, addCards, claimMission, exchangeShards, spendShards } = useGame()
  const [spinning, setSpinning] = useState(false)
  const [reel, setReel] = useState<Rarity>('Normal')
  const [results, setResults] = useState<Drawn[]>([])
  const [revealed, setRevealed] = useState(0)
  const [family, setFamily] = useState<PackFamily>('basic')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // The premium sequence: the cards still to roll, the one rolling now, and the reel it rides.
  const [queue, setQueue] = useState<Drawn[]>([])
  const [reelAt, setReelAt] = useState(-1)
  const [plan, setPlan] = useState<ReelPlan | null>(null)
  const [fast, setFast] = useState(false)
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 프리미엄 스카우트 티켓 — a server balance (gifts and rewards put it there); null until read.
  const [tickets, setTickets] = useState<number | null>(null)
  // 월드 스카우트팩 — also a server balance (gifts and 월드 fusion put it there); null until read.
  const [worldPacks, setWorldPacks] = useState<number | null>(null)
  // A result card tapped for its full numbers.
  const [inspecting, setInspecting] = useState<PlayerDef | null>(null)

  const limited = useLimitedPhase()
  // The pick-up follows the 리미티드 window, so it is re-read when the phase changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const featured = useMemo(() => featuredPlayer(pickupWeekKey()), [limited.phase])
  const rolling = reelAt >= 0 && plan !== null
  const busy = spinning || rolling

  useEffect(() => {
    if (!serverDrawAvailable()) return
    void fetchScoutTickets().then((balance) => setTickets(balance))
    void fetchWorldPacks().then((balance) => setWorldPacks(balance))
  }, [])

  useEffect(() => {
    if (!spinning) return
    const timer = setInterval(() => {
      setReel(RARITIES[Math.floor(Math.random() * RARITIES.length)])
    }, 90)
    return () => clearInterval(timer)
  }, [spinning])

  useEffect(() => {
    if (results.length === 0 || revealed >= results.length) return
    const timer = setTimeout(() => setRevealed((count) => count + 1), 220)
    return () => clearTimeout(timer)
  }, [results, revealed])

  useEffect(() => () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
  }, [])

  const startReel = useCallback((items: Drawn[], index: number) => {
    setReelAt(index)
    setPlan(planReel(items[index].player, PLAYERS_BY_RARITY))
  }, [])

  const onReelDone = () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(
      () => {
        const next = reelAt + 1
        if (next < queue.length) {
          startReel(queue, next)
        } else {
          setReelAt(-1)
          setPlan(null)
          setResults(queue)
          setRevealed(queue.length)
        }
      },
      fast ? LANDED_PAUSE_FAST_MS : LANDED_PAUSE_MS,
    )
  }

  /** 조각으로 사는 스카우트: 프리미엄 1회는 노브값(10연속은 9배), 월드 팩은 따로 노브. */
  const shardCostOf = (pack: PackDef) =>
    pack.family === 'world' ? tune('worldShardCost') : pack.count >= 10 ? tune('premiumShardCost') * 9 : tune('premiumShardCost') * pack.count

  const openPack = async (pack: PackDef, free = false, payWith: PayWith = 'gold') => {
    const cost = free || payWith !== 'gold' ? 0 : pack.cost
    if (busy) return
    if (payWith === 'ticket' && (tickets ?? 0) < pack.count) {
      setError(`프리미엄 스카우트 티켓이 ${pack.count}장 필요합니다 (지금 ${tickets ?? 0}장).`)
      return
    }
    if (payWith === 'worldPack' && (worldPacks ?? 0) < pack.count) {
      setError('월드 스카우트팩이 없습니다. 선물함이나 월드 카드 3장 합성으로 얻습니다.')
      return
    }
    if (payWith === 'shards' && state.shards < shardCostOf(pack)) {
      setError(`조각이 ${shardCostOf(pack) - state.shards}개 부족합니다.`)
      return
    }
    if (state.gold < cost) {
      setError('골드가 부족합니다. 리그 경기를 뛰거나 여분 선수를 방출해 보세요.')
      return
    }
    if (!hasRoomFor(state.cards.length, state.capacity, pack.count)) {
      setError(
        `보관함이 부족합니다 (${state.cards.length} / ${state.capacity}). 선수관리 탭에서 증설하거나 선수를 방출하세요.`,
      )
      return
    }

    setError(null)
    setNotice(null)
    setResults([])
    setRevealed(0)
    setFast(false)
    setSpinning(true)

    const owned = new Set(state.collected)
    let players: PlayerDef[] = []
    let pity = state.pity
    let pityHit = false

    if (serverDrawAvailable()) {
      // With an account, only the server may open a pack. No fallback: a quiet
      // retreat to the browser would be the way around the server itself.
      const outcome = await drawOnServer(pack.id, null, { gold: state.gold, pity: state.pity }, payWith)
      if (!outcome.ok) {
        setSpinning(false)
        setError(
          outcome.reason === 'unavailable' && lastDrawDetail
            ? `${DRAW_FAILURE_MESSAGE.unavailable} (${lastDrawDetail})`
            : DRAW_FAILURE_MESSAGE[outcome.reason],
        )
        if (outcome.reason === 'not enough tickets') void fetchScoutTickets().then(setTickets)
        return
      }
      players = outcome.draw.cards
        .map((card) => getPlayer(card.id))
        .filter((player): player is PlayerDef => Boolean(player))
      if (players.length !== pack.count) {
        setSpinning(false)
        setError(DRAW_FAILURE_MESSAGE.unavailable)
        return
      }
      pity = outcome.draw.pity
      pityHit = outcome.draw.pityHit
      if (typeof outcome.draw.tickets === 'number') setTickets(outcome.draw.tickets)
      if (typeof outcome.draw.worldPacks === 'number') setWorldPacks(outcome.draw.worldPacks)
    } else {
      // No server configured means no account and no economy to protect.
      const outcome = drawSession({
        count: pack.count,
        pity: state.pity,
        featured,
        group: null,
        guarantee: pack.guarantee ?? null,
        rates: pack.rates,
      })
      players = outcome.players
      pity = outcome.pity
      pityHit = outcome.pityHit
    }

    // The cards are the player's the moment the server says so — the reveal
    // is only a reveal, and leaving the screen mid-spin must not lose them.
    addCards(players, { cost, free, pity })
    // 조각 결제는 세이브에서 나간다 — 서버가 카드를 정한 뒤에.
    if (payWith === 'shards') spendShards(shardCostOf(pack))
    const drawn = players.map((player) => ({ player, isNew: !owned.has(player.id) }))
    if (pityHit) setNotice('천장 도달! 골드 이상이 확정으로 나왔습니다.')

    if (pack.family !== 'basic') {
      setSpinning(false)
      setQueue(drawn)
      startReel(drawn, 0)
      return
    }
    window.setTimeout(() => {
      setSpinning(false)
      setResults(drawn)
    }, SPIN_MS)
  }

  const reelStyle = RARITY_STYLES[reel]
  const { style: cardStyle } = useCardStyle()
  const freeAvailable = !state.daily.freeDrawUsed
  const pityLeft = Math.max(0, PITY_LIMIT - state.pity)
  const current = rolling ? queue[reelAt] : null

  return (
    <div className="space-y-6">
      <LimitedBanner phase={limited} onInspect={setInspecting} />
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">스카우트</h2>
            <p className="text-sm text-slate-400">
              일반 스카우트는 바로 공개되고, 프리미엄 스카우트는 후보가 룰렛처럼 돌다 한 명에서 멈춥니다. 이번 주 픽업 선수는 확률이 두 배입니다.
              월드 카드는 월드 스카우트와 프리미엄(0.3%)에서 나오고, 리미티드가 열린 주에는 프리미엄이 리미티드 스카우트로 바뀝니다.
            </p>
            <div className="mt-3 max-w-xs rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">골드 이상 확정까지</span>
                <span className="font-black text-amber-300">{pityLeft}회</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(state.pity / PITY_LIMIT) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                골드 이상을 뽑으면 다시 {PITY_LIMIT}회로 초기화됩니다.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-amber-400/15 to-rose-500/10 p-3">
            <PlayerCard player={featured} size="md" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                이번 주 픽업
              </div>
              <div className="text-sm font-bold text-white">{featured.name}</div>
              <div className="text-xs text-slate-400">
                {RARITY_STYLES[featured.rarity].label} · {featured.position}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                같은 등급이 나오면 절반 확률로 이 선수
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(['basic', 'premium', 'world'] as PackFamily[]).map((key) => (
            <button
              key={key}
              onClick={() => setFamily(key)}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
                family === key
                  ? key === 'premium'
                    ? 'btn-gold'
                    : key === 'world'
                      ? 'bg-violet-400 text-slate-900'
                      : 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {familyLabel(key)}
              {key === 'world' && worldPacks !== null && <span className="ml-1.5 text-[11px] opacity-80">{worldPacks}개</span>}
            </button>
          ))}
          <button
            onClick={() => openPack(PACKS[0], true)}
            disabled={busy || !freeAvailable || !hasRoomFor(state.cards.length, state.capacity, 1)}
            className="ml-auto rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-sky-300 disabled:opacity-40"
          >
            무료 스카우트
            <span className="ml-2 text-xs opacity-70">
              {freeAvailable ? '1일 1회 · 일반' : '내일 다시'}
            </span>
          </button>
        </div>

        {!hasRoomFor(state.cards.length, state.capacity, 1) && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            보관함이 가득 찼습니다 ({state.cards.length} / {state.capacity}). 선수관리 탭에서 증설하거나
            선수를 방출해야 새 카드를 받을 수 있습니다.
          </p>
        )}

        {family === 'premium' && tickets !== null && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2">
            <span className="text-xs text-slate-300">
              🎟️ 프리미엄 스카우트 티켓 <b className="text-amber-200">{tickets}장</b>
              <span className="ml-2 text-[10px] text-slate-500">선물·보상으로 받고, 골드 대신 한 장에 한 명</span>
            </span>
            <div className="flex gap-1.5">
              {packsOfFamily('premium').map((pack) => (
                <button
                  key={`ticket-${pack.id}`}
                  onClick={() => openPack(pack, false, 'ticket')}
                  disabled={busy || tickets < pack.count || !hasRoomFor(state.cards.length, state.capacity, pack.count)}
                  className="rounded-lg btn-gold px-3 py-1.5 text-[11px] font-black disabled:opacity-40"
                >
                  티켓 {pack.count}장으로 {pack.count === 1 ? '1회' : '10연속'}
                </button>
              ))}
            </div>
          </div>
        )}

        {family === 'premium' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-400/30 bg-sky-400/5 px-3 py-2">
            <span className="text-xs text-slate-300">
              🧩 조각 <b className="text-sky-200">{state.shards}</b>
              <span className="ml-2 text-[10px] text-slate-500">방출로 모은 조각으로 프리미엄 스카우트를 엽니다</span>
            </span>
            <div className="flex gap-1.5">
              {packsOfFamily('premium').map((pack) => (
                <button
                  key={`shards-${pack.id}`}
                  onClick={() => openPack(pack, false, 'shards')}
                  disabled={busy || state.shards < shardCostOf(pack) || !hasRoomFor(state.cards.length, state.capacity, pack.count)}
                  className="rounded-lg bg-sky-500/80 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-40"
                >
                  조각 {shardCostOf(pack)}개로 {pack.count === 1 ? '1회' : '10연속'}
                </button>
              ))}
            </div>
          </div>
        )}

        {family === 'world' && (
          <div className="mt-3 rounded-xl border border-violet-400/40 bg-violet-400/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">월드 스카우트팩 <span className="text-violet-200">{worldPacks ?? '—'}개</span></div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  골드로는 팔지 않는 팩입니다. 선물함으로 받거나, 선수관리 → 승급 합성에서 월드 카드 3장을 합쳐 1개를 만들거나, 조각으로 바로 열 수 있습니다.
                  열면 플래티넘 아니면 월드 카드가 나옵니다.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => openPack(packsOfFamily('world')[0], false, 'worldPack')}
                  disabled={busy || (worldPacks ?? 0) < 1 || !hasRoomFor(state.cards.length, state.capacity, 1)}
                  className="rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-violet-300 disabled:opacity-40"
                >
                  팩으로 열기 ({worldPacks ?? 0}개)
                </button>
                <button
                  onClick={() => openPack(packsOfFamily('world')[0], false, 'shards')}
                  disabled={busy || state.shards < shardCostOf(packsOfFamily('world')[0]) || !hasRoomFor(state.cards.length, state.capacity, 1)}
                  className="rounded-xl bg-sky-500/80 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-400 disabled:opacity-40"
                >
                  조각 {shardCostOf(packsOfFamily('world')[0])}개로 열기 (보유 {state.shards})
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`mt-3 grid gap-2 sm:grid-cols-2 ${family === 'world' ? 'hidden' : ''}`}>
          {packsOfFamily(family).map((pack) => {
            // A ten pull needs ten free slots. Saying only "the vault is full"
            // when a single card still fits left the ten pull dead with no
            // explanation, which reads as a broken button rather than a rule.
            const room = hasRoomFor(state.cards.length, state.capacity, pack.count)
            const affordable = state.gold >= pack.cost
            const reason = !room
              ? `보관함에 ${pack.count}칸이 필요합니다 (지금 ${Math.max(0, state.capacity - state.cards.length)}칸)`
              : !affordable
                ? `골드가 ${(pack.cost - state.gold).toLocaleString()} 부족합니다`
                : null
            return (
              <div key={pack.id}>
                <button
                  onClick={() => openPack(pack)}
                  disabled={busy || !affordable || !room}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition disabled:opacity-40 ${
                    family === 'premium' ? 'btn-gold' : 'btn-primary'
                  }`}
                >
                  <span className="block">{packDisplayName(pack)}</span>
                  <span className="block text-[11px] font-semibold opacity-70">
                    {pack.description} · {pack.cost.toLocaleString()}G
                  </span>
                </button>
                {reason && (
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-300">
                    {reason}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {(() => {
          const rates = PACK_RATES[family]
          const keys: RollKey[] = [...RARITIES, ...((rates.Limited ?? 0) > 0 ? (['Limited'] as RollKey[]) : [])]
          return (
            <div className={`mt-3 grid gap-1.5 ${keys.length > 5 ? 'grid-cols-6' : 'grid-cols-5'}`}>
              {keys.map((key) => (
                <div
                  key={key}
                  className={`rounded-lg border px-2 py-1.5 text-center ${
                    key === 'Limited'
                      ? 'border-fuchsia-400/50'
                      : family === 'premium'
                        ? 'border-amber-400/40'
                        : family === 'world'
                          ? 'border-violet-400/40'
                          : 'border-emerald-400/30'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400">{key === 'Limited' ? '리미티드' : RARITY_STYLES[key].label}</div>
                  <div className="text-sm font-black text-white">{rates[key] ?? 0}%</div>
                </div>
              ))}
            </div>
          )
        })()}
        <p className="mt-1.5 text-[11px] text-slate-500">
          한 장을 뽑을 때 각 등급이 나올 확률입니다. 10연속의 보장 카드와 천장은 여기에 더해집니다.{' '}
          <a href="/odds" target="_blank" rel="noreferrer" className="font-bold text-emerald-300 underline-offset-2 hover:underline">확률 안내 전체 보기</a>
        </p>

        {error && <p className="mt-3 text-sm font-semibold text-rose-400">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-amber-300">{notice}</p>}

        <div className="mt-5 min-h-[210px] rounded-xl bg-slate-950/60 p-3 sm:p-4">
          {spinning ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3">
              {cardStyle === 'card2' ? (
                // The original spun a flat rarity block, not a pack.
                <div
                  className={`flex h-40 w-40 animate-pulse items-center justify-center rounded-xl shadow-lg ${RETRO_COLORS[reel]}`}
                >
                  <span className="text-2xl font-bold text-white">?</span>
                </div>
              ) : (
                <div
                  className={`pack-shake flex h-40 w-28 items-center justify-center rounded-xl border-2 bg-gradient-to-b ${reelStyle.face} ${reelStyle.border}`}
                >
                  <span className={`text-lg font-black ${reelStyle.ink}`}>?</span>
                </div>
              )}
              <p className="text-sm font-semibold text-slate-300">
                {family !== 'basic' ? '스카우트 명단을 받는 중...' : '선수를 찾는 중...'}
              </p>
            </div>
          ) : rolling && plan && current ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  {familyLabel(family)} {queue.length > 1 ? `${reelAt + 1} / ${queue.length}` : ''}
                  {plan.special && <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-200">골드 이상 확정</span>}
                </span>
                {queue.length > 1 && !fast && (
                  <button onClick={() => setFast(true)} className="rounded-lg btn-ghost px-2.5 py-1 text-[11px] font-bold">
                    빨리 보기
                  </button>
                )}
              </div>
              <ScoutReel key={`${reelAt}-${current.player.id}`} plan={plan} fast={fast} onDone={onReelDone} />
              {queue.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {queue.slice(0, reelAt).map((item, index) => (
                    <span
                      key={index}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${RARITY_STYLES[item.player.rarity].face} ${RARITY_STYLES[item.player.rarity].ink}`}
                    >
                      {item.player.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex flex-wrap justify-center gap-3">
                {results.slice(0, revealed).map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setInspecting(item.player)}
                    title="선수 정보 보기"
                    className="card-pop relative rounded-xl text-left transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {item.isNew && (
                      <span className="absolute -left-1 -top-2 z-20 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                        NEW
                      </span>
                    )}
                    <PlayerCard player={item.player} size={results.length === 1 ? 'lg' : 'md'} />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500">카드를 누르면 능력치와 포지션을 볼 수 있습니다.</p>
            </div>
          ) : (
            <p className="flex min-h-[180px] items-center justify-center text-sm text-slate-500">
              스카우트 종류를 골라 선수를 영입해 보세요.
            </p>
          )}
        </div>
      </section>

      {inspecting && (
        <PlayerStatsModal
          // The copy just added to the collection, or a fresh card of the same player if it is not there yet.
          card={[...state.cards].reverse().find((item) => item.playerId === inspecting.id) ?? newCard(inspecting.id)}
          player={inspecting}
          onClose={() => setInspecting(null)}
        />
      )}

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">조각 교환소</h3>
          <span className="text-sm font-bold text-sky-300">보유 조각 {state.shards}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          선수를 방출하면 골드와 함께 조각을 받습니다. 조각을 모으면 등급을 지정해 카드를 받을 수 있습니다.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {shardOffers().map((offer) => (
            <button
              key={offer.rarity}
              onClick={() => {
                const player = exchangeShards(offer)
                if (player) {
                  setResults([{ player, isNew: !state.collected.includes(player.id) }])
                  setRevealed(0)
                  setNotice(`${player.name} 카드를 교환했습니다.`)
                }
              }}
              disabled={busy || state.shards < offer.cost || !hasRoomFor(state.cards.length, state.capacity, 1)}
              className={`rounded-xl border-2 bg-gradient-to-b p-3 text-center transition disabled:opacity-40 ${
                RARITY_STYLES[offer.rarity].face
              } ${RARITY_STYLES[offer.rarity].border} ${RARITY_STYLES[offer.rarity].ink}`}
            >
              <div className="text-sm font-bold">{offerLabel(offer)}</div>
              <div className="text-lg font-black">{offer.cost}조각</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">일일 미션</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {DAILY_MISSIONS.map((mission) => {
            const progress = Math.min(mission.target, state.daily.progress[mission.id] ?? 0)
            const claimed = state.daily.claimed.includes(mission.id)
            const claimable = missionClaimable(state.daily, mission)
            return (
              <div key={mission.id} className="rounded-xl bg-white/5 p-3">
                <div className="text-sm font-bold text-white">{mission.label}</div>
                <div className="text-[11px] text-slate-500">{mission.hint}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div
                    className={`h-1.5 rounded-full ${
                      missionDone(state.daily, mission) ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                    style={{ width: `${(progress / mission.target) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {progress} / {mission.target}
                  </span>
                  <button
                    onClick={() => claimMission(mission.id)}
                    disabled={!claimable}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      claimed
                        ? 'bg-white/5 text-slate-500'
                        : claimable
                          ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                          : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {claimed ? '수령 완료' : `+${mission.reward}G`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            내 스카우트 기록
          </h3>
          <span className="text-xs text-slate-500">지금까지 {state.pulls.total}명 영입</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {RARITIES.map((rarity) => {
            const style = RARITY_STYLES[rarity]
            const pulled = state.pulls.byRarity[rarity] ?? 0
            const actual = state.pulls.total > 0 ? (pulled / state.pulls.total) * 100 : 0
            return (
              <div
                key={rarity}
                className={`rounded-xl border-2 bg-gradient-to-b p-3 text-center ${style.face} ${style.border} ${style.ink}`}
              >
                <div className="text-sm font-bold">{style.label}</div>
                <div className="text-2xl font-black">{pulled}장</div>
                <div className="text-[10px] font-semibold opacity-70">
                  전체의 {actual.toFixed(1)}%
                </div>
                <div className="text-[10px] font-semibold opacity-70">방출 {style.sell}G</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
