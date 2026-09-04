/**
 * Gold for the weekly league — what a settled fixture pays each real manager,
 * and the 핫타임 bonus for stepping in at the featured kick-off hours.
 *
 * Amounts are decided on the server at settlement (weekly-fixture-live) and
 * banked in weekly_rewards; the manager collects them from the 경쟁 리그 tab
 * ("보상 받기"), which is when the gold reaches their save — the same
 * "server decides the amount, the client holds the balance" shape as every
 * other reward in the game.
 */
import { rawMatchReward } from '../match'
import { tune } from '../tuning'
import { HOT_TIME_HOURS_KST, KST_OFFSET_MINUTES, TIERS } from './config'

export type WeeklyOutcome = 'W' | 'D' | 'L'

/** Tier 0 is the top flight; it maps onto casual mode's division 1 for the division bonus. */
export function divisionForTier(tier: number): number {
  return Math.max(1, Math.min(5, tier + 1))
}

/**
 * One manager's gold for one fixture. Casual mode's reward shape, the tier's
 * gradient (TIERS.rewardMultiplier — a top-flight win pays more than a
 * bottom-tier one), and the operator's competitiveGoldMultiplier on top.
 */
export function weeklyMatchReward(outcome: WeeklyOutcome, tier: number, goalsFor: number): number {
  const tierDef = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))]
  const raw = rawMatchReward(outcome, divisionForTier(tier), goalsFor)
  return Math.round(raw * tierDef.rewardMultiplier * tune('competitiveGoldMultiplier'))
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
