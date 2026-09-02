import { DEFAULT_PARAMS, normalizeParams, PARAM_KEYS, type TacticalParams } from './params'

/**
 * A match is four situations, not one. The same team can press furiously the
 * moment it loses the ball and sit deep once the opponent has settled, and a
 * plan that cannot say that is not a plan.
 */
export type Phase =
  /** We have it and the opponent is set. */
  | 'IN_POSSESSION'
  /** We have just won it back. */
  | 'ATTACKING_TRANSITION'
  /** They have it and we are set. */
  | 'OUT_OF_POSSESSION'
  /** We have just lost it. */
  | 'DEFENSIVE_TRANSITION'

export const PHASES: Phase[] = [
  'IN_POSSESSION',
  'ATTACKING_TRANSITION',
  'OUT_OF_POSSESSION',
  'DEFENSIVE_TRANSITION',
]

export const PHASE_LABELS: Record<Phase, string> = {
  IN_POSSESSION: '공격 (점유)',
  ATTACKING_TRANSITION: '공격 전환 (탈취 직후)',
  OUT_OF_POSSESSION: '수비 (상대 점유)',
  DEFENSIVE_TRANSITION: '수비 전환 (잃은 직후)',
}

/**
 * The dials a phase actually owns. Everything else falls through to the base
 * plan, so a manager only overrides what is different about that situation.
 */
export const PHASE_KEYS: Record<Phase, (keyof TacticalParams)[]> = {
  IN_POSSESSION: [
    'tempo',
    'directness',
    'attackingWidth',
    'buildUpShortness',
    'passingRisk',
    'finalThirdPatience',
    'crossFrequency',
    'throughBallFrequency',
    'overlapFrequency',
    'forwardRunFrequency',
    'restDefence',
  ],
  ATTACKING_TRANSITION: [
    'counterAttackIntensity',
    'transitionSpeed',
    'directness',
    'forwardRunFrequency',
    'passingRisk',
  ],
  OUT_OF_POSSESSION: [
    'defensiveLine',
    'blockHeight',
    'pressingIntensity',
    'pressingCompactness',
    'defensiveWidth',
    'offsideTrap',
  ],
  DEFENSIVE_TRANSITION: ['counterPressIntensity', 'regroupPriority', 'restDefence'],
}

/** A full plan: one base setting plus what changes in each situation. */
export interface PhasedTactics {
  base: TacticalParams
  byPhase?: Partial<Record<Phase, Partial<TacticalParams>>>
}

export function phasedFrom(base: TacticalParams, byPhase?: PhasedTactics['byPhase']): PhasedTactics {
  return { base: normalizeParams(base), byPhase }
}

/** The parameters that apply in one situation. */
export function paramsForPhase(plan: PhasedTactics, phase: Phase): TacticalParams {
  const override = plan.byPhase?.[phase]
  if (!override) return plan.base
  const allowed = new Set(PHASE_KEYS[phase])
  const merged = { ...plan.base }
  for (const key of PARAM_KEYS) {
    const value = override[key]
    // A phase may only change what it owns; anything else stays on the plan.
    if (typeof value === 'number' && allowed.has(key)) merged[key] = value
  }
  return normalizeParams(merged)
}

export function normalizePhased(value: unknown): PhasedTactics {
  if (!value || typeof value !== 'object') return { base: { ...DEFAULT_PARAMS } }
  const plan = value as Partial<PhasedTactics>
  const base = normalizeParams(plan.base as Partial<TacticalParams>)
  if (!plan.byPhase || typeof plan.byPhase !== 'object') return { base }

  const byPhase: PhasedTactics['byPhase'] = {}
  for (const phase of PHASES) {
    const override = (plan.byPhase as Record<string, unknown>)[phase]
    if (!override || typeof override !== 'object') continue
    const kept: Partial<TacticalParams> = {}
    for (const key of PHASE_KEYS[phase]) {
      const raw = (override as Record<string, unknown>)[key]
      if (typeof raw === 'number') kept[key] = Math.max(0, Math.min(100, raw))
    }
    if (Object.keys(kept).length > 0) byPhase[phase] = kept
  }
  return Object.keys(byPhase).length > 0 ? { base, byPhase } : { base }
}

/** True when this situation is played differently from the base plan. */
export function phaseDiffers(plan: PhasedTactics, phase: Phase): boolean {
  const override = plan.byPhase?.[phase]
  if (!override) return false
  return PHASE_KEYS[phase].some(
    (key) => typeof override[key] === 'number' && override[key] !== plan.base[key],
  )
}
