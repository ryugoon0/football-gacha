'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../../lib/supabase'
import { TIER_COUNT } from '../../lib/weeklyLeague/config'

/**
 * 개막 배치 리그 경기 일정을 그대로 들여다보는 화면. 이 시스템은 지금
 * 카드·전술이 반영되는 라이브 경기 화면이 없다 — 정해진 시각에 서버가
 * 순위표 기준 확률(포아송)로 점수만 정산한다(weekly_fixtures.events는
 * settle_due_weekly_fixtures가 채우지 않는다). '경기' 탭의 실시간 틱·개입
 * 버튼 UI(matchEngine.ts)는 예전 디비전 리그 전용이고 이 대회에는 아직
 * 연결돼 있지 않다 — 그 사실을 화면에서 바로 확인하도록 만들었다.
 */

const WEEK_ID = 'placement-2026-09-04'

interface MemberRow {
  group_id: number
  slot: number
  kind: 'user' | 'ai'
  club_name: string
}

interface FixtureRow {
  id: number
  group_id: number
  round: number | null
  home_slot: number
  away_slot: number
  scheduled_at_utc: string
  status: string
  score_home: number | null
  score_away: number | null
  events: unknown
}

function fmtKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })
}

export default function WeeklyTestMatchTab() {
  const [tier, setTier] = useState(0)
  const [groupId, setGroupId] = useState<number | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [upcoming, setUpcoming] = useState<FixtureRow[]>([])
  const [played, setPlayed] = useState<FixtureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (selectedTier: number) => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const groupRes = await supabase
      .from('weekly_league_groups')
      .select('id')
      .eq('week_id', WEEK_ID)
      .eq('tier', selectedTier)
      .maybeSingle()

    if (groupRes.error) {
      setError(groupRes.error.message)
      setLoading(false)
      return
    }
    const group = groupRes.data as { id: number } | null
    setGroupId(group?.id ?? null)
    if (!group) {
      setMembers([])
      setUpcoming([])
      setPlayed([])
      setLoading(false)
      return
    }

    const nowIso = new Date().toISOString()
    const [membersRes, upcomingRes, playedRes] = await Promise.all([
      supabase
        .from('weekly_league_members')
        .select('group_id, slot, kind, club_name')
        .eq('group_id', group.id),
      supabase
        .from('weekly_fixtures')
        .select('id, group_id, round, home_slot, away_slot, scheduled_at_utc, status, score_home, score_away, events')
        .eq('group_id', group.id)
        .eq('status', 'pending')
        .gte('scheduled_at_utc', nowIso)
        .order('scheduled_at_utc', { ascending: true })
        .limit(30),
      supabase
        .from('weekly_fixtures')
        .select('id, group_id, round, home_slot, away_slot, scheduled_at_utc, status, score_home, score_away, events')
        .eq('group_id', group.id)
        .eq('status', 'played')
        .order('scheduled_at_utc', { ascending: false })
        .limit(30),
    ])

    if (membersRes.error) setError(membersRes.error.message)
    else setMembers((membersRes.data ?? []) as MemberRow[])

    if (upcomingRes.error) setError(upcomingRes.error.message)
    else setUpcoming((upcomingRes.data ?? []) as FixtureRow[])

    if (playedRes.error) setError(playedRes.error.message)
    else setPlayed((playedRes.data ?? []) as FixtureRow[])

    setLoading(false)
  }, [])

  useEffect(() => {
    void load(tier)
  }, [tier, load])

  const clubName = (slot: number) => {
    const member = members.find((m) => m.slot === slot)
    if (!member) return `슬롯 ${slot}`
    return member.kind === 'user' ? `${member.club_name} (실유저)` : member.club_name
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[12px] leading-relaxed text-amber-200">
        <p className="font-bold">지금은 이 대회에 라이브 경기 화면이 없습니다.</p>
        <p className="mt-1">
          예약된 시각이 되면 서버가 순위 기반 확률로 점수만 자동으로 정산합니다(카드·전술 반영 없음,
          이벤트 로그도 저장 안 됨). 사용자가 직접 경기를 시작하는 버튼도 없습니다 — 지금 화면은 그
          점을 그대로 보여주려고 일정과 결과만 표시합니다. 틱 단위로 흘러가는 경기 화면과 하프타임
          개입 버튼은 &apos;경기&apos; 탭(기존 디비전 리그)에만 있고, 이 대회에는 아직 연결돼 있지
          않습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">등급 선택</h3>
          <button
            onClick={() => void load(tier)}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300"
          >
            새로고침
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: TIER_COUNT }, (_, i) => i).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                tier === t ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-slate-300'
              }`}
            >
              {t}등급
            </button>
          ))}
        </div>

        {loading && <p className="mt-3 text-[11px] text-slate-500">불러오는 중...</p>}
        {error && <p className="mt-3 text-[11px] font-semibold text-rose-400">{error}</p>}
        {!loading && !error && groupId === null && (
          <p className="mt-3 text-[11px] text-slate-500">이 등급은 아직 그룹이 만들어지지 않았습니다.</p>
        )}
      </section>

      {groupId !== null && !loading && (
        <>
          <FixtureList
            title={`곧 시작 예정 (${upcoming.length}개)`}
            fixtures={upcoming}
            clubName={clubName}
            empty="예정된 경기가 없습니다."
          />
          <FixtureList
            title={`최근 완료 (${played.length}개)`}
            fixtures={played}
            clubName={clubName}
            empty="아직 정산된 경기가 없습니다."
          />
        </>
      )}
    </div>
  )
}

function FixtureList({
  title,
  fixtures,
  clubName,
  empty,
}: {
  title: string
  fixtures: FixtureRow[]
  clubName: (slot: number) => string
  empty: string
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h3>
      {fixtures.length === 0 ? (
        <p className="mt-2 text-[11px] text-slate-500">{empty}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {fixtures.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
              <span className="w-32 shrink-0 text-slate-500">{fmtKst(f.scheduled_at_utc)}</span>
              <span className="flex-1 font-bold text-slate-100">
                {clubName(f.home_slot)} vs {clubName(f.away_slot)}
              </span>
              {f.status === 'played' ? (
                <span className="font-black text-emerald-300">
                  {f.score_home} : {f.score_away}
                </span>
              ) : (
                <span className="text-slate-500">대기</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
