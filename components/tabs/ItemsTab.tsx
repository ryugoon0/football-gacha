'use client'

import { useMemo, useState } from 'react'
import {
  ITEMS,
  ITEM_IDS,
  visibleItemIds,
  itemCount,
  priceOf,
  purchaseProblem,
  remainingToday,
  cardUseProblem,
  type Currency,
  type ItemDef,
  type ItemId,
} from '../../lib/items'
import { getPlayer } from '../../lib/players'
import { MAX_CAPACITY } from '../../lib/vault'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'
import TacticCardHelp from '../TacticCardHelp'

const COUNTS = [1, 5, 10]

function Price({ item, currency }: { item: ItemDef; currency: Currency }) {
  const price = priceOf(item, currency)
  if (price === null) return null
  return (
    <span className={currency === 'gold' ? 'text-amber-300' : 'text-violet-300'}>
      {price.toLocaleString()}
      {currency === 'gold' ? 'G' : '조각'}
    </span>
  )
}

export default function ItemsTab() {
  const { state, buyItem, spendItemOnCard, spendItemOnClub } = useGame()
  // The operator can take an item off the shelf without a deploy; anything
  // already bought stays in the bag below.
  const shelf = visibleItemIds()
  const [side, setSide] = useState<'shop' | 'bag'>('shop')
  const [count, setCount] = useState(1)
  const [note, setNote] = useState<string | null>(null)
  const [picking, setPicking] = useState<ItemId | null>(null)
  const [showCardHelp, setShowCardHelp] = useState(false)

  const owned = useMemo(
    () =>
      state.cards
        .map((card) => ({ card, player: getPlayer(card.playerId) }))
        .filter((item): item is { card: typeof item.card; player: NonNullable<typeof item.player> } =>
          Boolean(item.player),
        ),
    [state.cards],
  )

  const buy = (item: ItemDef, currency: Currency) => {
    const problem = purchaseProblem({
      item,
      currency,
      count,
      gold: state.gold,
      shards: state.shards,
      buys: state.daily.shopBuys,
    })
    if (problem) {
      setNote(problem)
      return
    }
    buyItem(item.id, currency, count)
    setNote(`${item.name} ${count}개를 샀습니다.`)
  }

  const spendOnClub = (id: ItemId) => {
    if (id === 'vaultPermit' && state.capacity >= MAX_CAPACITY) {
      setNote(`보관함은 ${MAX_CAPACITY}칸이 최대입니다.`)
      return
    }
    spendItemOnClub(id)
    setNote(`${ITEMS[id].name}을(를) 썼습니다.`)
  }

  const spendOnCard = (id: ItemId, uid: string) => {
    const card = state.cards.find((item) => item.uid === uid)
    if (!card) return
    const problem = cardUseProblem(id, card)
    if (problem) {
      setNote(problem)
      return
    }
    spendItemOnCard(id, uid)
    setPicking(null)
    setNote(`${ITEMS[id].name}을(를) 썼습니다.`)
  }

  return (
    <div className="space-y-4">
      {showCardHelp && <TacticCardHelp onClose={() => setShowCardHelp(false)} />}
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(['shop', 'bag'] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setSide(key)
                  setNote(null)
                  setPicking(null)
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  side === key ? 'btn-primary' : 'bg-white/5 text-slate-300'
                }`}
              >
                {key === 'shop' ? '상점' : '창고'}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-2 text-xs font-black">
            <span className="whitespace-nowrap rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-amber-300">
              {state.gold.toLocaleString()}G
            </span>
            <span className="whitespace-nowrap rounded-lg bg-violet-400/15 px-2.5 py-1.5 text-violet-300">
              조각 {state.shards.toLocaleString()}
            </span>
          </div>
        </div>

        {note && (
          <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-emerald-300">
            {note}
          </p>
        )}
      </section>

      {side === 'shop' ? (
        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">상점</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">수량</span>
              {COUNTS.map((value) => (
                <button
                  key={value}
                  onClick={() => setCount(value)}
                  className={`whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    count === value ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {shelf.length === 0 && (
            <p className="mt-3 rounded-xl bg-white/5 px-3 py-4 text-center text-[11px] text-slate-500">
              지금은 파는 물건이 없습니다. 잠시 뒤에 다시 와 주세요.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {shelf.map((id) => {
              const item = ITEMS[id]
              const left = remainingToday(item, state.daily.shopBuys)
              return (
                <li key={id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-xl leading-none">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xs font-bold text-slate-100">{item.name}</span>
                        <span className="whitespace-nowrap rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                          보유 {itemCount(state.items, id)}
                        </span>
                        {left !== null && (
                          <span className="whitespace-nowrap rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                            오늘 {left}/{item.dailyLimit}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{item.note}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(['gold', 'shards'] as const).map((currency) =>
                      priceOf(item, currency) === null ? null : (
                        <button
                          key={currency}
                          onClick={() => buy(item, currency)}
                          className="min-w-0 flex-1 whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-2 text-[11px] font-bold text-slate-100 transition hover:bg-white/20"
                        >
                          {count > 1 && `${count}개 · `}
                          <Price item={item} currency={currency} />
                          {count > 1 && ' 씩'}
                        </button>
                      ),
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section className="panel p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">창고</h3>
          {ITEM_IDS.every((id) => itemCount(state.items, id) === 0) ? (
            <p className="mt-3 text-[11px] text-slate-500">
              가진 아이템이 없습니다. 상점에서 사 보세요.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ITEM_IDS.filter((id) => itemCount(state.items, id) > 0).map((id) => {
                const item = ITEMS[id]
                return (
                  <li key={id} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-xl leading-none">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-xs font-bold text-slate-100">{item.name}</span>
                          <span className="whitespace-nowrap rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                            ×{itemCount(state.items, id)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          {item.note}
                        </p>
                      </div>
                      {item.target === 'match' ? (
                        <button
                          onClick={() => setShowCardHelp(true)}
                          className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/20"
                        >
                          사용법 보기
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            item.target === 'club' ? spendOnClub(id) : setPicking(picking === id ? null : id)
                          }
                          className="shrink-0 whitespace-nowrap rounded-lg btn-primary px-3 py-1.5 text-[11px] font-black"
                        >
                          {item.target === 'club' ? '사용' : picking === id ? '닫기' : '선수 고르기'}
                        </button>
                      )}
                    </div>

                    {picking === id && (
                      <div className="mt-3">
                        {(() => {
                          // On a phone there is no hover, so a row of dimmed
                          // cards would say nothing about why none can be used.
                          const usable = owned.filter(({ card }) => !cardUseProblem(id, card))
                          return usable.length === 0 ? (
                            <p className="mb-1.5 text-[11px] font-semibold text-amber-300">
                              지금 이 아이템을 쓸 수 있는 선수가 없습니다 —{' '}
                              {cardUseProblem(id, owned[0]?.card ?? state.cards[0]) ?? ''}
                            </p>
                          ) : (
                            <p className="mb-1.5 text-[11px] text-slate-500">
                              쓸 선수를 고르세요. 지금 쓸 수 있는 선수 {usable.length}명.
                            </p>
                          )
                        })()}
                        <div className="flex flex-wrap gap-1.5">
                          {owned.map(({ card, player }) => {
                            const problem = cardUseProblem(id, card)
                            return (
                              <button
                                key={card.uid}
                                onClick={() => spendOnCard(id, card.uid)}
                                disabled={Boolean(problem)}
                                title={problem ?? '이 선수에게 사용'}
                                className={problem ? 'opacity-30' : ''}
                              >
                                <PlayerCard
                                  player={player}
                                  level={card.level}
                                  size="sm"
                                  condition={card.condition}
                                  injuredFor={card.injuredFor}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
