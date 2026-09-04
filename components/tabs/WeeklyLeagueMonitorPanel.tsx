'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../../lib/supabase'
import { standings, type StandingsMatch, type StandingsResult } from '../../lib/weeklyLeague/standings'

/**
 * 주간 대회 운영 현황 — 크론이 실제로 도는지, 등급별 리그가 몇 명으로
 * 만들어졌는지, 경기가 얼마나 진행됐는지를 한눈에 본다. 지금까지는 이
 * 정보를 볼 방법이 전혀 없어서(SQL을 직접 조회해야 함) 추가한다.
 */

interface CronRun {
  status: string
  startTime: string
  endTime: string | null
  returnMessage: string | null
}

interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  recentRuns: CronRun[]
}

interface GroupRow {
  id: number
  tier: number
  status: string
}

interface MemberRow {
  group_id: number
  slot: number
  kind: 'user' | 'ai'
  club_name: string
  rating: number
}

interface FixtureCountRow {
  group_id: number
  count: number
}

interface UpcomingFixture {
  group_id: number
  round: number | null
  home_slot: number
  away_slot: number
  scheduled_at_utc: string
  status: string
  score_home: number | null
  score_away: number | null
}

const JOB_LABEL: Record<string, string> = {
  'settle-weekly-fixtures': '경기 자동 정산 (5분마다)',
  'auto-bootstrap-placement': '개막 배치 리그 자동 생성 (10분마다)',
}

function fmtKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })
}

export default function WeeklyLeagueMonitorPanel() {
  const [weekId, setWeekId] = useState('placement-2026-09-04')
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [fixtureCounts, setFixtureCounts] = useState<FixtureCountRow[]>([])
  const [playedMatches, setPlayedMatches] = useState<Record<number, StandingsMatch[]>>({})
  const [upcoming, setUpcoming] = useState<UpcomingFixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (week: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [cronRes, groupsRes] = await Promise.all([
      supabase.rpc('admin_weekly_cron_status'),
      supabase.from('weekly_league_groups').select('id, tier, status').eq('week_id', week).order('tier'),
    ])

    if (cronRes.error) setError(cronRes.error.message)
    else {
      const body = cronRes.data as { ok?: boolean; jobs?: CronJob[]; reason?: string }
      if (body?.ok) setJobs(body.jobs ?? [])
      else if (body?.reason === 'not admin') setError('운영자 계정이 아니라 크론 상태를 볼 수 없습니다.')
    }

    if (groupsRes.error) {
      setError(groupsRes.error.message)
      setLoading(false)
      return
    }
    const groupRows = (groupsRes.data ?? []) as GroupRow[]
    setGroups(groupRows)

    const groupIds = groupRows.map((g) => g.id)
    if (groupIds.length === 0) {
      setMembers([])
      setFixtureCounts([])
      setPlayedMatches({})
      setUpcoming([])
      setLoading(false)
      return
    }

    const [membersRes, playedRes, upcomingRes] = await Promise.all([
      supabase
        .from('weekly_league_members')
        .select('group_id, slot, kind, club_name, rating')
        .in('group_id', groupIds),
      supabase
        .from('weekly_fixtures')
        .select('group_id, status, home_slot, away_slot, score_home, score_away')
        .in('group_id', groupIds)
        .eq('status', 'played'),
      supabase
        .from('weekly_fixtures')
        .select('group_id, round, home_slot, away_slot, scheduled_at_utc, status, score_home, score_away')
        .in('group_id', groupIds)
        .order('scheduled_at_utc', { ascending: true })
        .limit(20),
    ])

    if (membersRes.error) setError(membersRes.error.message)
    else setMembers((membersRes.data ?? []) as MemberRow[])

    if (playedRes.error) {
      setError(playedRes.error.message)
    } else {
      const byGroup: Record<number, StandingsMatch[]> = {}
      const counts: Record<number, number> = {}
      for (const row of (playedRes.data ?? []) as {
        group_id: number
        home_slot: number
        away_slot: number
        score_home: number | null
        score_away: number | null
      }[]) {
        counts[row.group_id] = (counts[row.group_id] ?? 0) + 1
        if (row.score_home === null || row.score_away === null) continue
        const list = byGroup[row.group_id] ?? []
        list.push({
          home: String(row.home_slot),
          away: String(row.away_slot),
          homeGoals: row.score_home,
          awayGoals: row.score_away,
        })
        byGroup[row.group_id] = list
      }
      setPlayedMatches(byGroup)
      setFixtureCounts(
        Object.entries(counts).map(([groupId, count]) => ({ group_id: Number(groupId), count })),
      )
    }

    if (upcomingRes.error) setError(upcomingRes.error.message)
    else setUpcoming((upcomingRes.data ?? []) as UpcomingFixture[])

    setLoading(false)
  }, [])

  useEffect(() => {
    void load(weekId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clubName = (groupId: number, slot: number) =>
    members.find((m) => m.group_id === groupId && m.slot === slot)?.club_name ?? `슬롯 ${slot}`

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">주간 대회 운영 현황</h3>
        <div className="flex items-center gap-1.5">
          <input
            value={weekId}
            onChange={(event) => setWeekId(event.target.value)}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white outline-none"
          />
          <button
            onClick={() => void load(weekId)}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && <p className="mt-2 text-[11px] text-slate-500">불러오는 중...</p>}
      {error && <p className="mt-2 text-[11px] font-semibold text-rose-400">{error}</p>}

      {!loading && (
        <>
          <div className="mt-3 space-y-1.5">
            {jobs.map((job) => {
              const last = job.recentRuns[0]
              return (
                <div key={job.jobname} className="rounded-xl bg-white/5 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-100">
                      {JOB_LABEL[job.jobname] ?? job.jobname}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        job.active ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
                      }`}
                    >
                      {job.active ? '활성' : '꺼짐'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {last
                      ? `최근 실행: ${fmtKst(last.startTime)} · ${last.status}${
                          last.status !== 'succeeded' && last.returnMessage ? ` — ${last.returnMessage}` : ''
                        }`
                      : '아직 실행 기록이 없습니다.'}
                  </p>
                </div>
              )
            })}
            {jobs.length === 0 && (
              <p className="text-[11px] text-slate-500">크론 상태를 볼 수 없습니다(운영자 계정으로 로그인했는지 확인).</p>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500">이 week_id로 만들어진 리그가 아직 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {groups.map((group) => {
                const groupMembers = members
                  .filter((m) => m.group_id === group.id)
                  .sort((a, b) => a.slot - b.slot)
                const realCount = groupMembers.filter((m) => m.kind === 'user').length
                const clubIds = groupMembers.map((m) => String(m.slot))
                const table: StandingsResult[] =
                  clubIds.length === 16 ? standings(clubIds, playedMatches[group.id] ?? []) : []
                const played = fixtureCounts.find((f) => f.group_id === group.id)
                const groupUpcoming = upcoming
                  .filter((f) => f.group_id === group.id && f.status === 'pending')
                  .slice(0, 3)

                return (
                  <div key={group.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-xs font-black text-slate-100">
                        {group.tier}등급 · 그룹 #{group.id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        실유저 {realCount}명 · AI {groupMembers.length - realCount}팀 · 경기{' '}
                        {played?.count ?? 0}/360 완료 {/* 360 = 개막 배치 리그 전용(16구단×45경기÷2) */}
                      </span>
                    </div>

                    {table.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[420px] text-[11px]">
                          <thead>
                            <tr className="text-left text-slate-500">
                              <th className="py-1 pr-2">#</th>
                              <th className="py-1 pr-2">클럽</th>
                              <th className="py-1 pr-1 text-right">경기</th>
                              <th className="py-1 pr-1 text-right">승</th>
                              <th className="py-1 pr-1 text-right">무</th>
                              <th className="py-1 pr-1 text-right">패</th>
                              <th className="py-1 pr-1 text-right">득실</th>
                              <th className="py-1 text-right">승점</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.map((row) => {
                              const member = groupMembers.find((m) => String(m.slot) === row.club)
                              return (
                                <tr key={row.club} className="border-t border-white/5">
                                  <td className="py-1 pr-2 tabular-nums text-slate-500">{row.rank}</td>
                                  <td className="py-1 pr-2 font-bold text-slate-100">
                                    {member?.club_name ?? row.club}
                                    {member?.kind === 'user' && (
                                      <span className="ml-1 rounded bg-sky-400/20 px-1 text-[9px] font-bold text-sky-300">
                                        실유저
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1 pr-1 text-right tabular-nums">{row.played}</td>
                                  <td className="py-1 pr-1 text-right tabular-nums">{row.w}</td>
                                  <td className="py-1 pr-1 text-right tabular-nums">{row.d}</td>
                                  <td className="py-1 pr-1 text-right tabular-nums">{row.l}</td>
                                  <td className="py-1 pr-1 text-right tabular-nums">{row.gd}</td>
                                  <td className="py-1 text-right font-black tabular-nums text-emerald-300">
                                    {row.points}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {groupUpcoming.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">다음 경기</p>
                        {groupUpcoming.map((f) => (
                          <p key={`${f.group_id}-${f.round}-${f.home_slot}-${f.away_slot}`} className="text-[11px] text-slate-400">
                            {fmtKst(f.scheduled_at_utc)} · {clubName(group.id, f.home_slot)} vs {clubName(group.id, f.away_slot)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
