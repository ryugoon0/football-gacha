/**
 * Gold for the weekly league — what a settled fixture pays each real manager,
 * and the 핫타임 bonus for stepping in at the featured kick-off hours.
 *
 * Amounts are decided on the server at settlement (weekly-fixture-live) and
 * banked in weekly_rewards; the manager collects them from the 경쟁 리그 tab
 * ("보상 받기"), which is when the gold reaches their save — the same
 * "server decides the amount, the client holds the balance" shape as every
 * other reward in the game.
 *
 * Every rate here is an operator knob (lib/tuning.ts, group '보상'), shown
 * and adjusted from the operator console's 보상 tab.
 */
import { rawMatchReward } from '../match'
import { tune, type KnobKey } from '../tuning'
import { HOT_TIME_HOURS_KST, KST_OFFSET_MINUTES } from './config'

export type WeeklyOutcome = 'W' | 'D' | 'L'

/** The knob holding each tier's reward multiplier — index is the tier. */
export const TIER_MULTIPLIER_KNOBS: KnobKey[] = [
  'weeklyTierMultiplier0',
  'weeklyTierMultiplier1',
  'weeklyTierMultiplier2',
  'weeklyTierMultiplier3',
]

export function tierMultiplierKnob(tier: number): KnobKey {
  return TIER_MULTIPLIER_KNOBS[Math.max(0, Math.min(TIER_MULTIPLIER_KNOBS.length - 1, tier))]
}

/** Tier 0 is the top flight; it maps onto casual mode's division 1 for the division bonus. */
export function divisionForTier(tier: number): number {
  return Math.max(1, Math.min(5, tier + 1))
}

/**
 * One manager's gold for one fixture. Casual mode's reward shape, the tier's
 * gradient (weeklyTierMultiplier knobs — a top-flight win pays more than a
 * bottom-tier one), and the operator's competitiveGoldMultiplier on top.
 * `rates` lets the operator console preview an unsaved slider position;
 * the server always passes nothing and reads the saved knobs.
 */
export function weeklyMatchReward(
  outcome: WeeklyOutcome,
  tier: number,
  goalsFor: number,
  rates: Partial<Record<KnobKey, number>> = {},
): number {
  const read = (key: KnobKey) => rates[key] ?? tune(key)
  const raw = rawMatchReward(outcome, divisionForTier(tier), goalsFor)
  return Math.round(raw * read(tierMultiplierKnob(tier)) * read('competitiveGoldMultiplier'))
}

export function outcomeOf(goalsFor: number, goalsAgainst: number): WeeklyOutcome {
  if (goalsFor > goalsAgainst) return 'W'
  if (goalsFor < goalsAgainst) return 'L'
  return 'D'
}

/** Whether a kick-off at this instant is a 핫타임 slot (15:00 / 21:00 KST). */
export function isHotTime(kickoffUtcMs: number): boolean {
  const kst = new Date(kickoffUtcMs + KST_OFFSET_MINUTES * 60_000)
  return HOT_TIME_HOURS_KST.includes(kst.getUTCHours())
}

/** The bonus for a manager who sent at least one order in a 핫타임 fixture; 0 otherwise. */
export function hotTimeBonus(kickoffUtcMs: number, commandsSent: number): number {
  if (!isHotTime(kickoffUtcMs) || commandsSent <= 0) return 0
  return Math.round(tune('hotTimeBonus'))
}

// ---------------------------------------------------------------------------
// 주간 시즌 보상 — a week's league is a season. When its last fixture has
// settled the server (close_weekly_groups, supabase/migrations/
// 20260906050000_weekly_season_honours.sql) pays every real manager by final
// rank, the cup finalists, the Masters Final winner, and the owners of the
// week's 베스트 일레븐 and individual award winners. The SQL mirrors these
// formulas knob for knob; this file is what the operator console and the
// 경쟁 리그 tab show, so the two must be kept in step.
// ---------------------------------------------------------------------------

export type SeasonRewardKind =
  | 'season_rank'
  | 'cup_winner'
  | 'cup_runner_up'
  | 'masters_winner'
  | 'best_eleven'
  | 'top_scorer'
  | 'top_assist'
  | 'top_mvp'

export const SEASON_REWARD_LABELS: Record<SeasonRewardKind, string> = {
  season_rank: '주간 순위 보상',
  cup_winner: '컵 우승',
  cup_runner_up: '컵 준우승',
  masters_winner: '마스터스 우승',
  best_eleven: '베스트 일레븐',
  top_scorer: '득점왕',
  top_assist: '도움왕',
  top_mvp: 'MVP왕',
}

/** The knob a final rank (1..16) draws its base amount from. */
export function seasonRankKnob(rank: number): KnobKey {
  if (rank <= 1) return 'weeklySeasonRank1'
  if (rank === 2) return 'weeklySeasonRank2'
  if (rank === 3) return 'weeklySeasonRank3'
  if (rank <= 8) return 'weeklySeasonRank4to8'
  if (rank <= 13) return 'weeklySeasonRank9to13'
  return 'weeklySeasonRank14to16'
}

/** Base knob amount × the tier's gradient × the operator's competitive multiplier. */
export function seasonAmount(base: KnobKey, tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  const read = (key: KnobKey) => rates[key] ?? tune(key)
  return Math.round(read(base) * read(tierMultiplierKnob(tier)) * read('competitiveGoldMultiplier'))
}

/** Gold for finishing the week at `rank` in a tier's league. */
export function seasonRankReward(rank: number, tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  return seasonAmount(seasonRankKnob(rank), tier, rates)
}

export function cupReward(place: 'winner' | 'runnerUp', tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  return seasonAmount(place === 'winner' ? 'weeklyCupWinner' : 'weeklyCupRunnerUp', tier, rates)
}

export function mastersReward(tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  return seasonAmount('weeklyMastersWinner', tier, rates)
}

/** Per player of mine in the week's best eleven. */
export function bestElevenReward(tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  return seasonAmount('weeklyBestElevenBonus', tier, rates)
}

/** 득점왕 · 도움왕 · MVP왕 — one payment each to the owning manager. */
export function individualAwardReward(tier: number, rates: Partial<Record<KnobKey, number>> = {}): number {
  return seasonAmount('weeklyIndividualAward', tier, rates)
}

/**
 * How the 베스트 일레븐 is picked (mirrored in SQL weekly_best_eleven): every
 * starter's marks across the week's engine-settled fixtures, shrunk towards
 * BEST_ELEVEN_PRIOR by BEST_ELEVEN_PRIOR_WEIGHT phantom matches so a player
 * with three lucky games does not outrank one who was excellent all week;
 * then the best goalkeeper, four defenders, three midfielders and three
 * forwards by that score, with any short line filled from the rest.
 */
export const BEST_ELEVEN_MIN_APPEARANCES = 3
export const BEST_ELEVEN_PRIOR = 6.0
export const BEST_ELEVEN_PRIOR_WEIGHT = 6
export const BEST_ELEVEN_SHAPE = { GK: 1, DF: 4, MF: 3, FW: 3 } as const

export function bestElevenScore(ratingSum: number, appearances: number): number {
  return (ratingSum + BEST_ELEVEN_PRIOR * BEST_ELEVEN_PRIOR_WEIGHT) / (appearances + BEST_ELEVEN_PRIOR_WEIGHT)
}

export interface WeeklyRewardLine {
  userId: string
  kind: 'match' | 'hot_time'
  amount: number
}

/**
 * Everything one settled fixture pays, for the commit RPC. AI sides pay
 * nobody; a real side gets its match reward and, at a 핫타임 kick-off it
 * stepped into, the bonus as a second line.
 */
export function rewardsForFixture(args: {
  tier: number
  kickoffUtcMs: number
  scoreHome: number
  scoreAway: number
  homeUserId: string | null
  awayUserId: string | null
  homeCommands: number
  awayCommands: number
}): WeeklyRewardLine[] {
  const lines: WeeklyRewardLine[] = []
  const side = (userId: string | null, goalsFor: number, goalsAgainst: number, commands: number) => {
    if (!userId) return
    const match = weeklyMatchReward(outcomeOf(goalsFor, goalsAgainst), args.tier, goalsFor)
    if (match > 0) lines.push({ userId, kind: 'match', amount: match })
    const bonus = hotTimeBonus(args.kickoffUtcMs, commands)
    if (bonus > 0) lines.push({ userId, kind: 'hot_time', amount: bonus })
  }
  side(args.homeUserId, args.scoreHome, args.scoreAway, args.homeCommands)
  side(args.awayUserId, args.scoreAway, args.scoreHome, args.awayCommands)
  return lines
}
