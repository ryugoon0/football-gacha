'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ITEMS, type ItemId } from '../../lib/items'
import { PLAYERS, getPlayer } from '../../lib/players'
import {
  GIFT_FAILURE_MESSAGE,
  GIFT_TARGET_LABEL,
  TICKET_KEY,
  describeTarget,
  giftTickets,
  fetchGiftsForAdmin,
  findUsersForGift,
  giftAudienceCount,
  sendGift,
  type AdminGiftRow,
  type AdminUserRow,
  type GiftTarget,
} from '../../lib/gifts'

const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }) : '-')

/**
 * 선물하기 — gold and items with a message, to everyone, to picked managers,
 * or by activity. The server decides who qualifies at the moment of sending
 * and puts one line per recipient in their 선물함.
 */
export default function GiftPanel() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [gold, setGold] = useState(0)
  const [items, setItems] = useState<Partial<Record<ItemId, number>>>({})
  const [ticketCount, setTicketCount] = useState(0)
  // Cards handed over as they are, by player id. A club's whole current squad in one click.
  const [cards, setCards] = useState<string[]>([])
  const [cardClub, setCardClub] = useState('')
  const [cardText, setCardText] = useState('')
  const squadClubs = useMemo(() => [...new Set(PLAYERS.filter((p) => p.fromSquad && !p.unreleased && !p.limited && p.rarity !== 'World').map((p) => p.club))].sort((a, b) => a.localeCompare(b, 'ko')), [])
  const [kind, setKind] = useState<GiftTarget['kind']>('all')
  const [days, setDays] = useState(7)
  const [picked, setPicked] = useState<AdminUserRow[]>([])
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<AdminUserRow[]>([])
  const [expires, setExpires] = useState('')
  const [audience, setAudience] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<AdminGiftRow[]>([])

  const target = useMemo<GiftTarget>(() => {
    if (kind === 'all') return { kind: 'all' }
    if (kind === 'welcome') return { kind: 'welcome' }
    if (kind === 'users') return { kind: 'users', userIds: picked.map((row) => row.user_id) }
    return { kind, days: Math.max(0, Math.floor(days)) }
  }, [kind, days, picked])

  const loadHistory = useCallback(async () => setHistory(await fetchGiftsForAdmin()), [])
  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // The audience count follows the target as it is edited.
  useEffect(() => {
    let live = true
    setAudience(null)
    const timer = setTimeout(() => {
      void giftAudienceCount(target).then((count) => {
        if (live) setAudience(count)
      })
    }, 300)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [target])

  useEffect(() => {
    if (kind !== 'users' || query.trim().length < 1) {
      setFound([])
      return
    }
    let live = true
    const timer = setTimeout(() => {
      void findUsersForGift(query).then((rows) => {
        if (live) setFound(rows)
      })
    }, 300)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [kind, query])

  const itemLines = Object.entries(items).filter(([, count]) => (count ?? 0) > 0) as [ItemId, number][]
  const canSend =
    title.trim().length > 0 && (gold > 0 || itemLines.length > 0 || ticketCount > 0 || cards.length > 0) && (kind !== 'users' || picked.length > 0) && !busy

  const send = async () => {
    if (!canSend) return
    const summary = `${describeTarget(target)}${audience !== null ? ` (${audience}명)` : ''}에게 「${title.trim()}」 — ${gold > 0 ? `${gold.toLocaleString('ko-KR')}G` : ''}${
      ticketCount > 0 ? ` 프리미엄 티켓×${ticketCount}` : ''
    }${cards.length > 0 ? ` 선수 카드 ${cards.length}장` : ''}${itemLines.length ? ` ${itemLines.map(([id, count]) => `${ITEMS[id].name}×${count}`).join(', ')}` : ''} 보낼까요?`
    if (!window.confirm(summary)) return
    setBusy(true)
    const result = await sendGift({
      title: title.trim(),
      message: message.trim(),
      gold,
      items: { ...Object.fromEntries(itemLines), ...(ticketCount > 0 ? { [TICKET_KEY]: ticketCount } : {}) },
      cards,
      target,
      expiresAt: expires ? new Date(expires).toISOString() : null,
    })
    setBusy(false)
    if (!result.ok) {
      setNotice(GIFT_FAILURE_MESSAGE[result.reason] ?? `보내지 못했습니다: ${result.reason}`)
      return
    }
    setNotice(`${result.recipients}명에게 보냈습니다.`)
    setTitle('')
    setMessage('')
    setGold(0)
    setItems({})
    setTicketCount(0)
    setCards([])
    setCardText('')
    setPicked([])
    void loadHistory()
  }

  const field = 'w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600'

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel space-y-4 p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선물하기</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            받는 사람은 게임 상단 「선물함」에서 수령합니다. 골드는 원장에 &apos;gift&apos;로 남고, 대상은 보내는 순간 확정됩니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            제목 (40자)
            <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 40))} placeholder="예: 오픈 기념 선물" className={`${field} mt-1`} />
          </label>
          <label className="block text-xs text-slate-400">
            골드
            <input
              type="number"
              min={0}
              step={100}
              value={gold}
              onChange={(event) => setGold(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
              className={`${field} mt-1 tabular-nums`}
            />
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          메시지 (500자)
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 500))}
            rows={3}
            placeholder="함께 보낼 말"
            className={`${field} mt-1 resize-y`}
          />
        </label>

        <label className="block text-xs text-slate-400">
          🎟️ 프리미엄 스카우트 티켓 (장)
          <span className="ml-2 text-[10px] text-slate-500">아이템이 아니라 서버 잔고입니다 — 스카우트 화면에서 골드 대신 한 장에 한 명, 상점에서는 팔지 않음</span>
          <input
            type="number"
            min={0}
            max={99}
            value={ticketCount}
            onChange={(event) => setTicketCount(Math.max(0, Math.min(99, Math.floor(Number(event.target.value) || 0))))}
            className={`${field} mt-1 w-32 tabular-nums`}
          />
        </label>

        <div>
          <div className="text-xs text-slate-400">
            🃏 선수 카드 <span className="ml-1 text-[10px] text-slate-500">카드 id 를 그대로 선물합니다. 같은 id 를 두 번 쓰면 두 장.</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select value={cardClub} onChange={(event) => setCardClub(event.target.value)} className={`${field} w-56`}>
              <option className="bg-slate-900 text-slate-100" value="">클럽 선택…</option>
              {squadClubs.map((club) => (
                <option className="bg-slate-900 text-slate-100" key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!cardClub}
              onClick={() => {
                const ids = PLAYERS.filter((p) => p.fromSquad && !p.unreleased && !p.limited && p.rarity !== 'World' && p.club === cardClub).map((p) => p.id)
                setCards((current) => [...current, ...ids])
              }}
              className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              이 클럽 현 스쿼드 한 장씩 추가
            </button>
            <input
              value={cardText}
              onChange={(event) => setCardText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const ids = cardText.split(/[\s,]+/).map((v) => v.trim()).filter((v) => v && getPlayer(v))
                setCards((current) => [...current, ...ids])
                setCardText('')
              }}
              placeholder="카드 id 직접 입력 (쉼표·공백 구분, Enter)"
              className={`${field} w-64`}
            />
            {cards.length > 0 && (
              <button type="button" onClick={() => setCards([])} className="rounded-lg btn-ghost px-2.5 py-1.5 text-xs font-bold">
                비우기
              </button>
            )}
          </div>
          {cards.length > 0 && (
            <p className="mt-1 text-[11px] text-emerald-300">
              {cards.length}장: {cards.slice(0, 12).map((id) => getPlayer(id)?.name ?? id).join(', ')}
              {cards.length > 12 ? ' …' : ''}
            </p>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-400">아이템</div>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {ITEM_IDS.map((id) => {
              const count = items[id] ?? 0
              return (
                <div key={id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${count > 0 ? 'bg-emerald-400/10' : 'bg-white/5'}`}>
                  <span className="min-w-0 flex-1 truncate text-slate-200" title={ITEMS[id].note}>
                    {ITEMS[id].icon} {ITEMS[id].name}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={count}
                    onChange={(event) => setItems((current) => ({ ...current, [id]: Math.max(0, Math.min(99, Math.floor(Number(event.target.value) || 0))) }))}
                    className="w-14 rounded bg-black/30 px-1.5 py-1 text-right text-xs text-white outline-none tabular-nums"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">받는 사람</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(GIFT_TARGET_LABEL) as GiftTarget['kind'][]).map((key) => (
              <button
                key={key}
                onClick={() => setKind(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${kind === key ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
              >
                {GIFT_TARGET_LABEL[key].replace('N일', `${days}일`)}
              </button>
            ))}
          </div>
          {(kind === 'inactive' || kind === 'active' || kind === 'new') && (
            <label className="mt-2 block text-xs text-slate-400">
              일수
              <input
                type="number"
                min={0}
                max={3650}
                value={days}
                onChange={(event) => setDays(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
                className={`${field} mt-1 w-32 tabular-nums`}
              />
            </label>
          )}
          {kind === 'users' && (
            <div className="mt-2 space-y-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="클럽명 또는 이메일로 찾기" className={field} />
              {found.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-black/30 p-1.5">
                  {found
                    .filter((row) => !picked.some((item) => item.user_id === row.user_id))
                    .map((row) => (
                      <button
                        key={row.user_id}
                        onClick={() => setPicked((current) => [...current, row])}
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[11px] text-slate-200 hover:bg-white/10"
                      >
                        <span className="truncate">
                          <b>{row.club || '(클럽명 없음)'}</b> <span className="text-slate-500">{row.email}</span>
                        </span>
                        <span className="shrink-0 text-slate-500">마지막 저장 {fmt(row.last_seen_at)}</span>
                      </button>
                    ))}
                </div>
              )}
              {picked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((row) => (
                    <span key={row.user_id} className="flex items-center gap-1 rounded-lg bg-emerald-400/15 px-2 py-1 text-[11px] font-bold text-emerald-200">
                      {row.club || row.email}
                      <button onClick={() => setPicked((current) => current.filter((item) => item.user_id !== row.user_id))} className="text-slate-400 hover:text-white" aria-label="제외">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            대상: <b className="text-slate-200">{describeTarget(target)}</b>
            {kind === 'welcome'
              ? ' · 지금 있는 계정에는 가지 않고, 앞으로 가입하는 계정마다 선물함에 들어갑니다. 새로 보내면 이전 가입 선물은 만료됩니다.'
              : audience !== null
                ? ` · 지금 기준 ${audience}명`
                : ' · 세는 중…'}
            {kind === 'active' || kind === 'inactive' ? ' — 세이브가 마지막으로 저장된 시각 기준' : ''}
          </p>
        </div>

        <label className="block text-xs text-slate-400">
          수령 기한 (비우면 없음)
          <input type="datetime-local" value={expires} onChange={(event) => setExpires(event.target.value)} className={`${field} mt-1 w-60 [color-scheme:dark]`} />
        </label>

        <button onClick={() => void send()} disabled={!canSend} className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 disabled:opacity-40">
          {busy ? '보내는 중…' : '선물 보내기'}
        </button>
        {notice && <p className="text-xs text-emerald-200">{notice}</p>}
      </section>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">발송 내역</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">아직 보낸 선물이 없습니다.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {history.map((row) => (
              <div key={row.id} className="rounded-lg bg-white/5 px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-white">{row.title}</span>
                  <span className="shrink-0 text-slate-500">{fmt(row.created_at)}</span>
                </div>
                <div className="mt-0.5 text-slate-400">
                  {describeTarget(row.target)} · {row.recipients}명 중 {row.claimed}명 수령
                  {row.expires_at ? ` · ${fmt(row.expires_at)}까지` : ''}
                </div>
                <div className="mt-0.5 text-slate-300">
                  {row.gold > 0 ? `${row.gold.toLocaleString('ko-KR')}G` : ''}
                  {giftTickets(row.items) > 0 ? ` 🎟️×${giftTickets(row.items)}` : ''}
                  {(row.cards?.length ?? 0) > 0 ? ` 🃏×${row.cards!.length}` : ''}
                  {Object.entries(row.items ?? {})
                    .filter(([id, count]) => id in ITEMS && Number(count) > 0)
                    .map(([id, count]) => ` ${ITEMS[id as ItemId].name}×${count}`)
                    .join('')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
