'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALBUM_FAILURE_MESSAGE,
  albumProgress,
  albumReward,
  albumSets,
  claimAlbumSet,
  fetchMyAlbumClaims,
  fetchSyncedAlbumSetIds,
  ownedPlayerIds,
  type AlbumSet,
} from '../../lib/album'
import { getPlayer } from '../../lib/players'
import { useGame } from '../GameProvider'
import PlayerCard from '../PlayerCard'
import PlayerArchiveModal from '../PlayerArchiveModal'

const SPECIAL = '특별'

/**
 * 앨범 — leagues across the top, club albums in a grid, one club open at a
 * time with its squad shown owned or not. A complete, unclaimed album shows
 * 「보상 받기」; the reward lands in the 선물함.
 */
export default function AlbumTab() {
  const { state, account } = useGame()
  const signedIn = account.status === 'signedIn'
  const sets = useMemo(() => albumSets(), [])
  const owned = useMemo(() => ownedPlayerIds(state.cards), [state.cards])
  const leagues = useMemo(() => [...new Set(sets.filter((set) => set.kind === 'club').map((set) => set.subtitle))], [sets])
  const [league, setLeague] = useState<string>(leagues[0] ?? SPECIAL)
  const [openId, setOpenId] = useState<string | null>(null)
  const [claims, setClaims] = useState<Set<string>>(new Set())
  const [synced, setSynced] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!signedIn) return
    const [mine, known] = await Promise.all([fetchMyAlbumClaims(), fetchSyncedAlbumSetIds()])
    setClaims(mine)
    setSynced(known)
  }, [signedIn])
  useEffect(() => {
    void load()
  }, [load])

  const progressOf = (set: AlbumSet) => albumProgress(set, owned, sets)
  const shown = league === SPECIAL ? sets.filter((set) => set.kind === 'special') : sets.filter((set) => set.kind === 'club' && set.subtitle === league)
  const leagueSet = league === SPECIAL ? null : sets.find((set) => set.kind === 'league' && set.title === league) ?? null
  const open = openId ? sets.find((set) => set.id === openId) ?? null : null
  const completeCount = sets.filter((set) => set.kind === 'club' && progressOf(set).complete).length
  const clubCount = sets.filter((set) => set.kind === 'club').length

  const claim = async (set: AlbumSet) => {
    if (!signedIn) {
      setNotice('로그인해야 앨범 보상을 받을 수 있습니다.')
      return
    }
    setBusy(set.id)
    setNotice(null)
    // The server checks the cloud save, so make sure the latest cards are up there first.
    await account.saveNow()
    const result = await claimAlbumSet(set.id)
    setBusy(null)
    if (!result.ok) {
      setNotice(ALBUM_FAILURE_MESSAGE[result.reason] ?? `받지 못했습니다: ${result.reason}`)
      return
    }
    const parts = [result.gold > 0 ? `${result.gold.toLocaleString('ko-KR')}G` : '', result.tickets > 0 ? `프리미엄 티켓 ${result.tickets}장` : ''].filter(Boolean)
    setNotice(`「${set.title}」 앨범 완성! ${parts.join(' · ')}가 선물함에 도착했습니다.`)
    void load()
  }

  const ClaimButton = ({ set }: { set: AlbumSet }) => {
    const progress = progressOf(set)
    const claimed = claims.has(set.id)
    const known = synced === null || synced.has(set.id)
    const reward = albumReward(set.kind)
    const rewardText = [reward.gold > 0 ? `${reward.gold.toLocaleString('ko-KR')}G` : '', reward.tickets > 0 ? `티켓 ${reward.tickets}장` : ''].filter(Boolean).join(' + ')
    if (claimed) return <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-400">받음 ✓</span>
    if (!progress.complete) return <span className="text-[11px] text-slate-500">완성 보상 {rewardText}</span>
    if (!known) return <span className="rounded-lg bg-amber-400/15 px-3 py-1.5 text-[11px] font-bold text-amber-200">운영자 동기화 대기</span>
    return (
      <button type="button" onClick={() => void claim(set)} disabled={busy === set.id} className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-black text-slate-950 disabled:opacity-50">
        보상 받기 · {rewardText}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">앨범</h3>
          <span className="text-[11px] text-slate-500">
            클럽 앨범 {completeCount}/{clubCount} 완성 · 카드를 갖고 있으면 자동 등록, 팔면 빠집니다
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          클럽의 현 시즌 카드를 11명 이상 모으면 클럽 앨범 완성, 리그의 모든 클럽을 완성하면 리그 앨범 완성. 월드·리미티드는 전부 모아야 합니다. 보상은 앨범마다 한 번, 선물함으로 옵니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {[...leagues, SPECIAL].map((name) => {
            const set = sets.find((s) => s.kind === 'league' && s.title === name)
            const done = set ? progressOf(set) : null
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setLeague(name)
                  setOpenId(null)
                }}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${league === name ? 'btn-primary' : 'btn-ghost'}`}
              >
                {name}
                {done && <span className="ml-1 tabular-nums opacity-70">{done.have}/{done.need}</span>}
              </button>
            )
          })}
        </div>
        {notice && <p className="mt-2 text-[11px] font-semibold text-amber-300">{notice}</p>}
      </section>

      {leagueSet && (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">리그 앨범</div>
            <div className="text-sm font-black text-slate-100">
              {leagueSet.title} <span className="text-slate-500">{progressOf(leagueSet).have}/{progressOf(leagueSet).need} 클럽 완성</span>
            </div>
          </div>
          <ClaimButton set={leagueSet} />
        </section>
      )}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((set) => {
          const progress = progressOf(set)
          const pct = progress.need > 0 ? Math.min(100, Math.round((progress.have / progress.need) * 100)) : 0
          return (
            <button
              key={set.id}
              type="button"
              onClick={() => setOpenId(openId === set.id ? null : set.id)}
              className={`rounded-2xl p-3 text-left transition ${openId === set.id ? 'bg-white/15 ring-1 ring-emerald-400/40' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-black text-slate-100">{set.title}</span>
                <span className={`shrink-0 text-[11px] font-bold tabular-nums ${progress.complete ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {progress.have}/{progress.need}
                  {claims.has(set.id) && ' ✓'}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[10px] text-slate-500">{set.kind === 'club' ? `카드 ${set.playerIds.length}장 · 보유 ${set.playerIds.filter((id) => owned.has(id)).length}` : set.subtitle}</div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                <div className={`h-1.5 rounded-full ${progress.complete ? 'bg-emerald-400' : 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
        {shown.length === 0 && <p className="text-xs text-slate-500">아직 이 묶음의 카드가 없습니다.</p>}
      </section>

      {open && (
        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-100">{open.title}</h4>
              <p className="text-[11px] text-slate-500">
                {open.subtitle} · {progressOf(open).have}/{progressOf(open).need}
                {open.kind === 'club' && ` · 11명이면 완성 (전체 ${open.playerIds.length}장)`}
              </p>
            </div>
            <ClaimButton set={open} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {open.playerIds
              .map((id) => getPlayer(id))
              .filter((player): player is NonNullable<typeof player> => Boolean(player))
              .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)) || b.ovr - a.ovr)
              .map((player) => (
                <PlayerCard key={player.id} player={player} size="sm" dimmed={!owned.has(player.id)} badge={owned.has(player.id) ? undefined : '미보유'} onClick={() => setDetail(player.id)} />
              ))}
          </div>
        </section>
      )}

      {detail && getPlayer(detail) && <PlayerArchiveModal player={getPlayer(detail)!} onClose={() => setDetail(null)} />}
    </div>
  )
}
