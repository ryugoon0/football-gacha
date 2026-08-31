'use client'

import { useEffect, useMemo, useState } from 'react'
import { DAILY_MISSIONS, missionClaimable, missionDone, weekKey } from '../../lib/daily'
import { PACKS, PITY_LIMIT, drawSession, featuredPlayer, type PackDef } from '../../lib/gacha'
import { getPlayer } from '../../lib/players'
import { RARITIES, RARITY_STYLES, RARITY_WEIGHTS } from '../../lib/rarity'
import { SHARD_OFFERS, offerLabel } from '../../lib/shards'
import type { PlayerDef, PositionGroup, Rarity } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

const SPIN_MS = 1400

const GROUPS: { id: PositionGroup; label: string }[] = [
  { id: 'GK', label: '골키퍼' },
  { id: 'DF', label: '수비' },
  { id: 'MF', label: '미드필더' },
  { id: 'FW', label: '공격' },
]

export default function GachaTab() {
  const { state, addCards, claimMission, exchangeShards } = useGame()
  const [spinning, setSpinning] = useState(false)
  const [reel, setReel] = useState<Rarity>('Normal')
  const [results, setResults] = useState<{ player: PlayerDef; isNew: boolean }[]>([])
  const [revealed, setRevealed] = useState(0)
  const [group, setGroup] = useState<PositionGroup>('FW')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const featured = useMemo(() => featuredPlayer(weekKey()), [])

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

  const openPack = async (pack: PackDef, free = false) => {
    const cost = free ? 0 : pack.cost
    if (spinning) return
    if (state.gold < cost) {
      setError('골드가 부족합니다. 리그 경기를 뛰거나 여분 선수를 방출해 보세요.')
      return
    }

    setError(null)
    setNotice(null)
    setResults([])
    setRevealed(0)
    setSpinning(true)

    const owned = new Set(state.collected)
    let players: PlayerDef[] = []
    let pity = state.pity
    let pityHit = false

    try {
      const query = new URLSearchParams({
        pack: pack.id,
        pity: String(state.pity),
        week: weekKey(),
      })
      if (pack.id === 'position') query.set('group', group)
      const response = await fetch(`/api/gacha?${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('draw failed')
      const data = (await response.json()) as {
        cards: { id: string }[]
        pity: number
        pityHit: boolean
      }
      players = data.cards
        .map((card) => getPlayer(card.id))
        .filter((player): player is PlayerDef => Boolean(player))
      if (players.length !== pack.count) throw new Error('bad payload')
      pity = data.pity
      pityHit = data.pityHit
    } catch {
      // The pull works offline too — the same logic runs in the browser.
      const outcome = drawSession({
        count: pack.count,
        pity: state.pity,
        featured,
        group: pack.id === 'position' ? group : null,
        minRarity: pack.minRarity ?? null,
        guaranteeRare: pack.guaranteeRare,
      })
      players = outcome.players
      pity = outcome.pity
      pityHit = outcome.pityHit
    }

    window.setTimeout(() => {
      setSpinning(false)
      setResults(players.map((player) => ({ player, isNew: !owned.has(player.id) })))
      addCards(players, { cost, free, pity })
      if (pityHit) setNotice('천장 도달! 레전드 이상이 확정으로 나왔습니다.')
    }, SPIN_MS)
  }

  const reelStyle = RARITY_STYLES[reel]
  const freeAvailable = !state.daily.freeDrawUsed
  const pityLeft = Math.max(0, PITY_LIMIT - state.pity)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">카드팩 뽑기</h2>
            <p className="text-sm text-slate-400">
              팩마다 나오는 카드가 다릅니다. 이번 주 픽업 선수는 확률이 두 배입니다.
            </p>
            <div className="mt-3 max-w-xs rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">레전드 이상 확정까지</span>
                <span className="font-black text-amber-300">{pityLeft}회</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(state.pity / PITY_LIMIT) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                레전드 이상을 뽑으면 다시 {PITY_LIMIT}회로 초기화됩니다.
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
          <button
            onClick={() => openPack(PACKS[0], true)}
            disabled={spinning || !freeAvailable}
            className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-sky-300 disabled:opacity-40"
          >
            무료 뽑기
            <span className="ml-2 text-xs opacity-70">{freeAvailable ? '1일 1회' : '내일 다시'}</span>
          </button>
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => openPack(pack)}
              disabled={spinning || state.gold < pack.cost}
              className={`rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-900 transition disabled:opacity-40 ${
                pack.id === 'ten'
                  ? 'bg-emerald-400 hover:bg-emerald-300'
                  : pack.id === 'rarePlus'
                    ? 'bg-violet-400 hover:bg-violet-300'
                    : 'bg-amber-400 hover:bg-amber-300'
              }`}
            >
              <span className="block">{pack.name}</span>
              <span className="block text-[10px] font-semibold opacity-70">
                {pack.description} · {pack.cost}G
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">포지션 지정 팩 자리</span>
          {GROUPS.map((item) => (
            <button
              key={item.id}
              onClick={() => setGroup(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                group === item.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-rose-400">{error}</p>}
        {notice && <p className="mt-3 text-sm font-semibold text-amber-300">{notice}</p>}

        <div className="mt-5 flex min-h-[210px] items-center justify-center rounded-xl bg-slate-950/60 p-4">
          {spinning ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`pack-shake flex h-40 w-28 items-center justify-center rounded-xl border-2 bg-gradient-to-b ${reelStyle.face} ${reelStyle.border}`}
              >
                <span className={`text-lg font-black ${reelStyle.ink}`}>?</span>
              </div>
              <p className="text-sm font-semibold text-slate-300">팩을 여는 중...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {results.slice(0, revealed).map((item, index) => (
                <div key={index} className="card-pop relative">
                  {item.isNew && (
                    <span className="absolute -left-1 -top-2 z-20 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      NEW
                    </span>
                  )}
                  <PlayerCard player={item.player} size={results.length === 1 ? 'lg' : 'md'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">팩을 골라 카드를 뽑아보세요.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">조각 교환소</h3>
          <span className="text-sm font-bold text-sky-300">보유 조각 {state.shards}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          선수를 방출하면 골드와 함께 조각을 받습니다. 조각을 모으면 등급을 지정해 카드를 받을 수 있습니다.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {SHARD_OFFERS.map((offer) => (
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
              disabled={state.shards < offer.cost}
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

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
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

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            등급별 확률과 내 기록
          </h3>
          <span className="text-xs text-slate-500">지금까지 {state.pulls.total}장 뽑음</span>
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
                <div className="text-2xl font-black">{RARITY_WEIGHTS[rarity]}%</div>
                <div className="text-[10px] font-semibold opacity-70">
                  내 기록 {pulled}장 ({actual.toFixed(1)}%)
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
