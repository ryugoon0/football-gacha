import type { PlayerRating } from './growth'

/**
 * A club's individual records for the running casual season — 득점왕·도움왕·
 * MVP, bragging rights only (no gold rides on them, by design). Keyed by card
 * uid so two copies of one player stay two entries, like everywhere else.
 */
export interface SeasonPlayerStat {
  uid: string
  name: string
  matches: number
  goals: number
  assists: number
  /** Times this player was the club's best mark of the match. */
  mvps: number
  ratingSum: number
}

export type SeasonStats = Record<string, SeasonPlayerStat>

/** The club's man of the match: best rating, then goals, then assists. */
export function matchMvpOf(ratings: PlayerRating[]): PlayerRating | null {
  if (ratings.length === 0) return null
  return [...ratings].sort(
    (a, b) => b.rating - a.rating || b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0) || a.name.localeCompare(b.name, 'ko'),
  )[0]
}

/** Folds one match's sheet into the season's running totals. */
export function recordSeasonStats(stats: SeasonStats | undefined, ratings: PlayerRating[]): SeasonStats {
  const next: SeasonStats = { ...(stats ?? {}) }
  const mvp = matchMvpOf(ratings)
  for (const mark of ratings) {
    const prev = next[mark.uid] ?? { uid: mark.uid, name: mark.name, matches: 0, goals: 0, assists: 0, mvps: 0, ratingSum: 0 }
    next[mark.uid] = {
      ...prev,
      name: mark.name,
      matches: prev.matches + 1,
      goals: prev.goals + mark.goals,
      assists: prev.assists + (mark.assists ?? 0),
      mvps: prev.mvps + (mvp && mvp.uid === mark.uid ? 1 : 0),
      ratingSum: prev.ratingSum + mark.rating,
    }
  }
  return next
}

export interface SeasonLeaders {
  scorers: SeasonPlayerStat[]
  assisters: SeasonPlayerStat[]
  mvps: SeasonPlayerStat[]
}

/** Top entries for each board; nobody appears with a zero. */
export function seasonLeaders(stats: SeasonStats | undefined, limit = 5): SeasonLeaders {
  const rows = Object.values(stats ?? {})
  const byName = (a: SeasonPlayerStat, b: SeasonPlayerStat) => a.name.localeCompare(b.name, 'ko')
  return {
    scorers: rows
      .filter((r) => r.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matches - b.matches || byName(a, b))
      .slice(0, limit),
    assisters: rows
      .filter((r) => r.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.matches - b.matches || byName(a, b))
      .slice(0, limit),
    mvps: rows
      .filter((r) => r.mvps > 0)
      .sort((a, b) => b.mvps - a.mvps || b.ratingSum / b.matches - a.ratingSum / a.matches || byName(a, b))
      .slice(0, limit),
  }
}

export function averageRating(stat: SeasonPlayerStat): number {
  return stat.matches > 0 ? Math.round((stat.ratingSum / stat.matches) * 10) / 10 : 0
}
