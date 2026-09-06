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
import { applyAutoSubs, clearSidelined } from '../autoSub'
import { tune } from '../tuning'
import { FORMATION_KEYS } from '../formations'
import { evaluateSquad, type SquadRating } from '../squad'
import { DEFAULT_TACTIC, type TacticSetup } from '../tactics'
import type { PhasedTactics } from '../tactics/phases'
import { hashString, seededRandom } from '../random'
import type { Card, Squad } from '../types'
import { shapeFromSquad, type MatchSetup } from '../matchEngine'

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
  /** Per-player OVR the picker aims at — see weeklyAiAnchor() for where it comes from. */
  targetRating: number,
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
  return { cards, squad, rating: evaluateSquad(cards, squad, 5) }
}

/**
 * Measured on the first live group (2026-09-04): an AI eleven whose players
 * match the median real starter OVR still loses ~93% to that median manager,
 * because real squads also bring team-colour traits (goal +0.08, tempo 1.18)
 * that a mixed-club AI pick never has. About six OVR on top of the median
 * brought the median manager to ~55% — a mid-table AI, which is the intent.
 */
export const AI_EDGE_OVER_MEDIAN_OVR = 6

/**
 * The per-player OVR an AI club in this group should be picked at: the real
 * managers' starters set the bar (median of their average starter rating,
 * plus the trait compensation above), and the tier's AI base rating
 * (config.ts TIERS) keeps the designed gradient — top tier at the bar, lower
 * tiers proportionally below. With no real squads known, undefined: the
 * caller then falls back to the seeded member rating so a fixture still
 * settles.
 *
 * Note this is *player* OVR, not squad overall — scaling the headline
 * att/def/mid numbers was tried first and barely moved results, because the
 * engine's tactical model runs on the players' own stats.
 */
export function weeklyAiAnchor(
  realStarterAverages: number[],
  tierAiBaseRating: number,
  topTierAiBaseRating: number,
): number | undefined {
  const values = realStarterAverages.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (values.length === 0) return undefined
  const median = values[Math.floor((values.length - 1) / 2)]
  const gradient = topTierAiBaseRating > 0 ? tierAiBaseRating / topTierAiBaseRating : 1
  return Math.max(40, Math.min(99, Math.round((median + AI_EDGE_OVER_MEDIAN_OVR) * gradient)))
}

/** Average rating of the starters actually on the pitch — the number weeklyAiAnchor() takes. */
export function starterAverageOf(rating: SquadRating): number {
  const starters = rating.evaluations.filter((item) => item.card)
  if (starters.length === 0) return 0
  return starters.reduce((total, item) => total + item.rating, 0) / starters.length
}

export interface WeeklyRealSquadInput {
  cards: Card[]
  squad: Squad
  /** The manager's own casual-mode division, reused only for the level-cap check evaluateSquad takes. */
  division: number
  tactic?: TacticSetup
  plan?: PhasedTactics
  /** Casual mode's automatic substitution setting; on by default. */
  autoSub?: boolean
}

/**
 * The eleven that actually kicks off: with automatic substitution on, an
 * injured or exhausted starter is swapped for a bench player first — exactly
 * what casual mode does before its kick-off (MatchTab readiness). A weekly
 * fixture the manager never opens still fields a sensible team.
 */
export function kickoffSquadOf(input: WeeklyRealSquadInput): Squad {
  // With automatic substitution off only the injured and suspended are
  // swapped (a tired bar nobody is under); on, the tired go too.
  const tiredBelow = input.autoSub === false ? -1 : tune('tiredSubThreshold')
  const swapped = applyAutoSubs(input.cards, input.squad, input.division, (card) => card.condition, tiredBelow).squad
  // Then nobody sidelined stays in the eighteen: starters the bench could not
  // cover and the injured now on the bench are replaced from the collection.
  return clearSidelined(input.cards, swapped, input.division).squad
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
  /** Per-player OVR an AI side is picked at — see weeklyAiAnchor(). Falls back to the member rating. */
  aiAnchor?: number
}): MatchSetup {
  const { groupId, home, away, homeInput, awayInput, neutralVenue, aiAnchor } = args

  const homeKickoff = homeInput ? kickoffSquadOf(homeInput) : null
  const homeAi = homeInput ? null : weeklyAiSquad(groupId, home.slot, aiAnchor ?? home.rating)
  const homeSquad = homeInput && homeKickoff
    ? evaluateSquad(homeInput.cards, homeKickoff, homeInput.division)
    : homeAi!.rating
  const homeFormation = homeKickoff?.formation ?? homeAi!.squad.formation
  const awaySquad = awayInput
    ? evaluateSquad(awayInput.cards, kickoffSquadOf(awayInput), awayInput.division)
    : weeklyAiSquad(groupId, away.slot, aiAnchor ?? away.rating).rating

  return {
    team: homeSquad,
    // Dots for the pitch view: the engine only moves players it has anchors
    // for, so the live screen's 바둑판 needs this in the snapshot.
    homeShape: shapeFromSquad(homeFormation, homeSquad.evaluations),
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
