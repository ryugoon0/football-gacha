'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { aiClubsForDivision, isAiClubId } from '../lib/aiClub'
import { BOTTOM_DIVISION, TOP_DIVISION, divisionLabel } from '../lib/league'
import { getSupabase } from '../lib/supabase'
import type { PublicClubRow } from '../lib/publicClub'

const PAGE_SIZE = 12

const DIVISIONS = Array.from(
  { length: BOTTOM_DIVISION - TOP_DIVISION + 1 },
  (_, index) => TOP_DIVISION + index,
)

/**
 * There is no server-scheduled league yet (see ROADMAP.md) — a season's
 * opponents are generated, not other accounts. "Same league" today can only
 * mean the same division tier, so that is what this filters on: anyone else
 * who opted a squad in at that tier, not this account's actual fixtures.
 *
 * Picking a division also mixes in that tier's AI clubs (lib/aiClub.ts) —
 * the same ones the game itself fields as opponents — so the board reads
 * like a real ~20-team league instead of however many people opted in.
 */
export default function PublicClubDirectory({
  compact = false,
  division = null,
}: {
  compact?: boolean
  /** Preselect a division (e.g. the visitor's own), still changeable. */
  division?: number | null
}) {
  const [clubs, setClubs] = useState<PublicClubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<number | 'all'>(division ?? 'all')

  useEffect(() => {
    if (division !== null) setSelectedDivision(division)
  }, [division])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    let request = supabase
      .from('public_club_squads')
      .select('user_id, club_name, division, rating, formation, lineup, is_public, updated_at')
      .eq('is_public', true)
    if (selectedDivision !== 'all') request = request.eq('division', selectedDivision)
    void request
      .order('rating', { ascending: false })
      .limit(compact ? 4 : PAGE_SIZE)
      .then(({ data }) => {
        setClubs((data ?? []) as PublicClubRow[])
        setLoading(false)
      })
  }, [compact, selectedDivision])

  const withAiClubs = useMemo(() => {
    if (selectedDivision === 'all') return clubs
    const ai = aiClubsForDivision(selectedDivision)
    return [...clubs, ...ai].sort((a, b) => b.rating - a.rating)
  }, [clubs, selectedDivision])

  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ko-KR')
    const base = term
      ? withAiClubs.filter((club) => club.club_name.toLocaleLowerCase('ko-KR').includes(term))
      : withAiClubs
    return compact ? base.slice(0, 4) : base
  }, [withAiClubs, query, compact])

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-0 flex-1 sm:max-w-md">
            <span className="sr-only">클럽명 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="클럽명으로 찾기"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            />
          </label>
          <label className="shrink-0">
            <span className="sr-only">리그(디비전) 선택</span>
            <select
              value={selectedDivision}
              onChange={(event) =>
                setSelectedDivision(event.target.value === 'all' ? 'all' : Number(event.target.value))
              }
              className="h-[42px] rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-400"
            >
              <option value="all">모든 리그</option>
              {DIVISIONS.map((item) => (
                <option key={item} value={item}>
                  {divisionLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-sm text-slate-500">공개 클럽을 불러오는 중...</p>
      ) : withAiClubs.length === 0 ? (
        <div className="border-y border-white/10 py-8 text-sm text-slate-400">
          아직 공개된 스쿼드가 없습니다. 감독실의 내 계정에서 스쿼드를 공개하면 여기에 표시됩니다.
        </div>
      ) : (
      <>
      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {shown.map((club) => (
          <Link
            key={club.user_id}
            href={`/clubs/${club.user_id}`}
            className="group border border-white/10 bg-slate-900/70 p-4 transition hover:border-emerald-400/60 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-base font-black text-white group-hover:text-emerald-300">
                    {club.club_name}
                  </span>
                  {isAiClubId(club.user_id) && (
                    <span
                      title="실제 유저가 아니라 게임이 만든 상대 클럽입니다"
                      className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400"
                    >
                      AI
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {club.division}부 리그 · {club.formation}
                </div>
              </div>
              <span className="shrink-0 text-right text-xl font-black text-emerald-300">{club.rating}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-500">
              <span>공개 선수 {Array.isArray(club.lineup) ? club.lineup.length : 0}명</span>
              {!isAiClubId(club.user_id) && (
                <span>{new Date(club.updated_at).toLocaleDateString('ko-KR')}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {!compact && shown.length === 0 && <p className="py-8 text-sm text-slate-500">찾는 클럽이 없습니다.</p>}
      </>
      )}
    </div>
  )
}
