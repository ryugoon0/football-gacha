import { hashString, seededRandom } from '../random'
import type { LeagueTeam } from '../league'
import { DEFAULT_PARAMS, withParams, type TacticalParams } from './params'
import { profileFrom, type SquadProfile } from './profile'
import type { TacticSetup } from '../tactics'

/**
 * The four dials the manager sees, written out as the full parameter set the
 * engine works with. The UI stays as it is; the simulation gets the detail.
 */
export function paramsFromSetup(setup: TacticSetup): TacticalParams {
  let params = { ...DEFAULT_PARAMS }

  if (setup.plan === 'attack') {
    params = withParams(params, {
      attackingWidth: 62,
      forwardRunFrequency: 72,
      restDefence: 32,
      finalThirdPatience: 42,
      passingRisk: 62,
      counterAttackIntensity: 55,
      crossFrequency: 58,
      overlapFrequency: 62,
    })
  } else if (setup.plan === 'defend') {
    params = withParams(params, {
      attackingWidth: 42,
      forwardRunFrequency: 30,
      restDefence: 72,
      finalThirdPatience: 60,
      passingRisk: 38,
      // A side sitting in wants the ball forward quickly when it gets it.
      counterAttackIntensity: 68,
      regroupPriority: 65,
      crossFrequency: 45,
      overlapFrequency: 30,
    })
  }

  if (setup.pressing === 'high') {
    params = withParams(params, {
      pressingIntensity: 85,
      counterPressIntensity: 80,
      blockHeight: 78,
      pressingCompactness: 72,
      regroupPriority: 25,
    })
  } else if (setup.pressing === 'low') {
    params = withParams(params, {
      pressingIntensity: 25,
      counterPressIntensity: 25,
      blockHeight: 32,
      pressingCompactness: 62,
      regroupPriority: 75,
    })
  }

  if (setup.line === 'high') {
    params = withParams(params, { defensiveLine: 78, offsideTrap: 62, defensiveWidth: 45 })
  } else if (setup.line === 'deep') {
    params = withParams(params, {
      defensiveLine: 26,
      offsideTrap: 20,
      defensiveWidth: 38,
      pressingCompactness: Math.max(params.pressingCompactness, 72),
    })
  }

  if (setup.tempo === 'fast') {
    params = withParams(params, {
      tempo: 82,
      directness: 62,
      transitionSpeed: 75,
      buildUpShortness: 40,
      finalThirdPatience: Math.max(0, params.finalThirdPatience - 15),
    })
  } else if (setup.tempo === 'slow') {
    params = withParams(params, {
      tempo: 30,
      directness: 38,
      transitionSpeed: 40,
      buildUpShortness: 68,
      finalThirdPatience: Math.min(100, params.finalThirdPatience + 15),
    })
  }

  return params
}

/**
 * League opponents are not squads of cards, only a rating. They still need a
 * style, so one is drawn from their name — stable across a season — and pulled
 * towards what a side of that level would realistically do.
 */
export function opponentParams(opponent: LeagueTeam): TacticalParams {
  const rng = seededRandom(hashString(`${opponent.id}:${opponent.name}:tactics`))
  const level = Math.max(0, Math.min(1, (opponent.rating - 45) / 45))
  const spread = (base: number, swing: number) =>
    Math.round(base + (rng() * 2 - 1) * swing)

  // Better sides press higher and keep the ball; weaker ones sit and counter.
  return withParams(DEFAULT_PARAMS, {
    tempo: spread(45 + level * 20, 12),
    directness: spread(70 - level * 30, 14),
    buildUpShortness: spread(30 + level * 45, 14),
    attackingWidth: spread(50, 16),
    finalThirdPatience: spread(40 + level * 20, 12),
    crossFrequency: spread(50, 18),
    throughBallFrequency: spread(50, 16),
    overlapFrequency: spread(45, 16),
    defensiveLine: spread(35 + level * 35, 12),
    blockHeight: spread(35 + level * 35, 12),
    pressingIntensity: spread(35 + level * 40, 14),
    pressingCompactness: spread(70 - level * 10, 10),
    defensiveWidth: spread(45, 12),
    counterPressIntensity: spread(30 + level * 45, 14),
    regroupPriority: spread(70 - level * 35, 14),
    counterAttackIntensity: spread(75 - level * 20, 14),
    transitionSpeed: spread(60, 14),
    forwardRunFrequency: spread(40 + level * 25, 12),
    restDefence: spread(60 - level * 15, 12),
  })
}

/** A flat profile at the opponent's level, so their rating still decides duels. */
export function opponentProfile(opponent: LeagueTeam): SquadProfile {
  const rng = seededRandom(hashString(`${opponent.id}:${opponent.name}:profile`))
  const base = opponent.rating
  const vary = (swing: number) => Math.max(20, Math.min(99, base + (rng() * 2 - 1) * swing))
  return profileFrom({
    defencePace: vary(9),
    defencePositioning: vary(7),
    defenceAerial: vary(8),
    defenceTackling: vary(7),
    keeperSweeping: vary(9),
    keeperShotStopping: vary(7),
    passingShort: vary(8),
    passingLong: vary(8),
    technique: vary(8),
    composure: vary(7),
    vision: vary(8),
    workRate: vary(7),
    acceleration: vary(9),
    stamina: vary(6),
    attackPace: vary(10),
    finishing: vary(9),
    attackAerial: vary(9),
    crossing: vary(8),
    overall: base,
  })
}
