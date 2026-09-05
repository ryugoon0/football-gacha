'use client'


import { divisionLabel } from '../../lib/league'
import { tune } from '../../lib/tuning'
import { getPlayer } from '../../lib/players'
import { hasRoomFor } from '../../lib/vault'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'

export default function MarketTab() {
  const { state, buyListing, refreshMarket } = useGame()
  const listings = state.market.listings

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">이적 시장</h2>
            <p className="text-sm text-slate-400">
              매일 새로운 매물이 올라옵니다. 뽑기와 달리 원하는 선수를 골라서 영입할 수 있습니다.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              현재 {divisionLabel(state.season.division)} — 상위 리그일수록 좋은 매물이 나옵니다.
            </p>
          </div>
          <button
            onClick={refreshMarket}
            disabled={state.gold < tune('refreshCost')}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
          >
            매물 새로고침
            <span className="ml-2 text-xs font-semibold opacity-70">{tune('refreshCost')}G</span>
          </button>
        </div>

        {!hasRoomFor(state.cards.length, state.capacity, 1) && (
          <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            보관함이 가득 찼습니다 ({state.cards.length} / {state.capacity}). 선수관리 탭에서 증설하거나
            선수를 방출해야 영입할 수 있습니다.
          </p>
        )}

        {listings.length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-500">
            오늘의 매물이 모두 팔렸습니다. 새로고침하거나 내일 다시 오세요.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-4">
            {listings.map((listing) => {
              const player = getPlayer(listing.playerId)
              if (!player) return null
              const affordable =
                state.gold >= listing.price && hasRoomFor(state.cards.length, state.capacity, 1)
              return (
                <div key={listing.id} className="flex w-32 flex-col gap-2">
                  <PlayerCard player={player} size="md" dimmed={!affordable} />
                  <button
                    onClick={() => buyListing(listing)}
                    disabled={!affordable}
                    className="rounded-lg bg-amber-400 px-2 py-2 text-xs font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
                  >
                    {listing.price.toLocaleString()}G 영입
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
