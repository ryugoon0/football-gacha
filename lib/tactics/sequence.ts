import type { SquadProfile } from './profile'
import type { TacticalParams } from './params'
import type { TacticalState } from './state'

/** One side, as the resolver needs to see it. */
export interface SideModel {
  params: TacticalParams
  profile: SquadProfile
  state: TacticalState
  /** Rating the rest of the game already computed, used as a quality floor. */
  attack: number
  defence: number
}

export type SequenceKind =
  | 'retained'
  | 'progressed'
  | 'chance'
  | 'turnover'
  | 'foul'
  | 'out'

export interface SequenceResult {
  kind: SequenceKind
  /** Passes attempted and completed in this move. */
  passes: number
  completed: number
  longPasses: number
  /** True when the move reached the last third. */
  finalThird: boolean
  /** Set when the move ended in a shot. */
  shot?: {
    /** Expected goals for this attempt, 0-1. */
    quality: number
    route: 'central' | 'wide' | 'through' | 'counter' | 'second-ball'
  }
  /** Set when possession changed hands. */
  turnover?: {
    /** Won in the opponent's half. */
    high: boolean
    /** The recovery left the attack exposed. */
    counterable: boolean
    /** We swarmed the ball and won it straight back. */
    counterPressed?: boolean
  }
  /** The defending side went to press during this move. */
  pressures: number
  /** We lost it and the counter press did not win it straight back. */
  pressBeaten?: boolean
  defensiveActions: number
}

const unit = (value: number) => Math.max(0, Math.min(1, value))
const p = (value: number) => value / 100
/** Attribute vs attribute, centred so an even contest returns 0.5. */
const contest = (ours: number, theirs: number, spread = 22): number =>
  1 / (1 + Math.exp(-(ours - theirs) / spread))

/**
 * Resolves one possession sequence.
 *
 * The shape of the model is deliberate: a tactic never adds goals. It changes
 * how often the ball survives the first phase, how quickly it travels, where
 * it is lost, and what kind of opening it produces. Goals fall out of that.
 */
export function resolveSequence(
  attack: SideModel,
  defence: SideModel,
  rng: () => number,
): SequenceResult {
  const result: SequenceResult = {
    kind: 'retained',
    passes: 0,
    completed: 0,
    longPasses: 0,
    finalThird: false,
    pressures: 0,
    defensiveActions: 0,
  }

  const shortness = p(attack.params.buildUpShortness)
  const directness = p(attack.params.directness)

  // --- 1. build-up under pressure -----------------------------------------
  // A press only bites where it is set to work. Playing long walks past it,
  // and pays for that with completion.
  const pressReach = unit(defence.state.pressPower * (0.55 + defence.state.pressHeight * 0.45))
  const exposure = unit(0.25 + shortness * 0.75 - attack.state.bypassPress * 0.62)
  const pressureFaced = pressReach * exposure
  if (pressureFaced > 0.08) {
    result.pressures = 1 + (rng() < pressureFaced ? 1 : 0)
  }

  // Passes attempted: short sides play more of them, direct sides fewer.
  const passCount = Math.max(1, Math.round(2 + shortness * 5 + p(attack.params.tempo) * 2 - directness * 2))
  result.passes = passCount
  result.longPasses = Math.round(passCount * directness * 0.55)

  const keepBall = unit(
    0.52 +
      attack.state.buildUpControl * 0.3 -
      pressureFaced * 0.42 -
      directness * 0.16 +
      (contest(attack.profile.passingShort, defence.profile.defenceTackling) - 0.5) * 0.3,
  )
  // A ball hit long is far less likely to find a team mate, whatever the press.
  const longShare = result.longPasses / passCount
  result.completed = Math.round(passCount * unit(keepBall + 0.28 - longShare * 0.3))

  if (rng() > keepBall) {
    // Lost in the first phase. Where it was lost decides how bad that is.
    const high = rng() < unit(defence.state.pressHeight * 0.8 + pressureFaced * 0.4)
    result.kind = 'turnover'
    result.defensiveActions = 1

    // The six seconds after losing it. A side that swarms the ball often wins
    // it straight back — and is wide open when it does not.
    const swarm = attack.state.counterPressPower
    const escape = unit(0.35 + p(defence.params.transitionSpeed) * 0.3 + defence.state.progression * 0.2)
    if (swarm > 0.05 && rng() < unit(swarm * (1 - escape * 0.75))) {
      result.turnover = { high: false, counterable: false, counterPressed: true }
      return result
    }

    result.pressBeaten = true
    result.turnover = {
      high,
      // Committing bodies forward is what makes a loss dangerous. Pressing the
      // ball and losing that duel leaves even more of the pitch open.
      counterable:
        high ||
        rng() < unit(0.45 - attack.state.restDefence * 0.5 + swarm * 0.45),
    }
    return result
  }

  // Surviving a heavy press is worth something: the pressing side is now out
  // of shape, which is exactly what press-baiting build-up is after.
  const pressBroken = pressureFaced * unit(attack.state.buildUpControl + 0.15)

  // --- 2. progression ------------------------------------------------------
  const block = unit(
    0.32 +
      defence.state.compactness * 0.4 +
      (contest(defence.profile.defencePositioning, attack.profile.vision) - 0.5) * 0.5 -
      pressBroken * 0.55,
  )
  const carry = unit(
    attack.state.progression * 0.75 +
      p(attack.params.passingRisk) * 0.2 +
      // Clearing a high press leaves the ball ahead of the pressing line.
      attack.state.bypassPress * defence.state.pressHeight * 0.25,
  )
  if (rng() > unit(0.34 + carry * 0.5 - block * 0.4)) {
    // Stopped before the final third. A patient side facing a dense block does
    // not lose the ball for it — it simply goes round again, which is what
    // sterile domination looks like on the pitch.
    const recycle = unit(p(attack.params.finalThirdPatience) * 0.55 + attack.state.buildUpControl * 0.3) * block
    if (rng() < recycle) {
      result.kind = 'retained'
      return result
    }
    const foulOdds = unit(0.1 + defence.state.pressPower * 0.3 + p(defence.params.pressingIntensity) * 0.12)
    result.defensiveActions = 1
    if (rng() < foulOdds) {
      result.kind = 'foul'
      return result
    }
    result.kind = rng() < 0.45 ? 'out' : 'turnover'
    if (result.kind === 'turnover') {
      result.turnover = { high: false, counterable: rng() < unit(0.4 - attack.state.restDefence * 0.35) }
    }
    return result
  }

  result.kind = 'progressed'
  result.finalThird = true

  // --- 3. the opening ------------------------------------------------------
  // Which route the move takes is a tactical choice; whether it works is a
  // matchup between that route and the shape it is played against.
  // Teams attack the space that is actually there. A narrow block invites the
  // ball wide, a high line invites the ball in behind, an open one invites the
  // ball through the middle — so the opponent's shape steers the route.
  const wide = attack.state.wideRoute * (0.55 + (1 - p(defence.params.defensiveWidth)) * 0.9)
  const through = attack.state.throughRoute * (0.45 + defence.state.spaceBehind * 1.3)
  const central =
    Math.max(0.1, 1.2 - attack.state.wideRoute - attack.state.throughRoute) *
    (0.55 + (1 - defence.state.compactness) * 0.9)
  const roll = rng() * (wide + through + central)
  let route: NonNullable<SequenceResult['shot']>['route']
  let quality: number

  if (roll < wide) {
    route = 'wide'
    // A narrow block leaves the touchline open, but a cross is only as good as
    // the players attacking it against the ones defending it.
    const spaceWide = unit(0.35 + (1 - p(defence.params.defensiveWidth)) * 0.5 + p(attack.params.overlapFrequency) * 0.15)
    const air = contest(attack.profile.attackAerial, defence.profile.defenceAerial, 18)
    quality = 0.05 + spaceWide * 0.06 + air * 0.09
  } else if (roll < wide + through) {
    route = 'through'
    // The classic high-line punishment: space behind, and pace to reach it.
    const behind = defence.state.spaceBehind
    const race = contest(attack.profile.attackPace, defence.profile.defencePace, 16)
    quality = 0.05 + behind * 0.2 * race + (race - 0.5) * 0.07
  } else {
    route = 'central'
    // Breaking a compact block through the middle is the hardest opening to
    // find, and the best one when it comes off.
    const density = defence.state.compactness * (0.6 + p(defence.params.pressingCompactness) * 0.4)
    const craft = contest(attack.profile.technique, defence.profile.defencePositioning, 20)
    quality = 0.04 + Math.max(0, 0.16 - density * 0.12) + (craft - 0.5) * 0.12
  }

  // Patience trades volume for quality; a hurried side shoots from worse spots.
  quality *= 0.8 + p(attack.params.finalThirdPatience) * 0.35
  // Finishing decides how much of the opening is taken.
  quality *= 0.75 + (attack.profile.finishing / 100) * 0.5

  result.shot = { quality: unit(quality), route }
  result.kind = 'chance'
  return result
}

/**
 * A counter attack: the ball has just been won against a team that was
 * committed forward. Quality comes from the space they left, not from a bonus.
 */
export function resolveCounter(
  attack: SideModel,
  defence: SideModel,
  high: boolean,
  rng: () => number,
): SequenceResult {
  const result: SequenceResult = {
    kind: 'turnover',
    passes: Math.max(1, Math.round(1 + p(attack.params.transitionSpeed) * 2)),
    completed: 0,
    longPasses: 1,
    finalThird: false,
    pressures: 0,
    defensiveActions: 0,
  }

  // The opponent's counter press is the first thing a break has to survive.
  const escape = unit(
    0.35 +
      attack.state.counterPower * 0.45 +
      (contest(attack.profile.acceleration, defence.profile.workRate, 20) - 0.5) * 0.4 -
      // The swarm already had its chance to win the ball straight back; once a
      // break is away, the players who went to press are behind the ball.
      defence.state.counterPressPower * 0.18,
  )
  result.completed = Math.round(result.passes * unit(escape + 0.25))
  if (rng() > escape) {
    result.defensiveActions = 1
    return result
  }

  result.kind = 'chance'
  result.finalThird = true
  // Space left behind by the opponent, and the legs to reach it.
  const openField = unit(
    0.25 + defence.state.spaceBehind * 0.5 + (1 - defence.state.restDefence) * 0.4 + (high ? 0.15 : 0),
  )
  const race = contest(attack.profile.attackPace, defence.profile.defencePace, 16)
  const quality = unit(
    (0.06 + openField * 0.16 * race) * (0.75 + (attack.profile.finishing / 100) * 0.5),
  )
  result.shot = { quality, route: 'counter' }
  return result
}
