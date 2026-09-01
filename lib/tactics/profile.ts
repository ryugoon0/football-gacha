import { POSITION_GROUP, effectiveStats } from '../players'
import type { SlotEvaluation } from '../squad'
import type { PositionGroup, Stats } from '../types'

/**
 * What the eleven on the pitch are actually good at, in the terms a tactic
 * cares about. Everything is 0-100 and comes from the players' own attributes,
 * so a style is only as good as the squad asked to play it.
 */
export interface SquadProfile {
  /** Centre backs who can defend space behind a high line. */
  defencePace: number
  defencePositioning: number
  defenceAerial: number
  defenceTackling: number
  /** Keeper coming out behind a high line. */
  keeperSweeping: number
  /** Keeper stopping what does get through. */
  keeperShotStopping: number
  /** Playing through pressure. */
  passingShort: number
  passingLong: number
  technique: number
  composure: number
  vision: number
  /** Running: pressing, counter pressing, overlaps. */
  workRate: number
  acceleration: number
  stamina: number
  /** Forwards. */
  attackPace: number
  finishing: number
  attackAerial: number
  crossing: number
  /** Average of everyone, used where no unit stands out. */
  overall: number
}

const NEUTRAL: SquadProfile = {
  defencePace: 50,
  defencePositioning: 50,
  defenceAerial: 50,
  defenceTackling: 50,
  keeperSweeping: 50,
  keeperShotStopping: 50,
  passingShort: 50,
  passingLong: 50,
  technique: 50,
  composure: 50,
  vision: 50,
  workRate: 50,
  acceleration: 50,
  stamina: 50,
  attackPace: 50,
  finishing: 50,
  attackAerial: 50,
  crossing: 50,
  overall: 50,
}

interface UnitStats {
  count: number
  stats: Stats
  /** Hidden consistency and stamina, averaged. */
  hiddenStamina: number
  hiddenConsistency: number
}

const emptyUnit = (): UnitStats => ({
  count: 0,
  stats: { pac: 0, sho: 0, pas: 0, dri: 0, def: 0, phy: 0 },
  hiddenStamina: 0,
  hiddenConsistency: 0,
})

const mean = (unit: UnitStats, key: keyof Stats, fallback: number): number =>
  unit.count > 0 ? unit.stats[key] / unit.count : fallback

/** Memoised per evaluation array — the eleven only changes on a substitution. */
const cache = new WeakMap<object, SquadProfile>()

export function squadProfile(evaluations: SlotEvaluation[]): SquadProfile {
  const cached = cache.get(evaluations as unknown as object)
  if (cached) return cached

  const units: Record<PositionGroup, UnitStats> = {
    GK: emptyUnit(),
    DF: emptyUnit(),
    MF: emptyUnit(),
    FW: emptyUnit(),
  }
  const all = emptyUnit()

  for (const item of evaluations) {
    if (!item.player || !item.card) continue
    const group = POSITION_GROUP[item.slotPosition]
    const stats = effectiveStats(item.player, item.card.level)
    for (const target of [units[group], all]) {
      target.count += 1
      target.stats.pac += stats.pac
      target.stats.sho += stats.sho
      target.stats.pas += stats.pas
      target.stats.dri += stats.dri
      target.stats.def += stats.def
      target.stats.phy += stats.phy
      target.hiddenStamina += item.player.hidden.stamina
      target.hiddenConsistency += item.player.hidden.consistency
    }
  }

  if (all.count === 0) {
    cache.set(evaluations as unknown as object, NEUTRAL)
    return NEUTRAL
  }

  const overall =
    (mean(all, 'pac', 50) +
      mean(all, 'sho', 50) +
      mean(all, 'pas', 50) +
      mean(all, 'dri', 50) +
      mean(all, 'def', 50) +
      mean(all, 'phy', 50)) /
    6

  // Hidden stamina is a 0-12 style bonus; fold it in gently.
  const hiddenStamina = all.count > 0 ? (all.hiddenStamina / all.count) * 2 : 0

  const profile: SquadProfile = {
    defencePace: mean(units.DF, 'pac', overall),
    defencePositioning: mean(units.DF, 'def', overall),
    defenceAerial: (mean(units.DF, 'phy', overall) + mean(units.DF, 'sho', overall) * 0.3) / 1.3,
    defenceTackling: mean(units.DF, 'def', overall),
    keeperSweeping: (mean(units.GK, 'pac', overall) + mean(units.GK, 'def', overall)) / 2,
    keeperShotStopping: (mean(units.GK, 'def', overall) * 0.7 + mean(units.GK, 'phy', overall) * 0.3),
    passingShort: (mean(units.MF, 'pas', overall) * 0.6 + mean(units.DF, 'pas', overall) * 0.4),
    passingLong: (mean(units.DF, 'pas', overall) * 0.5 + mean(units.MF, 'pas', overall) * 0.5),
    technique: (mean(all, 'dri', 50) * 0.6 + mean(all, 'pas', 50) * 0.4),
    composure: (mean(units.MF, 'dri', overall) + mean(units.DF, 'dri', overall)) / 2,
    vision: mean(units.MF, 'pas', overall),
    workRate: (mean(all, 'phy', 50) * 0.5 + mean(units.MF, 'phy', overall) * 0.5),
    acceleration: mean(all, 'pac', 50),
    stamina: Math.min(100, mean(all, 'phy', 50) * 0.8 + hiddenStamina),
    attackPace: mean(units.FW, 'pac', overall),
    finishing: mean(units.FW, 'sho', overall),
    attackAerial: (mean(units.FW, 'phy', overall) + mean(units.FW, 'sho', overall)) / 2,
    crossing: (mean(units.MF, 'pas', overall) * 0.5 + mean(units.FW, 'pas', overall) * 0.5),
    overall,
  }

  cache.set(evaluations as unknown as object, profile)
  return profile
}

/** Only used by tests and tools that need a squad with a known shape. */
export function profileFrom(overrides: Partial<SquadProfile>): SquadProfile {
  return { ...NEUTRAL, ...overrides }
}
