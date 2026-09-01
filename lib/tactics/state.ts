import type { SquadProfile } from './profile'
import type { TacticalParams } from './params'

/**
 * What a set of instructions turns into once real players carry it out: where
 * the team stands, how well it can do what it was asked, and what that costs.
 *
 * Distances are metres so they can be compared with published tracking work
 * (team width ~35-48m, team length ~31-46m in professional matches). They are
 * tendencies, not limits.
 */
export interface TacticalState {
  /** Spatial structure. */
  teamWidth: number
  teamLength: number
  defensiveHeight: number
  compactness: number
  /** 0-1. Space in behind for a runner to attack. */
  spaceBehind: number
  /** 0-1. Cover left against a counter attack. */
  restDefence: number

  /** Behaviour, all 0-1 unless noted. */
  pressPower: number
  pressHeight: number
  buildUpControl: number
  bypassPress: number
  progression: number
  chanceFrequency: number
  wideRoute: number
  throughRoute: number
  counterPower: number
  counterPressPower: number
  /** Multiplier on stamina drain, 1 = an ordinary shift. */
  fatigueDraw: number
}

const unit = (value: number) => Math.max(0, Math.min(1, value))
const p = (value: number) => value / 100

/** How much of an attribute matters, centred on 50 so an average side is 1.0. */
const ability = (value: number, weight = 1): number => 1 + ((value - 50) / 100) * weight

/**
 * `fatigue` is 0 at kick-off and rises towards 1 as the team empties. A tired
 * team cannot hold a high line or a hard press however the dials are set.
 */
export function deriveTacticalState(
  params: TacticalParams,
  profile: SquadProfile,
  fatigue = 0,
): TacticalState {
  const tired = unit(fatigue)
  // Running-heavy instructions are the first thing to go when legs empty.
  const legs = unit(1 - tired * (0.62 + p(params.pressingIntensity) * 0.5))

  const attackingWidth = p(params.attackingWidth)
  const defensiveWidth = p(params.defensiveWidth)
  const compact = p(params.pressingCompactness)

  // Shape. Wide instructions stretch the pitch, compact ones squeeze it.
  const teamWidth = 34 + attackingWidth * 12 + defensiveWidth * 3 - compact * 3
  const teamLength = 30 + p(params.directness) * 8 + p(params.forwardRunFrequency) * 6 - compact * 6
  const defensiveHeight = 24 + p(params.defensiveLine) * 30 * (0.75 + legs * 0.25)
  const compactness = unit(0.35 + compact * 0.5 - p(params.attackingWidth) * 0.15)

  // A high line only leaves space behind if the defenders cannot cover it.
  const lineRisk = p(params.defensiveLine) * (1 + p(params.offsideTrap) * 0.3)
  const cover = (profile.defencePace * 0.6 + profile.keeperSweeping * 0.25 + profile.defencePositioning * 0.15) / 100
  const spaceBehind = unit(0.12 + lineRisk * 0.75 - cover * 0.55)

  // Players held back, minus the ones sent forward.
  const restDefence = unit(
    0.2 +
      p(params.restDefence) * 0.55 +
      p(params.regroupPriority) * 0.15 -
      p(params.forwardRunFrequency) * 0.35 -
      p(params.overlapFrequency) * 0.12,
  )

  // Pressing: intent × the legs and heads to do it, held together by shape.
  const pressPower = unit(
    p(params.pressingIntensity) *
      ability(profile.workRate, 0.6) *
      ability(profile.acceleration, 0.4) *
      (0.55 + compact * 0.45) *
      (0.45 + legs * 0.55),
  )
  const pressHeight = unit(p(params.blockHeight) * (0.7 + legs * 0.3))

  // Playing out: short build-up asks for technique, long build-up does not.
  const shortness = p(params.buildUpShortness)
  const buildUpControl = unit(
    (0.3 + shortness * 0.45) *
      ability(profile.passingShort, 0.7) *
      ability(profile.composure, 0.5) *
      ability(profile.technique, 0.3) *
      (1 - p(params.passingRisk) * 0.18),
  )
  // Hitting it long skips the press entirely, at the cost of keeping the ball.
  const bypassPress = unit(p(params.directness) * (0.4 + (1 - shortness) * 0.55))

  const progression = unit(
    0.3 +
      p(params.transitionSpeed) * 0.25 +
      p(params.directness) * 0.2 +
      (ability(profile.vision, 0.4) - 1) +
      (ability(profile.passingLong, 0.25) - 1) * p(params.directness),
  )

  // Tempo and patience trade quantity against quality; the balance is decided
  // in the sequence resolver, this only says how often a move is attempted.
  const chanceFrequency = unit(
    0.35 +
      p(params.tempo) * 0.3 +
      p(params.forwardRunFrequency) * 0.15 -
      p(params.finalThirdPatience) * 0.12,
  )

  const wideRoute = unit(0.2 + p(params.crossFrequency) * 0.4 + attackingWidth * 0.3 + p(params.overlapFrequency) * 0.1)
  const throughRoute = unit(0.15 + p(params.throughBallFrequency) * 0.5 + p(params.directness) * 0.2)

  const counterPower = unit(
    p(params.counterAttackIntensity) *
      (0.5 + p(params.transitionSpeed) * 0.5) *
      ability(profile.attackPace, 0.7) *
      (0.6 + legs * 0.4),
  )
  const counterPressPower = unit(
    p(params.counterPressIntensity) *
      ability(profile.workRate, 0.5) *
      (0.5 + compact * 0.5) *
      (0.45 + legs * 0.55),
  )

  const fatigueDraw =
    0.55 +
    p(params.pressingIntensity) * 0.5 +
    p(params.tempo) * 0.3 +
    p(params.counterPressIntensity) * 0.25 +
    p(params.forwardRunFrequency) * 0.15 +
    p(params.overlapFrequency) * 0.1 -
    (profile.stamina - 50) / 250

  return {
    teamWidth,
    teamLength,
    defensiveHeight,
    compactness,
    spaceBehind,
    restDefence,
    pressPower,
    pressHeight,
    buildUpControl,
    bypassPress,
    progression,
    chanceFrequency,
    wideRoute,
    throughRoute,
    counterPower,
    counterPressPower,
    fatigueDraw: Math.max(0.4, fatigueDraw),
  }
}
