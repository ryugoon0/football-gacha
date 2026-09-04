'use client'

import { useCallback, useEffect, useState } from 'react'
import { TIER_COUNT, TRANSITION_SCHEDULE } from '../../lib/weeklyLeague/config'
import { getSupabase } from '../../lib/supabase'

/**
 * 딱 하나만 본다 — 내일(개막 배치 리그) 시작 준비가 됐는지. 여러 패널을
 * 오갈 필요 없이 이 화면 하나로 등급별 그룹·인원·경기·크론 상태를 한눈에
 * 확인한다.
 */

const WEEK_ID = 'placement-2026-09-04'

interface TierStatus {
  tier: number
  groupId: number | null
  realUsers: number
  aiClubs: number
  fixtures: number
  pending: number
  played: number
}

interface CronJob {
  jobname: string
  active: boolean
  recentRuns: { status: string; startTime: string }[]
}

const CRON_LABEL: Record<string, string> = {
  'auto-bootstrap-placement': '배치 리그 자동 생성',
  'settle-weekly-fixtures': '경기 자동 정산',
  'auto-bootstrap-regular-season': '정식 시즌 자동 생성',
}

function fmtKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' })
}

export default function LaunchReadinessTab() {
  const [tiers, setTiers] = useState<TierStatus[] | null>(null)
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [groupsRes, cronRes] = await Promise.all([
      supabase.from('weekly_league_groups').select('id, tier').eq('week_id', WEEK_ID).order('tier'),
      supabase.rpc('admin_weekly_cron_status'),
    ])

    if (cronRes.error) setError(cronRes.error.message)
    else {
      const body = cronRes.data as { ok?: boolean; jobs?: CronJob[] }
      if (body?.ok) setJobs(body.jobs ?? [])
    }

    if (groupsRes.error) {
      setError(groupsRes.error.message)
      setLoading(false)
      return
    }
    const groups = (groupsRes.data ?? []) as { id: number; tier: number }[]

    const results: TierStatus[] = []
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const group = groups.find((g) => g.tier === tier)
      if (!group) {
        results.push({ tier, groupId: null, realUsers: 0, aiClubs: 0, fixtures: 0, pending: 0, played: 0 })
        continue
      }
      const [membersRes, fixturesRes] = await Promise.all([
        supabase.from('weekly_league_members').select('kind').eq('group_id', group.id),
        supabase.from('weekly_fixtures').select('status').eq('group_id', group.id),
      ])
      const members = (membersRes.data ?? []) as { kind: string }[]
      const fixtures = (fixturesRes.data ?? []) as { status: string }[]
      results.push({
        tier,
        groupId: group.id,
        realUsers: members.filter((m) => m.kind === 'user').length,
        aiClubs: members.filter((m) => m.kind === 'ai').length,
        fixtures: fixtures.length,
        pending: fixtures.filter((f) => f.status === 'pending').length,
        played: fixtures.filter((f) => f.status === 'played').length,
      })
    }
    setTiers(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [load])

  const firstMatchMs = new Date(TRANSITION_SCHEDULE.firstMatchAt).getTime()
  const msLeft = firstMatchMs - now
  const started = msLeft <= 0
  const hoursLeft = Math.floor(Math.abs(msLeft) / 3_600_000)
  const minutesLeft = Math.floor((Math.abs(msLeft) % 3_600_000) / 60_000)

  const allReady = tiers?.every((t) => t.groupId !== null && t.realUsers + t.aiClubs === 16 && t.fixtures === 360)
  const cronReady = jobs.length > 0 && jobs.every((j) => j.active)

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            개막 배치 리그 준비 상태
          </h3>
          <button
            onClick={() => void load()}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300"
          >
            새로고침
          </button>
        </div>

        <p className="mt-2 text-2xl font-black text-white">
          {started ? '경기 진행 중' : `${hoursLeft}시간 ${minutesLeft}분 후 시작`}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          첫 경기 {fmtKst(TRANSITION_SCHEDULE.firstMatchAt)}
        </p>

        {loading && <p className="mt-3 text-[11px] text-slate-500">확인하는 중...</p>}
        {error && <p className="mt-3 text-[11px] font-semibold text-rose-400">{error}</p>}

        {!loading && tiers && (
          <>
            <div
              className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${
                allReady && cronReady
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-amber-400/15 text-amber-300'
              }`}
            >
              {allReady && cronReady ? '모든 준비 완료' : '아직 확인이 필요합니다'}
            </div>

            <div className="mt-3 space-y-1.5">
              {tiers.map((t) => {
                const ready = t.groupId !== null && t.realUsers + t.aiClubs === 16 && t.fixtures === 360
                return (
                  <div key={t.tier} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                    <span className={`shrink-0 text-sm ${ready ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ready ? '✓' : '✕'}
                    </span>
                    <span className="w-14 shrink-0 font-bold text-slate-100">{t.tier}등급</span>
                    {t.groupId === null ? (
                      <span className="text-slate-500">그룹이 아직 안 만들어졌습니다.</span>
                    ) : (
                      <span className="text-slate-400">
                        실유저 {t.realUsers}명 · AI {t.aiClubs}팀 · 경기 {t.fixtures}개(대기 {t.pending} ·
                        완료 {t.played})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">자동 실행 크론</h3>
        <div className="mt-2 space-y-1.5">
          {jobs.map((job) => (
            <div key={job.jobname} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
              <span className={`shrink-0 text-sm ${job.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                {job.active ? '✓' : '✕'}
              </span>
              <span className="flex-1 font-bold text-slate-100">{CRON_LABEL[job.jobname] ?? job.jobname}</span>
              {job.recentRuns[0] && (
                <span className="text-slate-500">최근 실행 {fmtKst(job.recentRuns[0].startTime)}</span>
              )}
            </div>
          ))}
          {jobs.length === 0 && !loading && (
            <p className="text-[11px] text-slate-500">크론 상태를 볼 수 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  )
}
