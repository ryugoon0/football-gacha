'use client'

import { useCallback, useEffect, useState } from 'react'
import { ITEMS } from '../lib/items'
import { GIFT_FAILURE_MESSAGE, claimGifts, fetchMyGifts, giftItemLines, type GiftRow } from '../lib/gifts'
import { useGame } from './GameProvider'

/** Unclaimed gifts, for the header badge. Polls slowly; the inbox refreshes it on open and claim. */
export function useGiftCount(enabled: boolean): { count: number; refresh: () => Promise<void> } {
  const [count, setCount] = useState(0)
  const refresh = useCallback(async () => {
    if (!enabled) return
    const rows = await fetchMyGifts()
    setCount(rows.filter((row) => !row.claimedAt).length)
  }, [enabled])
  useEffect(() => {
    if (!enabled) return
    void refresh()
    const timer = setInterval(() => void refresh(), 3 * 60 * 1000)
    return () => clearInterval(timer)
  }, [enabled, refresh])
  return { count, refresh }
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })

/**
 * 선물함 — what the operator sent me: a message with gold and items. Each gift
 * is collected once; the server locks the line and records the gold, this
 * screen adds it to the save.
 */
export default function GiftInbox({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const { grantGold, grantItems } = useGame()
  const [rows, setRows] = useState<GiftRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => setRows(await fetchMyGifts()), [])
  useEffect(() => {
    void load()
  }, [load])

  const claim = async (inboxIds?: number[]) => {
    setBusy(true)
    const result = await claimGifts(inboxIds)
    setBusy(false)
    if (!result.ok) {
      setNotice(GIFT_FAILURE_MESSAGE[result.reason] ?? '선물을 받지 못했습니다.')
      return
    }
    if (result.gold > 0) grantGold(result.gold)
    if (result.items.length > 0) grantItems(result.items)
    const parts = [
      result.gold > 0 ? `${result.gold.toLocaleString('ko-KR')}G` : '',
      ...result.items.map((line) => `${ITEMS[line.id].name} ×${line.count}`),
    ].filter(Boolean)
    setNotice(result.count === 0 ? '받을 선물이 없습니다.' : `${parts.join(' · ')}를 받았습니다.`)
    await load()
    onChanged?.()
  }

  const unclaimed = (rows ?? []).filter((row) => !row.claimedAt)
  const claimed = (rows ?? []).filter((row) => row.claimedAt)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-md overflow-y-auto p-4" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">선물함</div>
            <h3 className="mt-0.5 text-base font-black text-white">운영자가 보낸 선물</h3>
          </div>
          <div className="flex gap-1.5">
            {unclaimed.length > 1 && (
              <button onClick={() => void claim()} disabled={busy} className="rounded-lg btn-gold px-3 py-1.5 text-xs font-black disabled:opacity-40">
                모두 받기
              </button>
            )}
            <button onClick={onClose} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold">
              닫기
            </button>
          </div>
        </div>

        {notice && <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">{notice}</p>}
        {rows === null && <p className="mt-3 text-sm text-slate-400">불러오는 중…</p>}
        {rows !== null && rows.length === 0 && <p className="mt-3 text-sm text-slate-400">받은 선물이 없습니다.</p>}

        {unclaimed.length > 0 && (
          <div className="mt-3 space-y-2">
            {unclaimed.map((row) => (
              <GiftCard key={row.inboxId} row={row} action={<button onClick={() => void claim([row.inboxId])} disabled={busy} className="rounded-lg btn-primary px-3 py-1.5 text-xs font-black disabled:opacity-40">받기</button>} />
            ))}
          </div>
        )}
        {claimed.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">받은 선물 (30일)</div>
            <div className="mt-1.5 space-y-1.5 opacity-70">
              {claimed.map((row) => (
                <GiftCard key={row.inboxId} row={row} action={<span className="text-[10px] text-slate-500">{fmtDate(row.claimedAt!)} 수령</span>} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GiftCard({ row, action }: { row: GiftRow; action: React.ReactNode }) {
  const items = giftItemLines(row.items)
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">{row.title}</div>
          <div className="text-[10px] text-slate-500">
            {fmtDate(row.createdAt)}
            {row.expiresAt && !row.claimedAt ? ` · ${fmtDate(row.expiresAt)}까지` : ''}
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {row.message && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{row.message}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {row.gold > 0 && (
          <span className="gold-plate rounded-lg px-2 py-1 text-[11px] font-black text-amber-200">{row.gold.toLocaleString('ko-KR')}G</span>
        )}
        {items.map((line) => (
          <span key={line.id} className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-slate-200">
            {ITEMS[line.id].icon} {ITEMS[line.id].name} ×{line.count}
          </span>
        ))}
      </div>
    </div>
  )
}
