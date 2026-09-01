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

export const COLOR_TIERS: Record<ColorKind, ColorTier[]> = {
  club: [
    { count: 3, rating: 2, chemistry: 3 },
    { count: 5, rating: 5, chemistry: 6 },
    { count: 7, rating: 9, chemistry: 10 },
  ],
  league: [
    { count: 5, rating: 2, chemistry: 2 },
    { count: 8, rating: 4, chemistry: 4 },
    { count: 11, rating: 7, chemistry: 8 },
  ],
  nation: [
    { count: 5, rating: 2, chemistry: 3 },
    { count: 8, rating: 4, chemistry: 6 },
    { count: 11, rating: 7, chemistry: 10 },
  ],
}

export const COLOR_LABELS: Record<ColorKind, string> = {
  club: '클럽',
  league: '리그',
  nation: '국가',
}

/** Nothing stacks past this, so one mega squad cannot run away with it. */
export const COLOR_CAPS = { rating: 14, chemistry: 20 }

export interface ActiveColor {
  kind: ColorKind
  /** Club name, league name or country. */
  key: string
  count: number
  tier: ColorTier
  /** The next step up, when there is one. */
  next: { count: number; missing: number; tier: ColorTier } | null
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
 * Works out which team colours the starting eleven triggers, and which ones are
 * within reach.
 */
export function teamColors(players: PlayerDef[]): TeamColors {
  const active: ActiveColor[] = []
  const hints: ColorHint[] = []

  for (const kind of Object.keys(PICKERS) as ColorKind[]) {
    const tiers = COLOR_TIERS[kind]
    for (const [key, count] of tally(players, PICKERS[kind])) {
      const reachedIndex = tiers.reduce(
        (best, tier, index) => (count >= tier.count ? index : best),
        -1,
      )
      const next = tiers[reachedIndex + 1] ?? null

      if (reachedIndex >= 0) {
        active.push({
          kind,
          key,
          count,
          tier: tiers[reachedIndex],
          next: next ? { count: next.count, missing: next.count - count, tier: next } : null,
        })
      } else if (next && next.count - count <= 2) {
        hints.push({ kind, key, count, missing: next.count - count, tier: next })
      }
    }
  }

  active.sort((a, b) => b.tier.rating - a.tier.rating || b.count - a.count)
  hints.sort((a, b) => a.missing - b.missing || b.count - a.count)

  const bonus = active.reduce(
    (sum, color) => ({
      rating: sum.rating + color.tier.rating,
      chemistry: sum.chemistry + color.tier.chemistry,
    }),
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
