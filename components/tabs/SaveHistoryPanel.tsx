'use client'

import { useState } from 'react'
import { findUsersForGift, type AdminUserRow } from '../../lib/gifts'
import { SAVE_HISTORY_REASON_LABEL, fetchSaveHistory, restoreSave, snapshotSave, type SaveHistoryRow } from '../../lib/saveHistory'

const field = 'rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-100 outline-none'

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * 저장본 — find a manager, see the versions the server kept of their save,
 * and roll back to one. The current version is kept as 「복원 직전」 first, so
 * a restore can itself be undone.
 */
export default function SaveHistoryPanel() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [picked, setPicked] = useState<AdminUserRow | null>(null)
  const [rows, setRows] = useState<SaveHistoryRow[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const search = async () => {
    setBusy(true)
    setUsers(await findUsersForGift(query))
    setBusy(false)
  }
  const open = async (user: AdminUserRow) => {
    setPicked(user)
    setNotice(null)
    setBusy(true)
    setRows(await fetchSaveHistory(user.user_id))
    setBusy(false)
  }
  const reload = async () => {
    if (picked) setRows(await fetchSaveHistory(picked.user_id))
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">저장본 이력</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          서버가 세이브의 이전 판을 보관합니다. 자동 저장은 10분에 한 번 남기고(최근 30개), 하루 첫 판은 14일치, 복원 직전 판은 20개를 둡니다.
          복원하면 유저가 다음에 저장할 때 서버 판이 새 것으로 잡혀, 새로고침 뒤 「충돌」 창에서 어느 쪽을 쓸지 고르게 됩니다. 복원 뒤에는 유저에게 새로고침을 안내하세요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void search()
            }}
            placeholder="클럽명 또는 이메일 일부"
            className={`${field} w-64`}
          />
          <button onClick={() => void search()} disabled={busy || !query.trim()} className="rounded-lg btn-primary px-3 py-1.5 text-xs font-black disabled:opacity-40">
            찾기
          </button>
        </div>
        {users.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {users.map((user) => (
              <button
                key={user.user_id}
                onClick={() => void open(user)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${picked?.user_id === user.user_id ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
              >
                {user.club || '(클럽 없음)'} <span className="ml-1 font-normal text-slate-400">{user.email}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {picked && (
        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              {picked.club || '(클럽 없음)'} <span className="ml-1 text-xs font-normal text-slate-400">{picked.email}</span>
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={async () => {
                  setBusy(true)
                  const result = await snapshotSave(picked.user_id)
                  setBusy(false)
                  setNotice(result.ok ? '지금 판을 「운영자 저장」으로 남겼습니다.' : `남기지 못했습니다: ${result.reason}`)
                  await reload()
                }}
                disabled={busy}
                className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                지금 판 남기기
              </button>
              <button onClick={() => void reload()} disabled={busy} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold disabled:opacity-40">
                새로고침
              </button>
            </div>
          </div>
          {notice && <p className="mt-2 text-xs font-semibold text-amber-200">{notice}</p>}
          {rows.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">보관된 이력이 아직 없습니다. 유저가 다음에 저장하면 이전 판이 남습니다.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="py-1 text-left">시각(KST)</th>
                    <th className="py-1 text-left">종류</th>
                    <th className="py-1 text-right">골드</th>
                    <th className="py-1 text-right">카드</th>
                    <th className="py-1 text-right">경기</th>
                    <th className="py-1 text-right">시즌</th>
                    <th className="py-1 text-right">rev</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody className="text-slate-200 [font-variant-numeric:tabular-nums]">
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="py-1.5">{fmt(row.saved_at)}</td>
                      <td className="py-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${row.reason === 'pre-restore' ? 'bg-rose-500/20 text-rose-200' : row.reason === 'daily' ? 'bg-sky-400/20 text-sky-100' : row.reason === 'manual' ? 'bg-amber-400/20 text-amber-100' : 'bg-white/10 text-slate-300'}`}>
                          {SAVE_HISTORY_REASON_LABEL[row.reason] ?? row.reason}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">{row.gold?.toLocaleString('ko-KR') ?? '—'}</td>
                      <td className="py-1.5 text-right">{row.cards ?? '—'}</td>
                      <td className="py-1.5 text-right">{row.played ?? '—'}</td>
                      <td className="py-1.5 text-right">{row.season ?? '—'}</td>
                      <td className="py-1.5 text-right text-slate-500">{row.revision ?? '—'}</td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={async () => {
                            if (!window.confirm(`${fmt(row.saved_at)} 판으로 되돌릴까요? 지금 판은 「복원 직전」으로 남습니다. 유저는 새로고침 뒤 충돌 창에서 서버 판을 골라야 합니다.`)) return
                            setBusy(true)
                            const result = await restoreSave(row.id)
                            setBusy(false)
                            setNotice(result.ok ? `${fmt(result.restoredFrom)} 판으로 되돌렸습니다 (rev ${result.revision}). 유저에게 새로고침을 안내하세요.` : `되돌리지 못했습니다: ${result.reason}`)
                            await reload()
                          }}
                          disabled={busy}
                          className="rounded-lg bg-rose-500/80 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-400 disabled:opacity-40"
                        >
                          이 판으로 복원
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
