import type { SupabaseClient } from '@supabase/supabase-js'
import { standings, type StandingsMatch } from './standings'

export type TierMovement = 'up' | 'down' | 'stay'

/** What last week did to the club — shown once when a new week has begun. */
export interface WeeklyRecap {
  /** The finished week. */
  weekId: string
  /** The finished week's group — its roll of honour lives in weekly_honours under this id. */
  groupId: number
  prevTier: number
  newTier: number
  /** Final rank in the finished week's group, 1..16. */
  rank: number
  points: number
  w: number
  d: number
  l: number
  movement: TierMovement
}

export function movementOf(prevTier: number, newTier: number): TierMovement {
  // Tier 0 is the top, so a smaller number is a step up.
  if (newTier < prevTier) return 'up'
  if (newTier > prevTier) return 'down'
  return 'stay'
}

interface MembershipRow {
  group_id: number
  slot: number
  weekly_league_groups: { tier: number; week_id: string } | { tier: number; week_id: string }[] | null
}

function groupOf(row: MembershipRow): { tier: number; week_id: string } | null {
  const group = Array.isArray(row.weekly_league_groups) ? row.weekly_league_groups[0] : row.weekly_league_groups
  return group ?? null
}

/**
 * Reads the previous week's membership and final table for this user. Null
 * when there is no finished earlier week (first week, or the same week is
 * still running). Ranking uses the same standings() as the table screen.
 */
export async function loadWeeklyRecap(
  supabase: SupabaseClient,
  userId: string,
  current: { groupId: number; weekId: string; tier: number },
): Promise<WeeklyRecap | null> {
  const memberships = await supabase
    .from('weekly_league_members')
    .select('group_id, slot, weekly_league_groups(tier, week_id)')
    .eq('user_id', userId)
    .eq('kind', 'user')
    .order('group_id', { ascending: false })
    .limit(2)
  if (memberships.error) return null
  const rows = (memberships.data ?? []) as MembershipRow[]
  const previous = rows.find((row) => row.group_id !== current.groupId)
  if (!previous) return null
  const prevGroup = groupOf(previous)
  if (!prevGroup || prevGroup.week_id === current.weekId) return null

  const [membersRes, fixturesRes] = await Promise.all([
    supabase.from('weekly_league_members').select('slot').eq('group_id', previous.group_id),
    supabase
      .from('weekly_fixtures')
      .select('home_slot, away_slot, score_home, score_away, status, round')
      .eq('group_id', previous.group_id),
  ])
  if (membersRes.error || fixturesRes.error) return null
  const clubIds = (membersRes.data ?? []).map((m) => String((m as { slot: number }).slot))
  if (clubIds.length !== 16) return null
  const matches: StandingsMatch[] = ((fixturesRes.data ?? []) as {
    home_slot: number
    away_slot: number
    score_home: number | null
    score_away: number | null
    status: string
    round: number | null
  }[])
    .filter((f) => f.status === 'played' && f.round !== null && f.score_home !== null && f.score_away !== null)
    .map((f) => ({ home: String(f.home_slot), away: String(f.away_slot), homeGoals: f.score_home!, awayGoals: f.score_away! }))
  const table = standings(clubIds, matches)
  const mine = table.find((row) => row.club === String(previous.slot))
  if (!mine) return null

  return {
    weekId: prevGroup.week_id,
    groupId: previous.group_id,
    prevTier: prevGroup.tier,
    newTier: current.tier,
    rank: mine.rank,
    points: mine.points,
    w: mine.w,
    d: mine.d,
    l: mine.l,
    movement: movementOf(prevGroup.tier, current.tier),
  }
}

const SEEN_KEY = 'cs.weeklyRecapSeen'

export function recapSeen(weekId: string): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === weekId
  } catch {
    return false
  }
}

export function markRecapSeen(weekId: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY, weekId)
  } catch {
    // ignore
  }
}
