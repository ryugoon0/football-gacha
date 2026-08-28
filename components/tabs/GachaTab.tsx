'use client'

import { useEffect, useState } from 'react'
import { DRAW_COST, DRAW_TEN_COST, DRAW_TEN_SIZE, drawMany } from '../../lib/gacha'
import { getPlayer } from '../../lib/players'
import { RARITIES, RARITY_STYLES, RARITY_WEIGHTS } from '../../lib/rarity'
import type { PlayerDef, Rarity } from '../../lib/types'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

const SPIN_MS = 1400

export default function GachaTab() {
  const { state, addCards } = useGame()
  const [spinning, setSpinning] = useState(false)
  const [reel, setReel] = useState<Rarity>('Normal')
  const [results, setResults] = useState<{ player: PlayerDef; isNew: boolean }[]>([])
  const [revealed, setRevealed] = useState(0)
  const [error, setError] = useState<string | null>(null)

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

  const draw = async (count: number) => {
    const cost = count >= DRAW_TEN_SIZE ? DRAW_TEN_COST : DRAW_COST * count
    if (spinning) return
    if (state.gold < cost) {
      setError('골드가 부족합니다. 경기를 뛰거나 여분 선수를 방출해 보세요.')
      return
    }

    setError(null)
    setResults([])
    setRevealed(0)
    setSpinning(true)

    const owned = new Set(state.collected)
    let players: PlayerDef[]
    try {
      const response = await fetch(`/api/gacha?count=${count}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('draw failed')
      const data = (await response.json()) as { cards: { id: string }[] }
      players = data.cards
        .map((card) => getPlayer(card.id))
        .filter((player): player is PlayerDef => Boolean(player))
      if (players.length !== count) throw new Error('bad payload')
    } catch {
      // The pull is playable offline too — fall back to the same local logic.
      players = drawMany(count)
    }

    window.setTimeout(() => {
      setSpinning(false)
      setResults(players.map((player) => ({ player, isNew: !owned.has(player.id) })))
      addCards(players, cost)
    }, SPIN_MS)
  }

  const reelStyle = RARITY_STYLES[reel]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">카드팩 뽑기</h2>
            <p className="text-sm text-slate-400">
              10연차는 레어 이상 1장을 보장합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => draw(1)}
              disabled={spinning}
              className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:opacity-40"
            >
              1회 뽑기
              <span className="ml-2 text-xs font-semibold opacity-70">{DRAW_COST}G</span>
            </button>
            <button
              onClick={() => draw(DRAW_TEN_SIZE)}
              disabled={spinning}
              className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:opacity-40"
            >
              10연차
              <span className="ml-2 text-xs font-semibold opacity-70">{DRAW_TEN_COST}G</span>
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-rose-400">{error}</p>}

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
            <p className="text-sm text-slate-500">뽑기 버튼을 눌러 카드팩을 열어보세요.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          등급별 확률
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {RARITIES.map((rarity) => {
            const style = RARITY_STYLES[rarity]
            return (
              <div
                key={rarity}
                className={`rounded-xl border-2 bg-gradient-to-b p-3 text-center ${style.face} ${style.border} ${style.ink}`}
              >
                <div className="text-sm font-bold">{style.label}</div>
                <div className="text-2xl font-black">{RARITY_WEIGHTS[rarity]}%</div>
                <div className="text-[10px] font-semibold opacity-70">
                  방출 {style.sell}G
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
