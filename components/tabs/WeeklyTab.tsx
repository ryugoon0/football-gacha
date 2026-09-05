'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGame } from '../GameProvider'
import ModeBadge from '../ModeBadge'
import WeeklyLiveMatch from '../WeeklyLiveMatch'
import ClubSheetModal from '../ClubSheetModal'
import { getSupabase } from '../../lib/supabase'
import { catchUpWeeklyGroup, claimWeeklyRewards, fetchUnclaimedWeeklyRewards, type WeeklyRewardRow } from '../../lib/weeklyLive'
import { setAssistantHints } from '../../lib/assistantHints'
import { loadWeeklyRecap, markRecapSeen, recapSeen, type WeeklyRecap } from '../../lib/weeklyLeague/recap'
import { isHotTime } from '../../lib/weeklyLeague/rewards'
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

type SubTab = 'mine' | 'others' | 'teamStandings' | 'playerStandings'

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
  mvp_slot?: number | null
  mvp_player_id?: string | null
  mvp_player_name?: string | null
  mvp_rating?: number | null
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

interface DisciplineRow {
  player_id: string
  player_name: string
  yellows: number
  ban_matches: number
}

interface ScorerRow {
  fixture_id: number
  slot: number
  player_id: string
  player_name: string
  goals: number
  assists: number
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
  const { account, grantGold, grantItems } = useGame()
  const [rewards, setRewards] = useState<WeeklyRewardRow[]>([])
  const [claiming, setClaiming] = useState(false)
  const [claimNotice, setClaimNotice] = useState<string | null>(null)
  const [sub, setSub] = useState<SubTab>('mine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [fixtures, setFixtures] = useState<FixtureRow[]>([])
  const [cupTies, setCupTies] = useState<CupTieRow[]>([])
  const [scorerRows, setScorerRows] = useState<ScorerRow[]>([])
  /** Last week's result, until the manager dismisses the banner. */
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  /** My club's bookings ledger this week: bans in force and yellows piling up. */
  const [discipline, setDiscipline] = useState<DisciplineRow[]>([])
  /** The fixture open in the live view (my own matches only). */
  const [openFixture, setOpenFixture] = useState<number | null>(null)
  /** A club tapped in the 순위표 — its lineup and tactics open in a modal. */
  const [sheetSlot, setSheetSlot] = useState<number | null>(null)

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

    // Settle anything in this group whose kick-off has passed before reading
    // the table, so a manager never sees a stale "pending" for a match the
    // server could already have judged (docs/WEEKLY_LIVE_MATCH_DESIGN.md).
    await catchUpWeeklyGroup(row.group_id)
    void fetchUnclaimedWeeklyRewards().then(setRewards)
    void loadWeeklyRecap(supabase, userId, nextMembership).then((result) => {
      const fresh = result && !recapSeen(result.weekId) ? result : null
      setRecap(fresh)
      setAssistantHints({ recap: fresh })
    })

    const [membersRes, fixturesRes, competitionsRes, scorersRes, disciplineRes] = await Promise.all([
      supabase.from('weekly_league_members').select('slot, kind, club_name').eq('group_id', row.group_id),
      supabase
        .from('weekly_fixtures')
        .select('id, round, home_slot, away_slot, scheduled_at_utc, status, score_home, score_away, mvp_slot, mvp_player_id, mvp_player_name, mvp_rating')
        .eq('group_id', row.group_id)
        .order('scheduled_at_utc', { ascending: true }),
      supabase
        .from('weekly_competitions')
        .select('id, type')
        .eq('group_id', row.group_id)
        .in('type', ['CUP_A', 'CUP_B']),
      supabase
        .from('weekly_goal_scorers')
        .select('fixture_id, slot, player_id, player_name, goals, assists')
        .eq('group_id', row.group_id),
      supabase
        .from('weekly_discipline')
        .select('player_id, player_name, yellows, ban_matches')
        .eq('group_id', row.group_id)
        .eq('slot', row.slot)
        .or('ban_matches.gt.0,yellows.gt.0'),
    ])

    if (!scorersRes.error) setScorerRows((scorersRes.data ?? []) as ScorerRow[])
    if (!disciplineRes.error) setDiscipline((disciplineRes.data ?? []) as DisciplineRow[])

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

  const unclaimedTotal = rewards.filter((row) => row.kind !== 'tactic_card').reduce((total, row) => total + row.amount, 0)
  const unclaimedCards = rewards.filter((row) => row.kind === 'tactic_card').reduce((total, row) => total + row.amount, 0)
  const claim = async () => {
    setClaiming(true)
    const result = await claimWeeklyRewards()
    setClaiming(false)
    if (!result.ok) {
      setClaimNotice('보상을 받지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    if (result.amount > 0) grantGold(result.amount)
    if (result.cards.length > 0) grantItems(result.cards.map((line) => ({ id: line.cardId, count: line.count })))
    // Server-granted gold goes to the cloud save at once (see GiftInbox).
    setTimeout(() => void account.saveNow(), 50)
    setRewards([])
    const parts = [
      result.amount > 0 ? `${result.amount.toLocaleString('ko-KR')}G` : '',
      ...result.cards.map((line) => `히든 카드 ${line.count}장`),
    ].filter(Boolean)
    setClaimNotice(parts.length ? `${parts.join(' · ')}를 받았습니다.` : '받을 보상이 없습니다.')
  }

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

  /** Goals and assists per (club, player) across the group's settled fixtures. */
  const playerTotals = useMemo(() => {
    const byKey = new Map<string, { slot: number; playerId: string; name: string; goals: number; assists: number; matches: number }>()
    for (const row of scorerRows) {
      const key = `${row.slot}:${row.player_id}`
      const entry = byKey.get(key) ?? { slot: row.slot, playerId: row.player_id, name: row.player_name, goals: 0, assists: 0, matches: 0 }
      entry.goals += row.goals
      entry.assists += row.assists ?? 0
      entry.matches += 1
      byKey.set(key, entry)
    }
    return [...byKey.values()]
  }, [scorerRows])
  const topScorers = useMemo(
    () =>
      [...playerTotals]
        .filter((row) => row.goals > 0)
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matches - b.matches || a.name.localeCompare(b.name, 'ko'))
        .slice(0, 15),
    [playerTotals],
  )
  /** MVP awards per (club, player) — from the settled fixtures' sheets. */
  const topMvps = useMemo(() => {
    const byKey = new Map<string, { slot: number; playerId: string; name: string; count: number; best: number }>()
    for (const f of fixtures) {
      if (f.status !== 'played' || !f.mvp_player_id || f.mvp_slot === null || f.mvp_slot === undefined) continue
      const key = `${f.mvp_slot}:${f.mvp_player_id}`
      const entry = byKey.get(key) ?? { slot: f.mvp_slot, playerId: f.mvp_player_id, name: f.mvp_player_name ?? '선수', count: 0, best: 0 }
      entry.count += 1
      entry.best = Math.max(entry.best, Number(f.mvp_rating ?? 0))
      byKey.set(key, entry)
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count || b.best - a.best || a.name.localeCompare(b.name, 'ko')).slice(0, 10)
  }, [fixtures])
  const topAssists = useMemo(
    () =>
      [...playerTotals]
        .filter((row) => row.assists > 0)
        .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.matches - b.matches || a.name.localeCompare(b.name, 'ko'))
        .slice(0, 10),
    [playerTotals],
  )

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
      <section className="panel p-6 text-center">
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
      <div className="space-y-4">
        <ModeBadge />
        <section className="panel p-6 text-center">
          <h3 className="text-sm font-bold text-slate-200">아직 이번 주 리그에 배정되지 않았습니다</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            매주 정해진 시각에 자동으로 조가 만들어집니다. 잠시 뒤 다시 확인해 주세요.
          </p>
        </section>
      </div>
    )
  }

  const dismissRecap = () => {
    if (recap) markRecapSeen(recap.weekId)
    setRecap(null)
    setAssistantHints({ recap: null })
  }

  return (
    <div className="space-y-4">
      <ModeBadge />
      {recap && (
        <section
          className={`rounded-2xl border p-4 ${
            recap.movement === 'up'
              ? 'border-emerald-400/40 bg-emerald-400/10'
              : recap.movement === 'down'
                ? 'border-rose-400/40 bg-rose-400/10'
                : 'border-white/10 bg-slate-900/60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">지난 주 결과</div>
              <div className="mt-1 text-base font-black text-white">
                {recap.movement === 'up' && `🎉 ${recap.newTier}등급 승격!`}
                {recap.movement === 'down' && `${recap.newTier}등급 강등`}
                {recap.movement === 'stay' && `${recap.newTier}등급 잔류`}
              </div>
              <div className="mt-1 text-xs text-slate-300">
                {recap.prevTier}등급 {recap.rank}위 · {recap.w}승 {recap.d}무 {recap.l}패 · 승점 {recap.points}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">순위 보상 히든 카드는 위 「보상 받기」에서 받습니다.</p>
            </div>
            <button
              type="button"
              onClick={dismissRecap}
              className="shrink-0 rounded-lg btn-ghost px-2.5 py-1.5 text-xs font-bold text-slate-200"
            >
              확인
            </button>
          </div>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 panel p-3">
        <span className="text-xs font-bold text-slate-300">
          {membership.tier}등급 · {clubName(membership.slot)}
        </span>
        <div className="flex gap-1">
          {(
            [
              ['mine', '내 경기'],
              ['others', '경기결과'],
              ['teamStandings', '팀 순위'],
              ['playerStandings', '선수 순위'],
            ] as [SubTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                sub === key ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* The open match (live or result) and the tapped club sit above whichever list opened them. */}
      {openFixture !== null && (
        <WeeklyLiveMatch
          fixtureId={openFixture}
          onClose={() => {
            setOpenFixture(null)
            void load()
          }}
          onPlayed={() => {
            // The match just settled: its gold is in weekly_rewards now,
            // so the claim banner should show it without a reload.
            void fetchUnclaimedWeeklyRewards().then(setRewards)
          }}
        />
      )}
      {sheetSlot !== null && (
        <ClubSheetModal
          groupId={membership.groupId}
          slot={sheetSlot}
          mine={sheetSlot === membership.slot}
          onClose={() => setSheetSlot(null)}
        />
      )}

      {sub === 'mine' && (
        <>
          {discipline.length > 0 && (
            <section className="panel p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">징계</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                {[...discipline]
                  .sort((a, b) => b.ban_matches - a.ban_matches || b.yellows - a.yellows)
                  .map((row) => (
                    <span
                      key={row.player_id}
                      className={`rounded-lg px-2 py-1 font-bold ${
                        row.ban_matches > 0 ? 'bg-red-700/30 text-red-200' : 'bg-yellow-400/15 text-yellow-200'
                      }`}
                    >
                      {row.ban_matches > 0 ? `🟥 ${row.player_name} 출전정지 ${row.ban_matches}경기` : `🟨 ${row.player_name} 경고 ${row.yellows}장`}
                    </span>
                  ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">경고 4장이면 1경기 정지. 출전정지 선수는 킥오프 때 자동으로 빠집니다.</p>
            </section>
          )}
          {(rewards.length > 0 || claimNotice) && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">경쟁 리그 보상</div>
                {rewards.length > 0 ? (
                  <div className="mt-1 text-sm text-slate-100">
                    받지 않은 보상 <b className="text-amber-200">{unclaimedTotal.toLocaleString('ko-KR')}G</b>
                    {unclaimedCards > 0 && <> · 히든 카드 <b className="text-fuchsia-200">{unclaimedCards}장</b></>} · {rewards.length}건
                    {rewards.some((row) => row.kind === 'hot_time') && (
                      <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-200">🔥 핫타임 포함</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-slate-300">{claimNotice}</div>
                )}
              </div>
              {rewards.length > 0 && (
                <button
                  onClick={() => void claim()}
                  disabled={claiming}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  보상 받기
                </button>
              )}
            </section>
          )}
          <FixtureList
            title="다가오는 경기"
            fixtures={myUpcoming}
            mySlot={membership.slot}
            clubName={clubName}
            empty="예정된 경기가 없습니다."
            onOpen={setOpenFixture}
            onClub={setSheetSlot}
          />
          <FixtureList
            title="지난 경기"
            fixtures={myPlayed}
            mySlot={membership.slot}
            clubName={clubName}
            empty="아직 치른 경기가 없습니다."
            onOpen={setOpenFixture}
            onClub={setSheetSlot}
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
          onOpen={setOpenFixture}
          onClub={setSheetSlot}
        />
      )}

      {sub === 'teamStandings' && (
        <>
          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">리그 순위</h3>
              <span className="text-[10px] text-slate-500">클럽을 누르면 라인업이 보입니다</span>
            </div>
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
                          <button
                            type="button"
                            onClick={() => setSheetSlot(Number(row.club))}
                            className="rounded px-1 py-0.5 text-left hover:bg-white/10 hover:text-white"
                            title="라인업·전술 보기"
                          >
                            {clubName(Number(row.club))}
                            {isUserClub(Number(row.club)) && (
                              <span className="ml-1 rounded bg-sky-400/20 px-1 text-[9px] font-bold text-sky-300">
                                실유저
                              </span>
                            )}
                          </button>
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

          <section className="panel p-4">
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
        </>
      )}

      {sub === 'playerStandings' && (
        <section className="panel p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">득점 순위</h3>
          {topScorers.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              아직 기록된 골이 없습니다. 실유저가 낀 경기가 실제 엔진으로 정산되면 득점자가 여기 쌓입니다.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[360px] text-[11px]">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">선수</th>
                    <th className="py-1 pr-2">클럽</th>
                    <th className="py-1 pr-1 text-right">경기</th>
                    <th className="py-1 pr-1 text-right">골</th>
                    <th className="py-1 pr-1 text-right">도움</th>
                    <th className="py-1 text-right">공격P</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers.map((row, index) => (
                    <tr
                      key={`${row.slot}-${row.playerId}`}
                      className={`border-t border-white/5 ${row.slot === membership.slot ? 'bg-emerald-400/10' : ''}`}
                    >
                      <td className="py-1 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                      <td className="py-1 pr-2 font-bold text-slate-100">{row.name}</td>
                      <td className="py-1 pr-2 text-slate-400">{clubName(row.slot)}</td>
                      <td className="py-1 pr-1 text-right tabular-nums text-slate-400">{row.matches}</td>
                      <td className="py-1 pr-1 text-right font-black tabular-nums text-emerald-300">{row.goals}</td>
                      <td className="py-1 pr-1 text-right tabular-nums text-sky-300">{row.assists}</td>
                      <td className="py-1 text-right font-bold tabular-nums text-slate-200">{row.goals + row.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {topAssists.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-400">도움 순위</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[300px] text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">선수</th>
                      <th className="py-1 pr-2">클럽</th>
                      <th className="py-1 pr-1 text-right">도움</th>
                      <th className="py-1 text-right">골</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAssists.map((row, index) => (
                      <tr
                        key={`${row.slot}-${row.playerId}`}
                        className={`border-t border-white/5 ${row.slot === membership.slot ? 'bg-emerald-400/10' : ''}`}
                      >
                        <td className="py-1 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                        <td className="py-1 pr-2 font-bold text-slate-100">{row.name}</td>
                        <td className="py-1 pr-2 text-slate-400">{clubName(row.slot)}</td>
                        <td className="py-1 pr-1 text-right font-black tabular-nums text-sky-300">{row.assists}</td>
                        <td className="py-1 text-right tabular-nums text-slate-400">{row.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {topMvps.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-400">MVP 순위</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[300px] text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">선수</th>
                      <th className="py-1 pr-2">클럽</th>
                      <th className="py-1 pr-1 text-right">MVP</th>
                      <th className="py-1 text-right">최고 평점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMvps.map((row, index) => (
                      <tr
                        key={`${row.slot}-${row.playerId}`}
                        className={`border-t border-white/5 ${row.slot === membership.slot ? 'bg-emerald-400/10' : ''}`}
                      >
                        <td className="py-1 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                        <td className="py-1 pr-2 font-bold text-slate-100">{row.name}</td>
                        <td className="py-1 pr-2 text-slate-400">{clubName(row.slot)}</td>
                        <td className="py-1 pr-1 text-right font-black tabular-nums text-amber-300">{row.count}</td>
                        <td className="py-1 text-right tabular-nums text-slate-400">{row.best.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="mt-2 text-[10px] text-slate-600">AI 대 AI 경기는 득점자·MVP 기록이 없어 집계에서 빠집니다.</p>
        </section>
      )}
    </div>
  )
}

const LIVE_WINDOW_MS = 15 * 60 * 1000
const PRE_WINDOW_MS = 10 * 60 * 1000

/** 'pre' from three minutes before kick-off, 'live' inside the 15-minute window after it. */
function liveStatusOf(f: FixtureRow, now: number): 'upcoming' | 'pre' | 'live' | 'ended' {
  if (f.status === 'played') return 'ended'
  const kickoff = Date.parse(f.scheduled_at_utc)
  if (now < kickoff - PRE_WINDOW_MS) return 'upcoming'
  if (now < kickoff) return 'pre'
  if (now < kickoff + LIVE_WINDOW_MS) return 'live'
  return 'ended'
}

function FixtureList({
  title,
  fixtures,
  mySlot,
  clubName,
  empty,
  onOpen,
  onClub,
}: {
  title: string
  fixtures: FixtureRow[]
  mySlot: number | null
  clubName: (slot: number) => string
  empty: string
  /** When given, each row can be opened in the live / result view. */
  onOpen?: (fixtureId: number) => void
  /** When given, a club name opens that club's lineup. */
  onClub?: (slot: number) => void
}) {
  const club = (slot: number, mine: boolean) =>
    onClub ? (
      <button
        type="button"
        onClick={() => onClub(slot)}
        title="라인업 보기"
        className={`rounded px-1 py-0.5 hover:bg-white/10 hover:text-white ${mine ? 'text-emerald-300' : ''}`}
      >
        {clubName(slot)}
      </button>
    ) : (
      <span className={mine ? 'text-emerald-300' : ''}>{clubName(slot)}</span>
    )
  const now = Date.now()
  return (
    <section className="panel p-4">
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
                {isHotTime(Date.parse(f.scheduled_at_utc)) && (
                  <span
                    title="핫타임 — 이 경기에 지시를 하나라도 내리면 보너스 골드"
                    className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-200"
                  >
                    🔥 핫타임
                  </span>
                )}
                <span className="flex-1 font-bold text-slate-100">
                  {club(f.home_slot, isHome)}
                  {' vs '}
                  {club(f.away_slot, isAway)}
                </span>
                {f.status === 'played' ? (
                  <span className="flex items-center gap-2">
                    <span className="font-black text-emerald-300">
                      {f.score_home} : {f.score_away}
                    </span>
                    {f.mvp_player_name && (
                      <span
                        title={`MVP · ${clubName(f.mvp_slot ?? -1)}`}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          f.mvp_slot === mySlot ? 'bg-amber-400/20 text-amber-200' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        ★ {f.mvp_player_name} {Number(f.mvp_rating).toFixed(1)}
                      </span>
                    )}
                  </span>
                ) : liveStatusOf(f, now) === 'live' ? (
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-300">LIVE</span>
                ) : liveStatusOf(f, now) === 'pre' ? (
                  <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">입장 가능</span>
                ) : liveStatusOf(f, now) === 'ended' ? (
                  <span className="text-slate-500">정산 중</span>
                ) : (
                  <span className="text-slate-500">대기</span>
                )}
                {onOpen && (
                  <button
                    onClick={() => onOpen(f.id)}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                      liveStatusOf(f, now) === 'live' || liveStatusOf(f, now) === 'pre'
                        ? 'btn-primary'
                        : 'btn-ghost'
                    }`}
                  >
                    {f.status === 'played'
                      ? '결과'
                      : liveStatusOf(f, now) === 'live'
                        ? '라이브 보기'
                        : liveStatusOf(f, now) === 'pre'
                          ? '입장'
                          : '보기'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
