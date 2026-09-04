import type { PlayerDef } from './types'

export type ColorKind = 'club' | 'league' | 'nation'

export interface ColorTier {
  /** Players from the same club, league or country needed. */
  count: number
  /** Rating added to attack, midfield and defence. */
  rating: number
  /** Extra chemistry. */
  chemistry: number
}

/**
 * Only the biggest group of each kind counts (see teamColors), so the club
 * ladder has to reward a full eleven more than any split ever could: 7+4 used
 * to beat 11 outright because the 7-tier and the 3-tier stacked. Now 11 of
 * one club is the strongest thing a squad can do, and every split is strictly
 * worse than the larger half alone. League and nation are a smaller topping —
 * eleven of one club are already eleven of one league.
 */
export const COLOR_TIERS: Record<ColorKind, ColorTier[]> = {
  // Counted over the whole matchday squad — eleven starters plus the seven on
  // the bench (BENCH_SIZE), eighteen in all. The top step needs every one.
  club: [
    { count: 8, rating: 2, chemistry: 3 },
    { count: 11, rating: 5, chemistry: 6 },
    { count: 14, rating: 8, chemistry: 10 },
    { count: 17, rating: 11, chemistry: 13 },
    { count: 18, rating: 14, chemistry: 17 },
  ],
  league: [
    { count: 11, rating: 1, chemistry: 1 },
    { count: 15, rating: 2, chemistry: 2 },
    { count: 18, rating: 4, chemistry: 4 },
  ],
  nation: [
    { count: 11, rating: 1, chemistry: 1 },
    { count: 15, rating: 2, chemistry: 3 },
    { count: 18, rating: 4, chemistry: 5 },
  ],
}

/** Starters plus bench — the pool team colours are counted over. */
export const COLOR_SQUAD_SIZE = 18

export const COLOR_LABELS: Record<ColorKind, string> = {
  club: '클럽',
  league: '리그',
  nation: '국가',
}

/** Club 18 + league 18 + nation 18 lands exactly here; nothing can pass it. */
export const COLOR_CAPS = { rating: 22, chemistry: 26 }

export interface ActiveColor {
  kind: ColorKind
  /** Club name, league name or country. */
  key: string
  count: number
  tier: ColorTier
  /** The next step up, when there is one. */
  next: { count: number; missing: number; tier: ColorTier } | null
  /** False when a bigger group of the same kind already takes the bonus. */
  counted: boolean
}

export interface ColorHint {
  kind: ColorKind
  key: string
  count: number
  missing: number
  tier: ColorTier
}

export interface TeamColors {
  active: ActiveColor[]
  /** Colours that are one or two players away. */
  hints: ColorHint[]
  bonus: { rating: number; chemistry: number }
}

function tally(players: PlayerDef[], pick: (player: PlayerDef) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const player of players) {
    const key = pick(player)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

const PICKERS: Record<ColorKind, (player: PlayerDef) => string> = {
  club: (player) => player.club,
  league: (player) => player.league,
  nation: (player) => player.nation,
}

/**
 * Works out which team colours the matchday squad (starters and bench)
 * triggers, and which ones are within reach.
 *
 * One rule the testers found the hard way: per kind (club / league / nation)
 * only the biggest group counts. Two clubs of five used to stack to more than
 * one club of seven, so mixing beat commitment. Smaller groups still show up
 * in `active` with `counted: false` so the screen can say why they give nothing.
 */
export function teamColors(players: PlayerDef[]): TeamColors {
  const active: ActiveColor[] = []
  const hints: ColorHint[] = []

  for (const kind of Object.keys(PICKERS) as ColorKind[]) {
    const tiers = COLOR_TIERS[kind]
    const reached: ActiveColor[] = []
    const near: ColorHint[] = []
    for (const [key, count] of tally(players, PICKERS[kind])) {
      const reachedIndex = tiers.reduce(
        (best, tier, index) => (count >= tier.count ? index : best),
        -1,
      )
      const next = tiers[reachedIndex + 1] ?? null

      if (reachedIndex >= 0) {
        reached.push({
          kind,
          key,
          count,
          tier: tiers[reachedIndex],
          next: next ? { count: next.count, missing: next.count - count, tier: next } : null,
          counted: false,
        })
      } else if (next && next.count - count <= 2) {
        near.push({ kind, key, count, missing: next.count - count, tier: next })
      }
    }
    reached.sort((a, b) => b.tier.rating - a.tier.rating || b.count - a.count || a.key.localeCompare(b.key, 'ko'))
    if (reached[0]) reached[0].counted = true
    active.push(...reached)
    // A hint is only worth showing when reaching it would beat what already counts.
    const countedRating = reached[0]?.tier.rating ?? 0
    hints.push(...near.filter((hint) => hint.tier.rating > countedRating))
  }

  active.sort((a, b) => Number(b.counted) - Number(a.counted) || b.tier.rating - a.tier.rating || b.count - a.count)
  hints.sort((a, b) => a.missing - b.missing || b.count - a.count)

  const bonus = active.reduce(
    (sum, color) =>
      color.counted
        ? { rating: sum.rating + color.tier.rating, chemistry: sum.chemistry + color.tier.chemistry }
        : sum,
    { rating: 0, chemistry: 0 },
  )

  return {
    active,
    hints: hints.slice(0, 4),
    bonus: {
      rating: Math.min(COLOR_CAPS.rating, bonus.rating),
      chemistry: Math.min(COLOR_CAPS.chemistry, bonus.chemistry),
    },
  }
}

/** Names that already say what they are, so the suffix would read twice. */
const SELF_LABELLED = ['리그', '리가', '컵']

export function colorName(color: { kind: ColorKind; key: string }): string {
  const label = COLOR_LABELS[color.kind]
  // "코리아 리그 리그" reads badly, so skip the suffix when the name has one.
  if (color.key.endsWith(label)) return color.key
  if (color.kind === 'league' && SELF_LABELLED.some((word) => color.key.endsWith(word))) {
    return color.key
  }
  return `${color.key} ${label}`
}
