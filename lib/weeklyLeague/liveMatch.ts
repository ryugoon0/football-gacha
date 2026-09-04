/**
 * Building a real MatchSetup for a weekly fixture, for the increment that
 * replaces the ratings-only Poisson settlement (supabase/migrations/
 * ..._weekly_fixture_settlement.sql) with the actual card/tactic engine —
 * see docs/WEEKLY_LIVE_MATCH_DESIGN.md.
 *
 * Scope: this only builds the *setup* for a single, no-intervention
 * `runToEnd()` pass (kickoff to full time in one shot). It does not cover
 * live command submission, partial-minute catch-up, or concurrency — those
 * are a separate, later increment. A fixture settled through this path is
 * simply pending -> played, same shape as the Poisson path it replaces.
 *
 * Bundled into supabase/functions/weekly-fixture-live/shared.js via
 * lib/weeklyLeagueServer.ts, same pattern as lib/serverMatch.ts.
 */
import { buildLineup } from '../aiClub'
import { FORMATION_KEYS } from '../formations'
import { evaluateSquad, type SquadRating } from '../squad'
import { DEFAULT_TACTIC, type TacticSetup } from '../tactics'
import type { PhasedTactics } from '../tactics/phases'
import { hashString, seededRandom } from '../random'
import type { Card, Squad } from '../types'
import type { MatchSetup } from '../matchEngine'

export interface WeeklyMemberSummary {
  slot: number
  kind: 'user' | 'ai'
  clubName: string
  /** The group-seeding rating — the AI target strength, or the user's last known rating. */
  rating: number
}

/**
 * A deterministic (fictional) squad for an AI opponent, at the group's
 * target strength for that tier. Same picker as lib/aiClub.ts's scouting
 * directory, seeded by group+slot so the same AI club fields the same
 * eleven on every settlement of that fixture (and every fixture that AI
 * slot plays, all season).
 */
export function weeklyAiSquad(
  groupId: number,
  slot: number,
  targetRating: number,
  /**
   * The squad overall the AI should actually play at. The card pool caps a
   * picked eleven well below what a real manager builds (team colours,
   * chemistry and levels push real squads past 120 while a picked AI eleven
   * stalls near 90), so the numbers the engine reads are scaled to this
   * anchor — the players stay, for names and stamina. See
   * weeklyAiAnchor().
   */
  anchorOverall?: number,
): { cards: Card[]; squad: Squad; rating: SquadRating } {
  const seed = hashString(`weekly-ai:${groupId}:${slot}`)
  const rng = seededRandom(seed)
  const formationKey = FORMATION_KEYS[Math.floor(rng() * FORMATION_KEYS.length)]
  const lineup = buildLineup(formationKey, targetRating, rng)

  const cards: Card[] = []
  const slots: Record<string, string | null> = {}
  const bench: (string | null)[] = []
  for (const member of lineup) {
    const uid = `weekly-ai:${groupId}:${slot}:${member.slot}`
    cards.push({
      uid,
      playerId: member.playerId,
      level: member.level,
      limit: member.level,
      condition: 100,
      injuredFor: 0,
      exp: 0,
    })
    if (member.role === 'starter') slots[member.slot] = uid
    else bench.push(uid)
  }
  // Pad the bench to the formation's outfield-plus-keeper count isn't needed —
  // evaluateSquad only reads the slots it has a formation entry for.
  const squad: Squad = { formation: formationKey, slots, bench }
  const evaluated = evaluateSquad(cards, squad, 5)
  if (!anchorOverall || anchorOverall <= 0 || evaluated.overall <= 0) {
    return { cards, squad, rating: evaluated }
  }
  const scale = anchorOverall / evaluated.overall
  const rating: SquadRating = {
    ...evaluated,
    overall: Math.round(evaluated.overall * scale),
    att: Math.round(evaluated.att * scale),
    mid: Math.round(evaluated.mid * scale),
    def: Math.round(evaluated.def * scale),
  }
  return { cards, squad, rating }
}

/**
 * What an AI club in this group should play at: the real managers' squads
 * set the bar, and the tier's AI base rating (config.ts TIERS) keeps the
 * designed gradient — the top tier's AI plays at the anchor, lower tiers
 * proportionally below it. With no real overalls known, falls back to the
 * seeded member rating so a fixture still settles.
 */
export function weeklyAiAnchor(realOveralls: number[], tierAiBaseRating: number, topTierAiBaseRating: number): number | undefined {
  const values = realOveralls.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (values.length === 0) return undefined
  const median = values[Math.floor((values.length - 1) / 2)]
  const gradient = topTierAiBaseRating > 0 ? tierAiBaseRating / topTierAiBaseRating : 1
  // A touch below the median so a mid-table real manager beats the AI more
  // often than not — casual mode's feel, not a coin flip.
  return Math.round(median * gradient * 0.96)
}

export interface WeeklyRealSquadInput {
  cards: Card[]
  squad: Squad
  /** The manager's own casual-mode division, reused only for the level-cap check evaluateSquad takes. */
  division: number
  tactic?: TacticSetup
  plan?: PhasedTactics
}

/**
 * Builds the two-sided MatchSetup for one weekly fixture. `home`/`away` are
 * whichever side actually is home for this fixture — `neutralVenue` (cup
 * ties) overrides that to 'neutral', matching weekly_fixtures.neutral_venue.
 */
export function buildWeeklyMatchSetup(args: {
  groupId: number
  home: WeeklyMemberSummary
  away: WeeklyMemberSummary
  homeInput?: WeeklyRealSquadInput
  awayInput?: WeeklyRealSquadInput
  neutralVenue: boolean
  /** Squad overall an AI side should play at — see weeklyAiAnchor(). */
  aiAnchor?: number
}): MatchSetup {
  const { groupId, home, away, homeInput, awayInput, neutralVenue, aiAnchor } = args

  const homeSquad = homeInput
    ? evaluateSquad(homeInput.cards, homeInput.squad, homeInput.division)
    : weeklyAiSquad(groupId, home.slot, home.rating, aiAnchor).rating
  const awaySquad = awayInput
    ? evaluateSquad(awayInput.cards, awayInput.squad, awayInput.division)
    : weeklyAiSquad(groupId, away.slot, away.rating, aiAnchor).rating

  return {
    team: homeSquad,
    teamName: home.clubName,
    opponent: { id: `weekly:${groupId}:${away.slot}`, name: away.clubName, badge: '', rating: away.rating },
    opponentSquad: awaySquad,
    opponentName: away.clubName,
    opponentTraits: awaySquad.traits,
    division: homeInput?.division ?? 5,
    venue: neutralVenue ? 'neutral' : 'home',
    tactic: homeInput?.tactic ?? DEFAULT_TACTIC,
    traits: homeSquad.traits,
    phased: homeInput?.plan,
    opponentTactics: awayInput?.plan ? { phased: awayInput.plan } : undefined,
  }
}
