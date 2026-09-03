'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGame } from '../GameProvider'
import { getSupabase } from '../../lib/supabase'
import { standings, type StandingsMatch, type StandingsResult } from '../../lib/weeklyLeague/standings'

/**
 * The player's own window into the weekly tournament — until now the only
 * place any of this was visible was the operator console. "내 경기" answers
 * "what do I have coming up", "경기결과" answers "what happened to everyone
 * else in my group", and "순위" is the table itself. Individual scoring
 * records (득점왕 등) are left out on purpose: settlement right now is a
 * ratings-only formula with no per-player events, so there is nothing real
 * to show yet — see docs/WEEKLY_LIVE_MATCH_DESIGN.md.
 */

type SubTab = 'mine' | 'others' | 'standings'

interface MemberRow {
  slot: number
  kind: 'user' | 'ai'
  club_name: string
}

interface FixtureRow {
  id: number
  round: number | null
  home_slot: number
  away_slot: number
  scheduled_at_utc: string
  status: string
  score_home: number | null
  score_away: number | null
}

interface CupTieRow {
  competition_type: 'CUP_A' | 'CUP_B'
  stage: string
  home_slot: number
  away_slot: number
  aggregate_home_score: number | null
  aggregate_away_score: number | null
  winner_slot: number | null
}

interface Membership {
  groupId: number
  tier: number
  weekId: string
  slot: number
}

const STAGE_LABEL: Record<string, string> = { R16: '16강', QF: '8강', SF: '4강', FINAL: '결승' }

function fmtKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })
}

export default function WeeklyTab() {
  const { account } = useGame()
  const [sub, setSub] = useState<SubTab>('mine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [fixtures, setFixtures] = useState<FixtureRow[]>([])
  const [cupTies, setCupTies] = useState<CupTieRow[]>([])

  const userId = account.status === 'signedIn' ? account.user?.id : undefined

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const memberRes = await supabase
      .from('weekly_league_members')
      .select('group_id, slot, weekly_league_groups(tier, week_id)')
      .eq('user_id', userId)
      .eq('kind', 'user')
      .order('group_id', { ascending: false })
      .limit(1)

    if (memberRes.error) {
      setError(memberRes.error.message)
      setLoading(false)
      return
    }
    const row = (memberRes.data ?? [])[0] as
      | { group_id: number; slot: number; weekly_league_groups: { tier: number; week_id: string } | { tier: number; week_id: string }[] }
      | undefined
    if (!row) {
      setMembership(null)
      setLoading(false)
      return
    }
    const group = Array.isArray(row.weekly_league_groups) ? row.weekly_league_groups[0] : row.weekly_league_groups
    if (!group) {
      setMembership(null)
      setLoading(false)
      return
    }
    const nextMembership: Membership = {
      groupId: row.group_id,
      slot: row.slot,
      tier: group.tier,
      weekId: group.week_id,
    }
    setMembership(nextMembership)

    const [membersRes, fixturesRes, competitionsRes] = await Promise.all([
      supabase.from('weekly_league_members').select('slot, kind, club_name').eq('group_id', row.group_id),
      supabase
        .from('weekly_fixtures')
        .select('id, round, home_slot, away_slot, scheduled_at_utc, status, score_home, score_away')
        .eq('group_id', row.group_id)
        .order('scheduled_at_utc', { ascending: true }),
      supabase
        .from('weekly_competitions')
        .select('id, type')
        .eq('group_id', row.group_id)
        .in('type', ['CUP_A', 'CUP_B']),
    ])

    if (membersRes.error) setError(membersRes.error.message)
    else setMembers((membersRes.data ?? []) as MemberRow[])

    if (fixturesRes.error) setError(fixturesRes.error.message)
    else setFixtures((fixturesRes.data ?? []) as FixtureRow[])

    const competitions = (competitionsRes.data ?? []) as { id: number; type: 'CUP_A' | 'CUP_B' }[]
    if (competitions.length === 0) {
      setCupTies([])
    } else {
      const byId = new Map(competitions.map((c) => [c.id, c.type]))
      const tiesRes = await supabase
        .from('weekly_cup_ties')
        .select('competition_id, stage, home_slot, away_slot, aggregate_home_score, aggregate_away_score, winner_slot')
        .in('competition_id', competitions.map((c) => c.id))
      if (tiesRes.error) setError(tiesRes.error.message)
      else {
        setCupTies(
          (tiesRes.data ?? []).map((tie) => ({
            ...tie,
            competition_type: byId.get(tie.competition_id)!,
          })) as CupTieRow[],
        )
      }
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const clubName = (slot: number) => members.find((m) => m.slot === slot)?.club_name ?? `슬롯 ${slot}`
  const isUserClub = (slot: number) => members.find((m) => m.slot === slot)?.kind === 'user'

  const mine = membership
    ? fixtures.filter((f) => f.home_slot === membership.slot || f.away_slot === membership.slot)
    : []
  const myUpcoming = mine.filter((f) => f.status === 'pending')
  const myPlayed = [...mine.filter((f) => f.status === 'played')].reverse()

  const others = membership
    ? fixtures.filter((f) => f.home_slot !== membership.slot && f.away_slot !== membership.slot && f.status === 'played')
    : []
  const othersRecent = [...others].reverse().slice(0, 40)

  const table: StandingsResult[] = useMemo(() => {
    if (members.length !== 16) return []
    const clubIds = members.map((m) => String(m.slot))
    const matches: StandingsMatch[] = fixtures
      .filter((f) => f.status === 'played' && f.round !== null && f.score_home !== null && f.score_away !== null)
      .map((f) => ({
        home: String(f.home_slot),
        away: String(f.away_slot),
        homeGoals: f.score_home!,
        awayGoals: f.score_away!,
      }))
    return standings(clubIds, matches)
  }, [members, fixtures])

  if (!userId) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center">
        <p className="text-sm text-slate-500">로그인하면 주간리그 소식을 볼 수 있습니다.</p>
      </section>
    )
  }

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">불러오는 중...</p>
  }

  if (error) {
    return <p className="p-6 text-sm font-semibold text-rose-400">{error}</p>
  }

  if (!membership) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center">
        <h3 className="text-sm font-bold text-slate-200">아직 이번 주 리그에 배정되지 않았습니다</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          매주 정해진 시각에 자동으로 조가 만들어집니다. 잠시 뒤 다시 확인해 주세요.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
        <span className="text-xs font-bold text-slate-300">
          {membership.tier}등급 · {clubName(membership.slot)}
        </span>
        <div className="flex gap-1">
          {(
            [
              ['mine', '내 경기'],
              ['others', '경기결과'],
              ['standings', '순위'],
            ] as [SubTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                sub === key ? 'bg-emerald-400 text-slate-900' : 'bg-white/10 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sub === 'mine' && (
        <>
          <FixtureList
            title="다가오는 경기"
            fixtures={myUpcoming}
            mySlot={membership.slot}
            clubName={clubName}
            empty="예정된 경기가 없습니다."
          />
          <FixtureList
            title="지난 경기"
            fixtures={myPlayed}
            mySlot={membership.slot}
            clubName={clubName}
            empty="아직 치른 경기가 없습니다."
          />
        </>
      )}

      {sub === 'others' && (
        <FixtureList
          title="다른 경기 결과"
          fixtures={othersRecent}
          mySlot={null}
          clubName={clubName}
          empty="아직 정산된 다른 경기가 없습니다."
        />
      )}

      {sub === 'standings' && (
        <>
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">리그 순위</h3>
            {table.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">아직 정산된 리그 경기가 없습니다.</p>
            ) : (
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
                    {table.map((row) => (
                      <tr
                        key={row.club}
                        className={`border-t border-white/5 ${
                          Number(row.club) === membership.slot ? 'bg-emerald-400/10' : ''
                        }`}
                      >
                        <td className="py-1 pr-2 tabular-nums text-slate-500">{row.rank}</td>
                        <td className="py-1 pr-2 font-bold text-slate-100">
                          {clubName(Number(row.club))}
                          {isUserClub(Number(row.club)) && (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">컵 경기 결과</h3>
            {cupTies.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">이번 시즌은 컵 경기가 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {cupTies.map((tie, index) => (
                  <div
                    key={`${tie.competition_type}-${tie.stage}-${tie.home_slot}-${tie.away_slot}-${index}`}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]"
                  >
                    <span className="w-14 shrink-0 font-bold text-amber-300">
                      {tie.competition_type === 'CUP_A' ? 'Cup A' : 'Cup B'}
                    </span>
                    <span className="w-10 shrink-0 text-slate-500">{STAGE_LABEL[tie.stage] ?? tie.stage}</span>
                    <span className="flex-1 font-bold text-slate-100">
                      {clubName(tie.home_slot)} vs {clubName(tie.away_slot)}
                    </span>
                    {tie.aggregate_home_score !== null && tie.aggregate_away_score !== null ? (
                      <span className="font-black text-emerald-300">
                        {tie.aggregate_home_score} : {tie.aggregate_away_score}
                      </span>
                    ) : (
                      <span className="text-slate-500">진행 중</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선수 개인 순위</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              득점왕·도움왕·MVP는 아직 지원하지 않습니다. 지금은 경기가 카드 능력치 없이 순위만으로
              자동 정산돼서 개인 기록이 만들어지지 않습니다.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function FixtureList({
  title,
  fixtures,
  mySlot,
  clubName,
  empty,
}: {
  title: string
  fixtures: FixtureRow[]
  mySlot: number | null
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
          {fixtures.map((f) => {
            const isHome = f.home_slot === mySlot
            const isAway = f.away_slot === mySlot
            return (
              <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                <span className="w-32 shrink-0 text-slate-500">{fmtKst(f.scheduled_at_utc)}</span>
                <span className="flex-1 font-bold text-slate-100">
                  <span className={isHome ? 'text-emerald-300' : ''}>{clubName(f.home_slot)}</span>
                  {' vs '}
                  <span className={isAway ? 'text-emerald-300' : ''}>{clubName(f.away_slot)}</span>
                </span>
                {f.status === 'played' ? (
                  <span className="font-black text-emerald-300">
                    {f.score_home} : {f.score_away}
                  </span>
                ) : (
                  <span className="text-slate-500">대기</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
