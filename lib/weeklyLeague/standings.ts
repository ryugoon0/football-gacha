/**
 * 리그 순위표와 동률 처리.
 *
 * 동률 기준 순서(스펙 3절): 상대 전적 승점 → 상대 전적 골득실 → 전체
 * 골득실 → 전체 득점 → 승리 수 → 페어플레이 점수 → 고정 시드.
 *
 * 상대 전적(1·2번)은 동점자 그룹 안에서만 계산되는 미니 리그다. 세 팀
 *이상이 얽혀 상대 전적까지 계산한 뒤에도 그 중 일부가 다시 동률이면,
 * 이 구현은 그 하위 동률을 상대 전적으로 다시 좁히지 않고 바로 3번(전체
 * 골득실)으로 넘어간다 — 완전한 재귀적 재계산은 하지 않는다는 뜻. 실제
 * 경기에서 3팀 이상이 상대 전적까지 완전히 같을 확률은 낮지만, 필요해지면
 * 여기를 재귀로 바꾸면 된다.
 */
import { POINTS } from './config'

export interface StandingsMatch {
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

export interface StandingsRow {
  club: string
  played: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  points: number
  fairPlay: number
}

function emptyRow(club: string): StandingsRow {
  return { club, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0, fairPlay: 0 }
}

function applyMatch(table: Record<string, StandingsRow>, match: StandingsMatch): void {
  const home = table[match.home]
  const away = table[match.away]
  if (!home || !away) return

  home.played++
  away.played++
  home.gf += match.homeGoals
  home.ga += match.awayGoals
  away.gf += match.awayGoals
  away.ga += match.homeGoals

  if (match.homeGoals > match.awayGoals) {
    home.w++
    away.l++
    home.points += POINTS.win
  } else if (match.homeGoals < match.awayGoals) {
    away.w++
    home.l++
    away.points += POINTS.win
  } else {
    home.d++
    away.d++
    home.points += POINTS.draw
    away.points += POINTS.draw
  }
}

export function buildTable(clubIds: string[], matches: StandingsMatch[]): Record<string, StandingsRow> {
  const table: Record<string, StandingsRow> = {}
  for (const club of clubIds) table[club] = emptyRow(club)
  for (const match of matches) applyMatch(table, match)
  return table
}

/** Points-and-GD table computed only from matches among the given subset. */
function headToHeadTable(clubs: string[], matches: StandingsMatch[]): Record<string, StandingsRow> {
  const subset = new Set(clubs)
  const relevant = matches.filter((m) => subset.has(m.home) && subset.has(m.away))
  return buildTable(clubs, relevant)
}

export interface StandingsOptions {
  /** Higher is better. Defaults to 0 for every club. */
  fairPlay?: Record<string, number>
  /**
   * Tie-break of last resort. Clubs earlier in this list rank higher when
   * every other criterion is still equal. Defaults to the order clubIds
   * were given in.
   */
  fixedSeedOrder?: string[]
}

export interface StandingsResult extends StandingsRow {
  rank: number
  gd: number
}

export function standings(
  clubIds: string[],
  matches: StandingsMatch[],
  options: StandingsOptions = {},
): StandingsResult[] {
  const table = buildTable(clubIds, matches)
  const fairPlay = options.fairPlay ?? {}
  const seedOrder = options.fixedSeedOrder ?? clubIds
  const seedRank = new Map(seedOrder.map((club, index) => [club, index]))

  // Group clubs level on points so head-to-head is computed once per group,
  // not recomputed pairwise (which would be inconsistent for 3+ way ties).
  const byPoints = new Map<number, string[]>()
  for (const club of clubIds) {
    const points = table[club].points
    const group = byPoints.get(points) ?? []
    group.push(club)
    byPoints.set(points, group)
  }

  const h2hByClub = new Map<string, StandingsRow>()
  for (const group of byPoints.values()) {
    if (group.length < 2) continue
    const mini = headToHeadTable(group, matches)
    for (const club of group) h2hByClub.set(club, mini[club])
  }

  const rows = clubIds.map((club) => {
    const row = table[club]
    const h2h = h2hByClub.get(club)
    return {
      ...row,
      gd: row.gf - row.ga,
      fairPlay: fairPlay[club] ?? 0,
      h2hPoints: h2h?.points ?? 0,
      h2hGd: h2h ? h2h.gf - h2h.ga : 0,
    }
  })

  rows.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.h2hPoints !== b.h2hPoints) return b.h2hPoints - a.h2hPoints
    if (a.h2hGd !== b.h2hGd) return b.h2hGd - a.h2hGd
    if (a.gd !== b.gd) return b.gd - a.gd
    if (a.gf !== b.gf) return b.gf - a.gf
    if (a.w !== b.w) return b.w - a.w
    if (a.fairPlay !== b.fairPlay) return b.fairPlay - a.fairPlay
    return (seedRank.get(a.club) ?? 0) - (seedRank.get(b.club) ?? 0)
  })

  return rows.map(({ h2hPoints: _h2hPoints, h2hGd: _h2hGd, ...row }, index) => ({ ...row, rank: index + 1 }))
}
