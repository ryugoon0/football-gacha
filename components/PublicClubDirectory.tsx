'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import type { PublicClubRow } from '../lib/publicClub'

const PAGE_SIZE = 12

export default function PublicClubDirectory({ compact = false }: { compact?: boolean }) {
  const [clubs, setClubs] = useState<PublicClubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    void supabase
      .from('public_club_squads')
      .select('user_id, club_name, division, rating, formation, lineup, is_public, updated_at')
      .eq('is_public', true)
      .order('rating', { ascending: false })
      .limit(compact ? 4 : PAGE_SIZE)
      .then(({ data }) => {
        setClubs((data ?? []) as PublicClubRow[])
        setLoading(false)
      })
  }, [compact])

  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ko-KR')
    return term ? clubs.filter((club) => club.club_name.toLocaleLowerCase('ko-KR').includes(term)) : clubs
  }, [clubs, query])

  if (loading) return <p className="py-8 text-sm text-slate-500">공개 클럽을 불러오는 중...</p>

  if (clubs.length === 0) {
    return (
      <div className="border-y border-white/10 py-8 text-sm text-slate-400">
        아직 공개된 스쿼드가 없습니다. 감독실의 내 계정에서 스쿼드를 공개하면 여기에 표시됩니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <label className="block max-w-md">
          <span className="sr-only">클럽명 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="클럽명으로 찾기"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
          />
        </label>
      )}
      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {shown.map((club) => (
          <Link
            key={club.user_id}
            href={`/clubs/${club.user_id}`}
            className="group border border-white/10 bg-slate-900/70 p-4 transition hover:border-emerald-400/60 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-black text-white group-hover:text-emerald-300">
                  {club.club_name}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {club.division}부 리그 · {club.formation}
                </div>
              </div>
              <span className="shrink-0 text-right text-xl font-black text-emerald-300">{club.rating}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-500">
              <span>공개 선수 {Array.isArray(club.lineup) ? club.lineup.length : 0}명</span>
              <span>{new Date(club.updated_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </Link>
        ))}
      </div>
      {!compact && shown.length === 0 && <p className="py-8 text-sm text-slate-500">찾는 클럽이 없습니다.</p>}
    </div>
  )
}
