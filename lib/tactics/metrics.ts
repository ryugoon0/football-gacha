/**
 * What the match produced, per side. These are the numbers a tactic is judged
 * on — the scoreline alone cannot tell you whether a plan worked.
 */
export interface SideMetrics {
  possessionTicks: number
  passes: number
  passesCompleted: number
  longPasses: number
  progressions: number
  finalThirdEntries: number
  shots: number
  shotsOnTarget: number
  /** Sum of chance quality, an expected-goals proxy. */
  xg: number
  crosses: number
  throughBalls: number
  counterAttacks: number
  /** Times this side went to press an opponent in possession. */
  pressures: number
  /** Tackles and interceptions that ended an opponent move. */
  defensiveActions: number
  /** Recoveries made in the opponent's half. */
  highTurnovers: number
  /** Times this side lost the ball during a move of its own. */
  turnoversLost: number
  /** Losses the counter press failed to win straight back. */
  pressBeaten: number
  fouls: number
  /** Condition burnt, in points. */
  staminaUsed: number
}

export interface MatchMetrics {
  home: SideMetrics
  away: SideMetrics
}

export function emptySideMetrics(): SideMetrics {
  return {
    possessionTicks: 0,
    passes: 0,
    passesCompleted: 0,
    longPasses: 0,
    progressions: 0,
    finalThirdEntries: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    crosses: 0,
    throughBalls: 0,
    counterAttacks: 0,
    pressures: 0,
    defensiveActions: 0,
    highTurnovers: 0,
    turnoversLost: 0,
    pressBeaten: 0,
    fouls: 0,
    staminaUsed: 0,
  }
}

export function emptyMetrics(): MatchMetrics {
  return { home: emptySideMetrics(), away: emptySideMetrics() }
}

/**
 * Passes the opponent completed for each defensive action this side made.
 * Low numbers mean a side that presses; high numbers mean one that sits.
 */
export function ppda(metrics: MatchMetrics, side: 'home' | 'away'): number {
  const us = metrics[side]
  const them = metrics[side === 'home' ? 'away' : 'home']
  const actions = us.defensiveActions
  if (actions <= 0) return them.passes > 0 ? them.passes : 0
  return them.passes / actions
}

export function passAccuracy(side: SideMetrics): number {
  return side.passes > 0 ? side.passesCompleted / side.passes : 0
}

export function possessionShare(metrics: MatchMetrics, side: 'home' | 'away'): number {
  const total = metrics.home.possessionTicks + metrics.away.possessionTicks
  if (total <= 0) return 0.5
  return metrics[side].possessionTicks / total
}
