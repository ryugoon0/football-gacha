'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadTuning, registerKnobs, saveKnob } from '../../lib/configSync'
import {
  ITEMS,
  ITEM_IDS,
  priceKey,
  priceOf,
  type Currency,
  type ItemId,
} from '../../lib/items'
import type { KnobKey } from '../../lib/tuning'

const CURRENCIES: Currency[] = ['gold', 'shards']
const UNIT: Record<Currency, string> = { gold: 'G', shards: '조각' }

export default function ItemPricePanel() {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [note, setNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const read = useCallback(() => {
    const next: Record<string, number> = {}
    for (const id of ITEM_IDS) {
      for (const currency of CURRENCIES) {
        const value = priceOf(ITEMS[id], currency)
        if (value !== null) next[priceKey(id, currency)] = value
      }
    }
    setPrices(next)
  }, [])

  useEffect(() => {
    void (async () => {
      await registerKnobs()
      await loadTuning()
      read()
      setReady(true)
    })()
  }, [read])

  const commit = async (id: ItemId, currency: Currency, value: number) => {
    const key = priceKey(id, currency)
    // The price keys are generated, so they are not in the typed knob list —
    // the server checks the key and its bounds either way.
    const result = await saveKnob(key as KnobKey, value)
    if (!result.ok) {
      setNote(result.reason === 'not an operator' ? '운영자만 바꿀 수 있습니다.' : '저장하지 못했습니다.')
      return
    }
    setNote(
      result.clamped
        ? `${ITEMS[id].name}은(는) 허용 범위 안으로 조정되어 ${result.value}로 저장되었습니다.`
        : `${ITEMS[id].name} 가격을 저장했습니다.`,
    )
    await loadTuning()
    read()
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">아이템 가격</h3>
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
        <ul className="mt-3 space-y-2">
          {ITEM_IDS.map((id) => {
            const item = ITEMS[id]
            return (
              <li key={id} className="rounded-xl bg-white/5 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-base leading-none">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-100">
                    {item.name}
                  </span>
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
                            setPrices((current) => ({ ...current, [key]: Number(event.target.value) }))
                          }
                          onBlur={() => void commit(id, currency, value)}
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
      )}
    </section>
  )
}
