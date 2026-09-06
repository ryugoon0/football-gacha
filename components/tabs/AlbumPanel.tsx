'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALBUM_FAILURE_MESSAGE, albumReward, albumSets, fetchAlbumClaimStats, fetchSyncedAlbumSetIds, syncAlbumSets } from '../../lib/album'

/**
 * 앨범 — the operator's side: push the set definitions the game derives from
 * the roster up to the server (claims are verified against that copy), and
 * see how many managers have claimed each set.
 */
export default function AlbumPanel() {
  const sets = useMemo(() => albumSets(), [])
  const [synced, setSynced] = useState<Set<string> | null>(null)
  const [claims, setClaims] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [known, stats] = await Promise.all([fetchSyncedAlbumSetIds(), fetchAlbumClaimStats()])
    setSynced(known)
    setClaims(Object.fromEntries(stats.map((row) => [row.set_id, Number(row.claims)])))
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const missing = synced ? sets.filter((set) => !synced.has(set.id)).length : sets.length
  const sync = async () => {
    setBusy(true)
    const result = await syncAlbumSets()
    setBusy(false)
    setNotice(result.ok ? `${result.count}개 묶음을 서버에 올렸습니다.` : ALBUM_FAILURE_MESSAGE[result.reason] ?? `올리지 못했습니다: ${result.reason}`)
    void load()
  }

  const byKind = (kind: 'club' | 'league' | 'special') => sets.filter((set) => set.kind === kind)
  const fmtReward = (kind: 'club' | 'league' | 'special') => {
    const reward = albumReward(kind)
    return [reward.gold > 0 ? `${reward.gold.toLocaleString('ko-KR')}G` : '', reward.tickets > 0 ? `티켓 ${reward.tickets}` : ''].filter(Boolean).join(' + ')
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">앨범 묶음 동기화</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              묶음 정의는 명단에서 자동으로 나옵니다(클럽 {byKind('club').length} · 리그 {byKind('league').length} · 특별 {byKind('special').length}). 서버가 수령을 검증하려면 이 정의가 서버에 있어야 하니,
              명단이 바뀐 뒤(새 스쿼드·월드·리미티드 배치)에는 한 번 눌러 주세요.
              {synced && missing > 0 && <b className="ml-1 text-amber-300">서버에 없는 묶음 {missing}개.</b>}
              {synced && missing === 0 && <b className="ml-1 text-emerald-300">모두 올라가 있습니다.</b>}
            </p>
          </div>
          <button type="button" onClick={() => void sync()} disabled={busy} className="rounded-lg btn-primary px-4 py-2 text-sm font-black disabled:opacity-40">
            서버에 올리기
          </button>
        </div>
        {notice && <p className="mt-2 text-[11px] font-semibold text-amber-300">{notice}</p>}
        <p className="mt-2 text-[11px] text-slate-500">
          보상(노브, 「보상」 탭에서 조절): 클럽 {fmtReward('club')} · 리그 {fmtReward('league')} · 특별 {fmtReward('special')}
        </p>
      </section>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">수령 현황</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-[11px]">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-2">묶음</th>
                <th className="py-1 pr-2">종류</th>
                <th className="py-1 pr-2 text-right">카드</th>
                <th className="py-1 pr-2 text-right">완성 조건</th>
                <th className="py-1 pr-2 text-right">서버</th>
                <th className="py-1 text-right">수령</th>
              </tr>
            </thead>
            <tbody>
              {[...byKind('special'), ...byKind('league'), ...byKind('club')].map((set) => (
                <tr key={set.id} className="border-t border-white/5">
                  <td className="py-1 pr-2 font-bold text-slate-100">{set.title}</td>
                  <td className="py-1 pr-2 text-slate-400">{set.kind === 'club' ? '클럽' : set.kind === 'league' ? '리그' : '특별'}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-slate-400">{set.kind === 'league' ? `${set.childIds.length}클럽` : set.playerIds.length}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-slate-400">{set.required}</td>
                  <td className="py-1 pr-2 text-right">{synced === null ? '…' : synced.has(set.id) ? <span className="text-emerald-300">✓</span> : <span className="text-amber-300">없음</span>}</td>
                  <td className="py-1 text-right font-black tabular-nums text-amber-300">{claims[set.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
