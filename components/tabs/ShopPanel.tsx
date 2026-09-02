'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadTuning, registerKnobs, saveKnob } from '../../lib/configSync'
import {
  ITEMS,
  ITEM_IDS,
  isItemVisible,
  priceKey,
  priceOf,
  visibleKey,
  type Currency,
  type ItemId,
} from '../../lib/items'
import { RARITY_STYLES } from '../../lib/rarity'
import { SHARD_OFFERS, costOf, offerKey } from '../../lib/shards'
import type { Rarity } from '../../lib/types'
import type { KnobKey } from '../../lib/tuning'

/**
 * The shop, as the operator sees it: what each thing costs, what is on the
 * shelf, and what the exchange counter charges.
 *
 * All three ride the same knob table, so all three change without a deploy and
 * all three are written to the audit log. One panel because they share one
 * load — three panels would each register and re-read the whole config.
 */

const CURRENCIES: Currency[] = ['gold', 'shards']
const UNIT: Record<Currency, string> = { gold: 'G', shards: '조각' }

export default function ShopPanel() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [shelf, setShelf] = useState<Record<string, boolean>>({})
  const [costs, setCosts] = useState<Record<string, number>>({})
  const [note, setNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const read = useCallback(() => {
    const nextPrices: Record<string, number> = {}
    const nextShelf: Record<string, boolean> = {}
    for (const id of ITEM_IDS) {
      nextShelf[visibleKey(id)] = isItemVisible(id)
      for (const currency of CURRENCIES) {
        const value = priceOf(ITEMS[id], currency)
        if (value !== null) nextPrices[priceKey(id, currency)] = value
      }
    }
    const nextCosts: Record<string, number> = {}
    for (const offer of SHARD_OFFERS) nextCosts[offerKey(offer.rarity)] = costOf(offer.rarity)
    setPrices(nextPrices)
    setShelf(nextShelf)
    setCosts(nextCosts)
  }, [])

  useEffect(() => {
    void (async () => {
      await registerKnobs()
      await loadTuning()
      read()
      setReady(true)
    })()
  }, [read])

  /**
   * The price and shelf keys are generated rather than declared, so they are
   * not in the typed knob list. The server checks the key and its bounds
   * either way, which is where it has to be checked anyway.
   */
  const save = async (key: string, value: number, what: string): Promise<boolean> => {
    const result = await saveKnob(key as KnobKey, value)
    if (!result.ok) {
      setNote(
        result.reason === 'not an operator'
          ? '운영자만 바꿀 수 있습니다.'
          : '저장하지 못했습니다.',
      )
      return false
    }
    setNote(
      result.clamped
        ? `${what}은(는) 허용 범위 안으로 조정되어 ${result.value}로 저장되었습니다.`
        : `${what}을(를) 저장했습니다.`,
    )
    await loadTuning()
    read()
    return true
  }

  const toggleShelf = async (id: ItemId) => {
    const key = visibleKey(id)
    const next = !shelf[key]
    setShelf((current) => ({ ...current, [key]: next }))
    const ok = await save(key, next ? 1 : 0, `${ITEMS[id].name} ${next ? '판매' : '숨김'}`)
    if (!ok) setShelf((current) => ({ ...current, [key]: !next }))
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">상점</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        저장하면 상점에 곧바로 반영됩니다. 가격이 없는 통화는 여기서도 만들 수 없습니다 — 파는
        방법을 새로 여는 건 코드 변경입니다.
      </p>

      {note && (
        <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-emerald-300">
          {note}
        </p>
      )}

      {!ready ? (
        <p className="mt-3 text-[11px] text-slate-500">불러오는 중...</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {ITEM_IDS.map((id) => {
              const item = ITEMS[id]
              const shown = shelf[visibleKey(id)] ?? true
              return (
                <li key={id} className={`rounded-xl bg-white/5 p-2.5 ${shown ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-base leading-none">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-100">
                      {item.name}
                    </span>
                    <button
                      onClick={() => void toggleShelf(id)}
                      aria-pressed={shown}
                      className={`shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-black ${
                        shown ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {shown ? '판매 중' : '숨김'}
                    </button>
                  </div>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {CURRENCIES.map((currency) => {
                      const base = item[currency]
                      if (base === null) return null
                      const key = priceKey(id, currency)
                      const value = prices[key] ?? base
                      return (
                        <label key={currency} className="flex items-center gap-1.5">
                          <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-slate-500">
                            {UNIT[currency]}
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={currency === 'gold' ? 50 : 5}
                            value={value}
                            onChange={(event) =>
                              setPrices((current) => ({
                                ...current,
                                [key]: Number(event.target.value),
                              }))
                            }
                            onBlur={() =>
                              void save(key, value, `${item.name} ${UNIT[currency]} 가격`)
                            }
                            aria-label={`${item.name} ${UNIT[currency]} 가격`}
                            className="w-full min-w-0 rounded-lg bg-black/30 px-2 py-1.5 text-xs font-bold tabular-nums text-slate-100 outline-none"
                          />
                          {value !== base && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] text-slate-500">
                              기본 {base}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>

          <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
            조각 교환소
          </h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            등급을 지정해 카드를 받는 비용입니다. 뽑기가 아니라 교환이므로 공개 확률과는 무관합니다.
            0은 넣을 수 없습니다 — 공짜 교환은 싼 값이 아니라 카드 무제한이 됩니다.
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {SHARD_OFFERS.map((offer) => {
              const key = offerKey(offer.rarity)
              const value = costs[key] ?? offer.cost
              const label = `${RARITY_STYLES[offer.rarity as Rarity].label} 확정`
              return (
                <li key={offer.rarity}>
                  <label className="flex items-center gap-1.5 rounded-xl bg-white/5 p-2">
                    <span className="w-16 shrink-0 truncate text-[11px] font-bold text-slate-200">
                      {label}
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={10}
                      value={value}
                      onChange={(event) =>
                        setCosts((current) => ({ ...current, [key]: Number(event.target.value) }))
                      }
                      onBlur={() => void save(key, value, `${label} 교환 비용`)}
                      aria-label={`${label} 교환 비용`}
                      className="w-full min-w-0 rounded-lg bg-black/30 px-2 py-1.5 text-xs font-bold tabular-nums text-slate-100 outline-none"
                    />
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {value === offer.cost ? '조각' : `조각 · 기본 ${offer.cost}`}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
