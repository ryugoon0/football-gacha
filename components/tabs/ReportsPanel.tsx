'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../../lib/supabase'

interface ReportRow {
  id: number
  postId: string | null
  commentId: string | null
  reason: string
  createdAt: string
  resolvedAt: string | null
  reporterEmail: string | null
  targetTitle: string | null
  targetBody: string | null
  targetNickname: string | null
  targetUserId: string | null
  targetEmail: string | null
  reportsOnTarget: number
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }) : '-')

/**
 * 신고 — what players flagged on the board, newest open first. The operator
 * deletes the post or comment (RLS lets an operator delete anything) or
 * dismisses the report; either way the report is marked resolved.
 */
export default function ReportsPanel() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data, error } = await supabase.rpc('reports_for_admin')
    if (error || !Array.isArray(data)) return
    setRows(data as ReportRow[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const resolve = async (row: ReportRow) => {
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(row.id)
    await supabase.rpc('admin_resolve_report', { p_id: row.id })
    setBusy(null)
    setNotice(`#${row.id} 신고를 종료했습니다.`)
    void load()
  }

  const removeTarget = async (row: ReportRow) => {
    const supabase = getSupabase()
    if (!supabase) return
    if (!window.confirm(row.commentId ? '이 댓글을 지울까요? 같은 대상 신고는 함께 종료됩니다.' : '이 글을 지울까요? 댓글과 같은 대상 신고도 함께 지워집니다.')) return
    setBusy(row.id)
    const { error } = row.commentId
      ? await supabase.from('comments').delete().eq('id', row.commentId)
      : await supabase.from('posts').delete().eq('id', row.postId!)
    setBusy(null)
    setNotice(error ? `지우지 못했습니다: ${error.message}` : `${row.commentId ? '댓글' : '글'}을 지웠습니다.`)
    void load()
  }

  const open = rows.filter((row) => !row.resolvedAt)
  const closed = rows.filter((row) => row.resolvedAt)

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">게시판 신고 · 미해결 {open.length}</h3>
          <button type="button" onClick={() => void load()} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold">
            새로 고침
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          글·댓글을 지우면 신고가 대상과 함께 사라집니다. 문제 없으면 「종료」. 욕설은 작성 시점에 1차로 걸러지고, 걸러지지 않은 표현은 여기서 처리합니다.
        </p>
        {notice && <p className="mt-2 text-[11px] font-semibold text-amber-300">{notice}</p>}
        {open.length === 0 && <p className="mt-3 text-xs text-slate-500">미해결 신고가 없습니다.</p>}
        <div className="mt-3 space-y-2">
          {open.map((row) => (
            <div key={row.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-black text-amber-200">{row.reason}</span>
                <span className="text-slate-500">#{row.id} · {fmt(row.createdAt)} · 신고자 {row.reporterEmail ?? '-'}</span>
                {row.reportsOnTarget > 1 && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-bold text-rose-200">같은 대상 신고 {row.reportsOnTarget}건</span>}
              </div>
              <div className="mt-2 rounded-lg bg-black/30 p-2 text-xs">
                <div className="text-[10px] text-slate-500">
                  {row.commentId ? '댓글' : '글'} · {row.targetNickname ?? '-'} ({row.targetEmail ?? '-'})
                </div>
                {row.targetTitle && !row.commentId && <div className="mt-0.5 font-bold text-slate-100">{row.targetTitle}</div>}
                <p className="mt-0.5 whitespace-pre-wrap text-slate-200">{row.targetBody ?? '(이미 지워진 대상)'}</p>
              </div>
              <div className="mt-2 flex gap-1.5">
                {row.targetBody && (
                  <button type="button" onClick={() => void removeTarget(row)} disabled={busy === row.id} className="rounded-lg bg-rose-500/25 px-3 py-1.5 text-xs font-black text-rose-100 disabled:opacity-40">
                    {row.commentId ? '댓글 삭제' : '글 삭제'}
                  </button>
                )}
                <button type="button" onClick={() => void resolve(row)} disabled={busy === row.id} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold disabled:opacity-40">
                  종료(문제 없음)
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {closed.length > 0 && (
        <section className="panel p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">최근 30일 처리됨 {closed.length}</h3>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
            {closed.slice(0, 30).map((row) => (
              <li key={row.id}>
                #{row.id} {row.reason} · {row.commentId ? '댓글' : '글'} · {row.targetNickname ?? '-'} · {fmt(row.resolvedAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
