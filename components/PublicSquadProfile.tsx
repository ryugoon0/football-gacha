'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getPlayer } from '../lib/players'
import { isPublicSquadMember, type PublicClubRow, type PublicSquadMember } from '../lib/publicClub'
import { getSupabase } from '../lib/supabase'
import PlayerCard from './PlayerCard'

export default function PublicSquadProfile({ clubId }: { clubId: string }) {
  const [club, setClub] = useState<PublicClubRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    void supabase
      .from('public_club_squads')
      .select('user_id, club_name, division, rating, formation, lineup, is_public, updated_at')
      .eq('user_id', clubId)
      .eq('is_public', true)
      .maybeSingle()
      .then(({ data }) => {
        setClub(data ? (data as PublicClubRow) : null)
        setLoading(false)
      })
  }, [clubId])

  const lineup = useMemo(() => {
    const source = Array.isArray(club?.lineup) ? club.lineup : []
    return source.filter(isPublicSquadMember).flatMap((member) => {
      const player = getPlayer(member.playerId)
      return player ? [{ member, player }] : []
    })
  }, [club?.lineup])

  if (loading) return <p className="py-24 text-center text-sm text-slate-500">스쿼드를 불러오는 중...</p>
  if (!club) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-xl font-black text-white">공개되지 않았거나 존재하지 않는 스쿼드입니다</h1>
        <Link href="/clubs" className="mt-4 inline-block text-sm font-bold text-emerald-300 hover:text-emerald-200">
          스카우트로 돌아가기
        </Link>
      </div>
    )
  }

  const starters = lineup.filter(({ member }) => member.role === 'starter')
  const bench = lineup.filter(({ member }) => member.role === 'bench')

  return (
    <div className="space-y-8">
      <section className="border-b border-white/10 pb-6">
        <Link href="/clubs" className="text-xs font-bold text-slate-500 hover:text-emerald-300">스카우트</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">공개 스쿼드</p>
            <h1 className="mt-1 text-3xl font-black text-white">{club.club_name}</h1>
            <p className="mt-2 text-sm text-slate-400">{club.division}부 리그 · {club.formation} · 마지막 공개 {new Date(club.updated_at).toLocaleDateString('ko-KR')}</p>
          </div>
          <div className="border-l border-emerald-400 pl-4 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">TEAM RATING</div>
            <div className="text-4xl font-black text-emerald-300">{club.rating}</div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">선발 명단</h2>
          <span className="text-xs text-slate-500">공개 동의한 정보만 표시됩니다</span>
        </div>
        {starters.length ? (
          <div className="pitch mt-4 grid grid-cols-3 gap-3 border border-emerald-100/15 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {starters.map(({ member, player }) => (
              <div key={`${member.role}-${member.slot}-${member.playerId}`} className="flex justify-center">
                <PlayerCard player={player} level={member.level} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 py-8 text-sm text-slate-500">선발 명단이 아직 공개되지 않았습니다.</p>
        )}
      </section>

      {bench.length > 0 && (
        <section>
          <h2 className="text-lg font-black text-white">벤치</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {bench.map(({ member, player }) => (
              <PlayerCard key={`${member.role}-${member.slot}-${member.playerId}`} player={player} level={member.level} size="sm" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
