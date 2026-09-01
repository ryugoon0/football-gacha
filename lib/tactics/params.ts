/**
 * Every tactical instruction the engine understands, as a 0-100 dial.
 *
 * Nothing here is a result modifier. A parameter only describes how the team
 * behaves; what that behaviour is worth is decided by the simulation, against
 * the opponent's behaviour and the players who have to carry it out.
 */
export interface TacticalParams {
  // --- in possession -------------------------------------------------------
  /** How quickly the ball is moved on. Costs stamina and accuracy. */
  tempo: number
  /** Forward passing over sideways. High = long, low = patient. */
  directness: number
  /** How far the team spreads when it has the ball. */
  attackingWidth: number
  /** Short build-up from the back rather than clearing it long. */
  buildUpShortness: number
  /** Willingness to play a pass that can be intercepted. */
  passingRisk: number
  /** Waiting for the right opening in the final third. */
  finalThirdPatience: number
  /** How often the ball is put into the box from wide. */
  crossFrequency: number
  /** How often a ball is played in behind the defence. */
  throughBallFrequency: number
  /** Full backs running beyond the winger. */
  overlapFrequency: number

  // --- out of possession ---------------------------------------------------
  /** Where the last line stands. High = more space behind. */
  defensiveLine: number
  /** Where the first line of pressure starts. Not the same as the last line. */
  blockHeight: number
  /** How hard the team goes to win the ball back. */
  pressingIntensity: number
  /** How well the press keeps its shape. */
  pressingCompactness: number
  /** How wide the defensive block sits. */
  defensiveWidth: number
  /** Stepping up to catch runners offside. */
  offsideTrap: number

  // --- transition ----------------------------------------------------------
  /** Pressing immediately after losing the ball. */
  counterPressIntensity: number
  /** Dropping back into shape instead of counter pressing. */
  regroupPriority: number
  /** Attacking straight from a recovery. */
  counterAttackIntensity: number
  /** How fast the ball travels forward in transition. */
  transitionSpeed: number
  /** How many players join the attack. */
  forwardRunFrequency: number
  /** Players deliberately held back against the counter. */
  restDefence: number
}

export type TacticalParamKey = keyof TacticalParams

export const PARAM_KEYS: TacticalParamKey[] = [
  'tempo',
  'directness',
  'attackingWidth',
  'buildUpShortness',
  'passingRisk',
  'finalThirdPatience',
  'crossFrequency',
  'throughBallFrequency',
  'overlapFrequency',
  'defensiveLine',
  'blockHeight',
  'pressingIntensity',
  'pressingCompactness',
  'defensiveWidth',
  'offsideTrap',
  'counterPressIntensity',
  'regroupPriority',
  'counterAttackIntensity',
  'transitionSpeed',
  'forwardRunFrequency',
  'restDefence',
]

export const clamp100 = (value: number): number =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50))

/** A neutral team: nothing emphasised, nothing given up. */
export const DEFAULT_PARAMS: TacticalParams = {
  tempo: 50,
  directness: 50,
  attackingWidth: 50,
  buildUpShortness: 50,
  passingRisk: 50,
  finalThirdPatience: 50,
  crossFrequency: 50,
  throughBallFrequency: 50,
  overlapFrequency: 45,
  defensiveLine: 50,
  blockHeight: 50,
  pressingIntensity: 50,
  pressingCompactness: 50,
  defensiveWidth: 50,
  offsideTrap: 40,
  counterPressIntensity: 50,
  regroupPriority: 50,
  counterAttackIntensity: 50,
  transitionSpeed: 50,
  forwardRunFrequency: 50,
  restDefence: 50,
}

export function normalizeParams(value: Partial<TacticalParams> | null | undefined): TacticalParams {
  const params = { ...DEFAULT_PARAMS }
  if (!value || typeof value !== 'object') return params
  for (const key of PARAM_KEYS) {
    const raw = (value as Record<string, unknown>)[key]
    if (typeof raw === 'number') params[key] = clamp100(raw)
  }
  return params
}

export function withParams(
  base: TacticalParams,
  overrides: Partial<TacticalParams>,
): TacticalParams {
  return normalizeParams({ ...base, ...overrides })
}
