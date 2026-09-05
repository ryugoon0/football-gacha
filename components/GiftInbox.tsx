'use client'

import { useCallback, useEffect, useState } from 'react'
import { ITEMS } from '../lib/items'
import { GIFT_FAILURE_MESSAGE, claimGifts, fetchMyGifts, giftItemLines, giftTickets, type GiftRow } from '../lib/gifts'
import { useGame } from './GameProvider'

const SEEN_KEY = 'football-gacha:gifts-seen'

function readSeen(): Set<number> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

function writeSeen(ids: Iterable<number>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)))
  } catch {
    // Storage may be unavailable; the popup then shows again next time, which is harmless.
  }
}

/**
 * Unclaimed gifts, for the header badge and the arrival popup. Polls slowly;
 * the inbox refreshes it on open and claim. `fresh` is the unclaimed gifts
 * this browser has not been told about yet — cleared by `markSeen`.
 */
export function useGiftCount(enabled: boolean): {
  count: number
  fresh: GiftRow[]
  refresh: () => Promise<void>
  markSeen: () => void
} {
  const [count, setCount] = useState(0)
  const [fresh, setFresh] = useState<GiftRow[]>([])
  const refresh = useCallback(async () => {
    if (!enabled) return
    const rows = await fetchMyGifts()
    const unclaimed = rows.filter((row) => !row.claimedAt)
    setCount(unclaimed.length)
    const seen = readSeen()
    setFresh(unclaimed.filter((row) => !seen.has(row.inboxId)))
  }, [enabled])
  useEffect(() => {
    if (!enabled) return
    void refresh()
    const timer = setInterval(() => void refresh(), 3 * 60 * 1000)
    return () => clearInterval(timer)
  }, [enabled, refresh])
  const markSeen = useCallback(() => {
    const seen = readSeen()
    for (const row of fresh) seen.add(row.inboxId)
    writeSeen(seen)
    setFresh([])
  }, [fresh])
  return { count, fresh, refresh, markSeen }
}

/** The small "a gift has arrived" notice — one tap opens the inbox, the other dismisses. */
export function GiftArrivalPopup({ gifts, onOpen, onDismiss }: { gifts: GiftRow[]; onOpen: () => void; onDismiss: () => void }) {
  if (gifts.length === 0) return null
  const first = gifts[0]
  const totalGold = gifts.reduce((sum, row) => sum + row.gold, 0)
  const totalTickets = gifts.reduce((sum, row) => sum + giftTickets(row.items), 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onDismiss}>
      <div className="panel rise-in w-full max-w-sm p-5 text-center" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="text-3xl">🎁</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">새 선물</div>
        <h3 className="mt-1 text-base font-black text-white">
          {gifts.length === 1 ? `「${first.title}」이 도착했습니다` : `선물 ${gifts.length}개가 도착했습니다`}
        </h3>
        {first.message && gifts.length === 1 && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{first.message}</p>}
        {(totalGold > 0 || totalTickets > 0) && (
          <p className="mt-2 text-sm font-black text-amber-200">
            {[totalGold > 0 ? `${totalGold.toLocaleString('ko-KR')}G` : '', totalTickets > 0 ? `프리미엄 스카우트 티켓 ${totalTickets}장` : ''].filter(Boolean).join(' · ')} 포함
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onDismiss} className="rounded-lg btn-ghost py-2 text-xs font-bold">
            나중에
          </button>
          <button onClick={onOpen} className="rounded-lg btn-gold py-2 text-xs font-black">
            선물함 열기
          </button>
        </div>
      </div>
    </div>
  )
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })

/**
 * 선물함 — what the operator sent me: a message with gold and items. Each gift
 * is collected once; the server locks the line and records the gold, this
 * screen adds it to the save.
 */
export default function GiftInbox({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const { grantGold, grantItems, account } = useGame()
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
    // The server has already recorded the gold; the save must follow at once,
    // not after the usual pause — a refresh in between would lose the claim.
    setTimeout(() => void account.saveNow(), 50)
    const parts = [
      result.gold > 0 ? `${result.gold.toLocaleString('ko-KR')}G` : '',
      result.tickets > 0 ? `프리미엄 스카우트 티켓 ×${result.tickets}${result.ticketBalance !== null ? ` (보유 ${result.ticketBalance}장)` : ''}` : '',
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
  const tickets = giftTickets(row.items)
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
        {tickets > 0 && (
          <span className="rounded-lg bg-amber-400/20 px-2 py-1 text-[11px] font-bold text-amber-100" title="스카우트 화면에서 골드 대신 씁니다">
            🎟️ 프리미엄 스카우트 티켓 ×{tickets}
          </span>
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
