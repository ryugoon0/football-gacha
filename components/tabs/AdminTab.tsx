'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { nicknameFrom, timeAgo, TITLE_MAX } from '../../lib/board'
import { PATCH_KIND_LABELS, sortedPatchLog, type PatchEntry } from '../../lib/patchLog'
import { buildPatchNote, defaultNoteTitle, publishedIds, validateNote } from '../../lib/patchNote'
import { friendlyError, getSupabase } from '../../lib/supabase'
import { useGame } from '../GameProvider'
import { useIsAdmin } from '../useAdmin'
import MonitorPanel from './MonitorPanel'
import BalancePanel from './BalancePanel'
import ShopPanel from './ShopPanel'

const KIND_CHIP: Record<string, string> = {
  feature: 'bg-emerald-400/15 text-emerald-300',
  balance: 'bg-sky-400/15 text-sky-300',
  fix: 'bg-amber-400/15 text-amber-300',
  internal: 'bg-white/10 text-slate-400',
}

interface NoticeRow {
  id: string
  title: string
  created_at: string
  patch_ids: string[]
}

export default function AdminTab() {
  const { state, account } = useGame()
  const { isAdmin, checked } = useIsAdmin()

  const log = useMemo(() => sortedPatchLog(), [])
  const [picked, setPicked] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [showInternal, setShowInternal] = useState(false)

  const loadNotices = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('posts')
      .select('id, title, created_at, patch_ids')
      .eq('notice', true)
      .order('created_at', { ascending: false })
      .limit(30)
    if (queryError) {
      setError(friendlyError(queryError.message))
      return
    }
    setNotices((data ?? []) as NoticeRow[])
  }, [])

  useEffect(() => {
    if (isAdmin) void loadNotices()
  }, [isAdmin, loadNotices])

  const already = useMemo(
    () => publishedIds(notices.map((row) => ({ patchIds: row.patch_ids ?? [] }))),
    [notices],
  )

  const visible = showInternal ? log : log.filter((item) => item.kind !== 'internal')
  const chosen: PatchEntry[] = picked
    .map((id) => log.find((item) => item.id === id))
    .filter((item): item is PatchEntry => Boolean(item))
  const note = buildPatchNote(chosen, title)

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  const pickUnpublished = () =>
    setPicked(visible.filter((item) => !already.has(item.id)).map((item) => item.id))

  const publish = async () => {
    const problem = validateNote(note, chosen.length)
    if (problem) {
      setError(problem)
      return
    }
    const supabase = getSupabase()
    if (!supabase || !account.user) return

    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('posts').insert({
      user_id: account.user.id,
      nickname: nicknameFrom(state.club, account.user.email),
      title: note.title,
      body: note.body,
      notice: true,
      patch_ids: chosen.map((item) => item.id),
    })
    setBusy(false)

    if (insertError) {
      setError(friendlyError(insertError.message))
      return
    }
    setDone(`공지 ${chosen.length}건을 게시했습니다.`)
    setPicked([])
    setTitle('')
    void loadNotices()
  }

  const remove = async (id: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id)
    if (deleteError) {
      setError(friendlyError(deleteError.message))
      return
    }
    void loadNotices()
  }

  if (!checked) {
    return <p className="p-6 text-sm text-slate-500">확인하는 중...</p>
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-sm font-bold text-slate-300">운영자 전용</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          이 화면은 운영자 계정에서만 열립니다. 화면을 숨기는 것과 별개로, 공지 발행은 서버에서
          한 번 더 확인하므로 운영자가 아니면 어떤 방법으로도 공지를 올릴 수 없습니다.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <MonitorPanel />
      <BalancePanel />
      <ShopPanel />

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">패치 로그</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              바뀐 내용 전부입니다. 공지로 낼 항목만 골라 주세요.
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => setShowInternal((value) => !value)}
              className="whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300"
            >
              내부 항목 {showInternal ? '숨기기' : '보기'}
            </button>
            <button
              onClick={pickUnpublished}
              className="whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              미공지 전체 선택
            </button>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {visible.map((item) => {
            const on = picked.includes(item.id)
            const sent = already.has(item.id)
            return (
              <li key={item.id}>
                <button
                  onClick={() => toggle(item.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition ${
                    on ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                      on
                        ? 'border-emerald-400 bg-emerald-400 text-slate-900'
                        : 'border-white/25 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black ${
                          KIND_CHIP[item.kind]
                        }`}
                      >
                        {PATCH_KIND_LABELS[item.kind]}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">{item.date}</span>
                      {sent && (
                        <span className="whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                          공지됨
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-bold leading-snug text-slate-100">
                      {item.title}
                    </span>
                    {item.detail && (
                      <span className="mt-1 block space-y-0.5">
                        {item.detail.map((line) => (
                          <span key={line} className="block text-[11px] leading-relaxed text-slate-400">
                            - {line}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">패치 노트 미리보기</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          고른 {chosen.length}개 항목으로 만든 공지입니다. 그대로 게시됩니다.
        </p>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={defaultNoteTitle(chosen)}
          maxLength={TITLE_MAX}
          className="mt-3 w-full rounded-lg bg-white/5 px-3 py-2 text-sm font-bold text-white outline-none placeholder:font-normal placeholder:text-slate-600"
        />

        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-300">
          {note.body || '항목을 고르면 여기에 공지 내용이 만들어집니다.'}
        </pre>

        {error && <p className="mt-2 text-[11px] font-semibold text-rose-400">{error}</p>}
        {done && <p className="mt-2 text-[11px] font-semibold text-emerald-300">{done}</p>}

        <button
          onClick={publish}
          disabled={busy || chosen.length === 0}
          className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-900 disabled:opacity-40"
        >
          {busy ? '게시하는 중...' : '공지사항에 게시'}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">올린 공지</h3>
        {notices.length === 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">아직 올린 공지가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {notices.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-100">
                    {row.title}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {timeAgo(row.created_at)} · 항목 {row.patch_ids?.length ?? 0}개
                  </span>
                </span>
                <button
                  onClick={() => remove(row.id)}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-rose-300"
                >
                  내리기
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
