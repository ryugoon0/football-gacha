import { FORMATIONS } from './formations'
import { KNOBS, tune } from './tuning'
import { POSITION_GROUP } from './players'
import type { LeagueTeam } from './league'
import type { SlotEvaluation, SquadRating } from './squad'
import { DEFAULT_TACTIC, tacticEffects, type TacticSetup } from './tactics'
import { opponentParams, opponentProfile, paramsFromSetup } from './tactics/bridge'
import { emptyMetrics, type MatchMetrics } from './tactics/metrics'
import type { TacticalParams } from './tactics/params'
import { squadProfile, type SquadProfile } from './tactics/profile'
import { resolveCounter, resolveSequence, type SideModel } from './tactics/sequence'
import { deriveTacticalState } from './tactics/state'
import {
  paramsForPhase,
  phasedFrom,
  type Phase,
  type PhasedTactics,
} from './tactics/phases'
import { NO_TRAIT_EFFECTS, type TraitEffects } from './traits'
import type { FormationKey, MatchEvent, MatchResult, Position } from './types'

export type Venue = 'home' | 'away' | 'neutral'

/**
 * Bumped whenever a change to this file (or anything it calls into for
 * match resolution) could shift outcomes. A result carries the version it
 * was produced under, so replaying a seed later is never silently compared
 * against a different engine and mistaken for a reproduction.
 */
export const ENGINE_VERSION = 'match-engine-20260903-1'

/** Rating bump for playing at home. */
export const HOME_ADVANTAGE = KNOBS.homeAdvantage.default
/** How long play is halted, in ticks. */
const STOPPAGE_TICKS: Record<StoppageKind, number> = {
  goal: 3,
  foul: 2,
  out: 1,
  half: 3,
}

export type StoppageKind = 'goal' | 'foul' | 'out' | 'half'

export interface DotAnchor {
  id: string
  label: string
  /** Anchor position in pitch percent; y = 0 is our own goal line. */
  x: number
  y: number
  role: Position
}

export interface Dot extends DotAnchor {
  /** Live position, moved towards the ball. */
  liveX: number
  liveY: number
}

export interface MatchSetup {
  team: SquadRating
  teamName: string
  opponent: LeagueTeam
  /**
   * A real card-based squad for the opponent, for PvP. When present, this
   * side is judged from actual cards — strength, tactical profile, scorers,
   * stamina — the same way `team` is, instead of the rating-only stand-in
   * `opponent` normally produces. `opponent` itself is kept regardless (its
   * `name`/`rating` still label the fixture), so every non-PvP call site
   * (casual mode, AI league opponents) needs no change at all.
   */
  opponentSquad?: SquadRating
  /** Display name for a real PvP opponent — defaults to opponent.name when absent. */
  opponentName?: string
  division: number
  venue: Venue
  tactic: TacticSetup
  traits?: TraitEffects
  /** Real traits for opponentSquad — team.traits' counterpart. */
  opponentTraits?: TraitEffects
  /** Our eleven, for the pitch view. Empty when running headless. */
  homeShape?: DotAnchor[]
  /**
   * Full tactical parameters. Defaults to whatever the four dials in `tactic`
   * translate to, so the game screen needs no changes; simulations and a future
   * slider UI can pass the detail straight in.
   */
  params?: TacticalParams
  /**
   * A full plan: base settings plus what changes in each of the four match
   * situations. Takes precedence over `params`, which takes precedence over the
   * four dials in `tactic`.
   */
  phased?: PhasedTactics
  /** Opponent style and squad shape, for calibration and balance runs. */
  opponentTactics?: { params?: TacticalParams; phased?: PhasedTactics; profile?: SquadProfile }
  formationKey?: FormationKey
}

export interface Stoppage {
  kind: StoppageKind
  ticksLeft: number
  text: string
}

export interface LiveMatchState {
  minute: number
  phase: 'kickoff' | 'play' | 'stoppage' | 'full'
  stoppage: Stoppage | null
  possession: 'home' | 'away'
  ball: { x: number; y: number }
  home: Dot[]
  away: Dot[]
  scoreFor: number
  scoreAgainst: number
  shotsFor: number
  shotsAgainst: number
  possessionTicks: { home: number; away: number }
  events: MatchEvent[]
  scorerUids: string[]
  /** Only ever filled when opponentSquad is a real squad (PvP). */
  opponentScorerUids: string[]
  /** How much each starter has left in the tank, 0-100, by card uid. */
  stamina: Record<string, number>
  /** Stamina for opponentSquad's eleven, same shape, only used in PvP. */
  opponentStamina: Record<string, number>
  /** What the match produced, per side. The tactics engine fills this in. */
  metrics: MatchMetrics
  finished: boolean
}

const OPPONENT_PLAYERS = [
  '카를로스',
  '반더스',
  '오카다',
  '실바',
  '뮐러',
  '두산',
  '페레즈',
  '리베로',
  '가브리엘',
  '노바크',
]

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** Condition a starter loses per minute at a normal tempo. */
/** Default; the operator can change it. Read through tune() at use sites. */
const STAMINA_DRAIN = KNOBS.staminaDrain.default
/** A keeper barely runs, so they hold their legs. */
const KEEPER_DRAIN = KNOBS.keeperDrain.default
/** Below this a starter is worth pulling off mid match. */
export const LIVE_TIRED = KNOBS.liveTired.default

/** Seeds the tank from each starter's pre match condition. */
function seedStamina(evaluations: SlotEvaluation[], current: Record<string, number> = {}): Record<string, number> {
  const stamina = { ...current }
  for (const item of evaluations) {
    if (!item.card) continue
    if (stamina[item.card.uid] === undefined) stamina[item.card.uid] = item.condition
  }
  return stamina
}

/** Legs left across the eleven, 0-100. Used for the tiredness penalty. */
export function averageStamina(state: LiveMatchState, evaluations: SlotEvaluation[]): number {
  const values = evaluations
    .filter((item) => item.card)
    .map((item) => state.stamina[item.card!.uid] ?? item.condition)
  if (values.length === 0) return 100
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Tired legs cost up to 15% of our rating over a full match. */
export function staminaFactor(average: number): number {
  return 0.85 + 0.15 * clamp(average, 0, 100) / 100
}

/** Mirror of a 4-4-2 used to draw the opposition. */
function awayShape(): DotAnchor[] {
  const rows: [Position, number, number][] = [
    ['GK', 50, 6],
    ['LB', 16, 26],
    ['CB', 38, 22],
    ['CB', 62, 22],
    ['RB', 84, 26],
    ['LM', 16, 50],
    ['CM', 38, 46],
    ['CM', 62, 46],
    ['RM', 84, 50],
    ['ST', 40, 74],
    ['ST', 60, 74],
  ]
  return rows.map(([role, x, y], index) => ({
    id: `away-${index}`,
    label: `${index + 1}`,
    role,
    // Away anchors are described from their own goal, so flip them onto our pitch.
    x: 100 - x,
    y: 100 - y,
  }))
}

export function shapeFromSquad(
  formationKey: FormationKey,
  evaluations: SlotEvaluation[],
): DotAnchor[] {
  const formation = FORMATIONS[formationKey] ?? FORMATIONS['4-3-3']
  return formation.slots.map((slot) => {
    const evaluation = evaluations.find((item) => item.slotId === slot.id)
    return {
      id: slot.id,
      label: evaluation?.player?.name ?? slot.position,
      role: slot.position,
      x: slot.x,
      y: slot.y,
    }
  })
}

function toDots(anchors: DotAnchor[]): Dot[] {
  return anchors.map((anchor) => ({ ...anchor, liveX: anchor.x, liveY: anchor.y }))
}

/** Players drift towards the ball without leaving their zone. */
function drift(dots: Dot[], ball: { x: number; y: number }, rng: () => number): Dot[] {
  return dots.map((dot) => {
    const pull = dot.role === 'GK' ? 0.06 : POSITION_GROUP[dot.role] === 'DF' ? 0.18 : 0.26
    return {
      ...dot,
      liveX: clamp(dot.x + (ball.x - dot.x) * pull + (rng() * 6 - 3), 2, 98),
      liveY: clamp(dot.y + (ball.y - dot.y) * pull + (rng() * 6 - 3), 2, 98),
    }
  })
}

function pickScorer(
  evaluations: SlotEvaluation[],
  rng: () => number,
): { name: string; uid: string | null; slotId: string | null } {
  const candidates = evaluations.filter(
    (item) => item.player && !item.injured && POSITION_GROUP[item.slotPosition] !== 'GK',
  )
  if (candidates.length === 0) return { name: '유스 선수', uid: null, slotId: null }
  const weights = candidates.map((item) => {
    const group = POSITION_GROUP[item.slotPosition]
    const bias = group === 'FW' ? 6 : group === 'MF' ? 3 : 1
    return bias * (item.player!.stats.sho / 50 + 0.4)
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) {
      return {
        name: candidates[i].player!.name,
        uid: candidates[i].card!.uid,
        slotId: candidates[i].slotId,
      }
    }
  }
  const last = candidates[candidates.length - 1]
  return { name: last.player!.name, uid: last.card!.uid, slotId: last.slotId }
}

function keeperName(evaluations: SlotEvaluation[]): string {
  return evaluations.find((item) => item.slotPosition === 'GK')?.player?.name ?? '유스 골키퍼'
}

export function createMatch(setup: MatchSetup): LiveMatchState {
  const venueLabel =
    setup.venue === 'home' ? '홈' : setup.venue === 'away' ? '원정' : '중립'
  return {
    minute: 0,
    phase: 'kickoff',
    stoppage: null,
    possession: 'home',
    ball: { x: 50, y: 50 },
    home: toDots(setup.homeShape ?? []),
    away: toDots(setup.homeShape ? awayShape() : []),
    scoreFor: 0,
    scoreAgainst: 0,
    shotsFor: 0,
    shotsAgainst: 0,
    possessionTicks: { home: 0, away: 0 },
    events: [
      {
        minute: 0,
        type: 'kickoff',
        side: 'home',
        text: `${setup.teamName} 대 ${setup.opponent.name} (${venueLabel}), 킥오프!`,
      },
    ],
    scorerUids: [],
    opponentScorerUids: [],
    stamina: seedStamina(setup.team.evaluations),
    opponentStamina: setup.opponentSquad ? seedStamina(setup.opponentSquad.evaluations) : {},
    metrics: emptyMetrics(),
    finished: false,
  }
}

interface Strength {
  myAtt: number
  myDef: number
  myMid: number
  oppAtt: number
  oppDef: number
  oppMid: number
  chanceRate: number
  foulRate: number
}

/**
 * Recomputed every tick so a tactical change takes effect immediately.
 * `oppFitness` mirrors `fitness` for a real PvP opponent (their own legs,
 * from their own stamina) — it does nothing when there is no `opponentSquad`.
 */
export function strengthOf(
  setup: MatchSetup,
  rng: () => number,
  fitness = 1,
  oppFitness = 1,
): Strength {
  const plan = tacticEffects(setup.tactic ?? DEFAULT_TACTIC)
  const traits = setup.traits ?? NO_TRAIT_EFFECTS
  const homeBonus = setup.venue === 'home' ? tune('homeAdvantage') : 0
  const awayBonus = setup.venue === 'away' ? tune('homeAdvantage') : 0
  const bigGame = setup.venue === 'neutral' ? traits.cup : 0
  const hiddenEdge = setup.team.hidden / 2

  if (setup.opponentSquad) {
    // Real PvP squad: their own att/def/mid (already team-colour and
    // chemistry adjusted by evaluateSquad, same as ours) instead of a
    // single rating number, and their own hidden-stat edge.
    const oppHiddenEdge = setup.opponentSquad.hidden / 2
    const oppBigGame = setup.venue === 'neutral' ? (setup.opponentTraits ?? NO_TRAIT_EFFECTS).cup : 0
    return {
      myAtt: (setup.team.att * plan.att + homeBonus + bigGame + hiddenEdge) * fitness,
      myDef: (setup.team.def * plan.def + homeBonus + bigGame + hiddenEdge) * fitness,
      myMid: (setup.team.mid + homeBonus + bigGame + hiddenEdge) * fitness,
      oppAtt: (setup.opponentSquad.att + awayBonus + oppBigGame + oppHiddenEdge) * oppFitness,
      oppDef: (setup.opponentSquad.def + awayBonus + oppBigGame + oppHiddenEdge) * oppFitness,
      oppMid: (setup.opponentSquad.mid + awayBonus + oppBigGame + oppHiddenEdge) * oppFitness,
      chanceRate: 0.13 * plan.chance * traits.tempo,
      foulRate: 0.05 * plan.foul,
    }
  }

  return {
    myAtt: (setup.team.att * plan.att + homeBonus + bigGame + hiddenEdge) * fitness,
    myDef: (setup.team.def * plan.def + homeBonus + bigGame + hiddenEdge) * fitness,
    myMid: (setup.team.mid + homeBonus + bigGame + hiddenEdge) * fitness,
    oppAtt: setup.opponent.rating + awayBonus + plan.counterRisk + (rng() * 6 - 3),
    oppDef: setup.opponent.rating + awayBonus + (rng() * 6 - 3),
    oppMid: setup.opponent.rating + awayBonus + (rng() * 6 - 3),
    chanceRate: 0.13 * plan.chance * traits.tempo,
    foulRate: 0.05 * plan.foul,
  }
}

/** One side, ready to be read in whichever situation the ball is in. */
interface PhasedSide {
  plan: PhasedTactics
  inPhase: (phase: Phase) => SideModel
}

interface Models {
  home: PhasedSide
  away: PhasedSide
}

/**
 * Both sides as the tactics engine sees them. Ours comes from the eleven on
 * the pitch; the opponent's from their rating and a style drawn from their
 * name (so a league side plays the same way all season) — unless a real
 * `opponentSquad` is given, in which case their profile comes from their
 * own eleven exactly like ours does.
 */
function buildModels(
  setup: MatchSetup,
  strength: Strength,
  fatigue: number,
  opponentFatigue = fatigue * 0.7,
): Models {
  const ourPlan =
    setup.phased ??
    phasedFrom(setup.params ?? paramsFromSetup(setup.tactic ?? DEFAULT_TACTIC))
  const ourProfile = squadProfile(setup.team.evaluations)
  const theirPlan =
    setup.opponentTactics?.phased ??
    phasedFrom(
      setup.opponentTactics?.params ??
        (setup.opponentSquad ? paramsFromSetup(DEFAULT_TACTIC) : opponentParams(setup.opponent)),
    )
  const theirProfile =
    setup.opponentTactics?.profile ??
    (setup.opponentSquad ? squadProfile(setup.opponentSquad.evaluations) : opponentProfile(setup.opponent))

  /** Derived state is cached per phase — a match asks for the same few. */
  const sideFor = (
    plan: PhasedTactics,
    profile: SquadProfile,
    tiredness: number,
    attack: number,
    defence: number,
  ): PhasedSide => {
    const cache = new Map<Phase, SideModel>()
    return {
      plan,
      inPhase: (phase: Phase) => {
        const hit = cache.get(phase)
        if (hit) return hit
        const params = paramsForPhase(plan, phase)
        const model: SideModel = {
          params,
          profile,
          state: deriveTacticalState(params, profile, tiredness),
          attack,
          defence,
        }
        cache.set(phase, model)
        return model
      },
    }
  }

  return {
    home: sideFor(ourPlan, ourProfile, fatigue, strength.myAtt, strength.myDef),
    // Without a real squad the opponent's fatigue is a flat discount off
    // ours (they tire too, but we do not track their legs individually).
    // With one, opponentFatigue is their own, computed from opponentStamina.
    away: sideFor(theirPlan, theirProfile, opponentFatigue, strength.oppAtt, strength.oppDef),
  }
}

/**
 * Advances the match by one tick. Play stops on goals, fouls, the ball going
 * out and half time — the only moments a manager may step in.
 */
export function advance(
  state: LiveMatchState,
  setup: MatchSetup,
  rng: () => number = Math.random,
): LiveMatchState {
  if (state.finished) return state

  // A stoppage burns ticks without using up match minutes.
  if (state.stoppage) {
    const ticksLeft = state.stoppage.ticksLeft - 1
    if (ticksLeft > 0) {
      return { ...state, stoppage: { ...state.stoppage, ticksLeft } }
    }
    return {
      ...state,
      stoppage: null,
      phase: 'play',
      ball: { x: 50, y: 50 },
      home: drift(state.home, { x: 50, y: 50 }, rng),
      away: drift(state.away, { x: 50, y: 50 }, rng),
    }
  }

  const minute = state.minute + 1
  const opponentEvaluations = setup.opponentSquad?.evaluations ?? []

  // Tiredness is read from the tick just gone, so the tactical model and the
  // legs it depends on stay in step without a circular calculation.
  const teamFatigue = 1 - clamp(averageStamina(state, setup.team.evaluations) / 100, 0, 1)
  const preOpponentFatigue = setup.opponentSquad
    ? 1 - clamp(averageStamina({ ...state, stamina: state.opponentStamina }, opponentEvaluations) / 100, 0, 1)
    : undefined
  const preStrength = strengthOf(
    setup,
    rng,
    staminaFactor(averageStamina(state, setup.team.evaluations)),
    setup.opponentSquad
      ? staminaFactor(averageStamina({ ...state, stamina: state.opponentStamina }, opponentEvaluations))
      : 1,
  )
  const models = buildModels(setup, preStrength, teamFatigue, preOpponentFatigue)

  // Legs go first: every minute on the pitch costs condition, and pressing,
  // sprinting and a fast tempo cost more. Fresh substitutes lift the average.
  const fatigue = models.home.inPhase('IN_POSSESSION').state.fatigueDraw
  const stamina = seedStamina(setup.team.evaluations, state.stamina)
  let staminaSpent = 0
  for (const item of setup.team.evaluations) {
    if (!item.card) continue
    const drain = (item.slotPosition === 'GK' ? tune('keeperDrain') : tune('staminaDrain')) * fatigue
    const before = stamina[item.card.uid]
    stamina[item.card.uid] = clamp(before - drain, 5, 100)
    staminaSpent += before - stamina[item.card.uid]
  }

  // Same treatment for a real PvP opponent — their own legs, drained by
  // their own tactical fatigue draw, not a flat discount off ours.
  let opponentStamina = state.opponentStamina
  if (setup.opponentSquad) {
    const opponentFatigueDraw = models.away.inPhase('IN_POSSESSION').state.fatigueDraw
    opponentStamina = seedStamina(opponentEvaluations, state.opponentStamina)
    for (const item of opponentEvaluations) {
      if (!item.card) continue
      const drain =
        (item.slotPosition === 'GK' ? tune('keeperDrain') : tune('staminaDrain')) * opponentFatigueDraw
      opponentStamina[item.card.uid] = clamp(opponentStamina[item.card.uid] - drain, 5, 100)
    }
  }

  const strength = strengthOf(
    setup,
    rng,
    staminaFactor(averageStamina({ ...state, stamina }, setup.team.evaluations)),
    setup.opponentSquad
      ? staminaFactor(averageStamina({ ...state, stamina: opponentStamina }, opponentEvaluations))
      : 1,
  )
  const traits = setup.traits ?? NO_TRAIT_EFFECTS
  const opponentTraits = setup.opponentTraits
  const events = [...state.events]
  let { scoreFor, scoreAgainst, shotsFor, shotsAgainst, possession, ball } = state
  const possessionTicks = { ...state.possessionTicks }
  const scorerUids = [...state.scorerUids]
  const opponentScorerUids = [...state.opponentScorerUids]
  let stoppage: Stoppage | null = null

  if (minute > 90) {
    events.push({
      minute: 90,
      type: 'full',
      side: 'home',
      text: `경기 종료 — ${setup.teamName} ${scoreFor} : ${scoreAgainst} ${setup.opponent.name}`,
    })
    return { ...state, minute: 90, phase: 'full', finished: true, events }
  }

  const metrics = {
    home: { ...state.metrics.home },
    away: { ...state.metrics.away },
  }

  // Who has the ball is a contest, not a rating comparison: a side that plays
  // short and keeps its shape holds it, a side that hits it long gives it up.
  const ratingShare = strength.myMid / (strength.myMid + strength.oppMid)
  const homeBall = models.home.inPhase('IN_POSSESSION')
  const awayBall = models.away.inPhase('IN_POSSESSION')
  const tacticalShare = clamp(
    0.5 +
      (homeBall.state.buildUpControl - awayBall.state.buildUpControl) * 0.3 +
      (homeBall.params.buildUpShortness - awayBall.params.buildUpShortness) / 100 * 0.2 -
      (homeBall.state.bypassPress - awayBall.state.bypassPress) * 0.18,
    0.15,
    0.85,
  )
  const share = clamp(ratingShare * 0.55 + tacticalShare * 0.45, 0.18, 0.82)
  possession = rng() < share ? 'home' : 'away'
  possessionTicks[possession] += 1
  metrics[possession].possessionTicks += 1
  metrics.home.staminaUsed += staminaSpent

  // The ball drifts towards whoever is on the ball.
  const target = possession === 'home' ? 78 : 22
  ball = {
    x: clamp(ball.x + (rng() * 40 - 20), 8, 92),
    y: clamp(ball.y + (target - ball.y) * 0.45 + (rng() * 16 - 8), 5, 95),
  }

  if (minute === 45) {
    events.push({
      minute,
      type: 'half',
      side: 'home',
      text: `전반 종료 — ${scoreFor} : ${scoreAgainst}`,
    })
    stoppage = { kind: 'half', ticksLeft: STOPPAGE_TICKS.half, text: '하프타임' }
  }

  // --- the tactical model runs the move ------------------------------------
  const attackerSide: 'home' | 'away' = possession
  const defenderSide: 'home' | 'away' = possession === 'home' ? 'away' : 'home'
  // Each side is read in the situation it is actually in.
  const attacker = models[attackerSide].inPhase('IN_POSSESSION')
  const defender = models[defenderSide].inPhase('OUT_OF_POSSESSION')

  /** Turns one resolved move into events, metrics and, sometimes, a goal. */
  const playShot = (
    side: 'home' | 'away',
    quality: number,
    route: string,
    counter: boolean,
  ) => {
    const weAttack = side === 'home'
    if (weAttack) shotsFor++
    else shotsAgainst++
    metrics[side].shots += 1
    metrics[side].xg += quality
    if (counter) metrics[side].counterAttacks += 1
    if (route === 'wide') metrics[side].crosses += 1
    if (route === 'through') metrics[side].throughBalls += 1

    const att = weAttack ? strength.myAtt : strength.oppAtt
    const def = weAttack ? strength.oppDef : strength.myDef
    const keeper = (weAttack ? models.away : models.home).inPhase('OUT_OF_POSSESSION').profile
      .keeperShotStopping
    // Each side's own goal/concede trait and hidden edge apply to their own
    // shots — with no real opponent squad, opponentTraits is undefined and
    // this collapses back to exactly the original one-sided formula.
    const swing = weAttack
      ? traits.goal + setup.team.hidden * 0.002 - (opponentTraits?.concede ?? 0)
      : (opponentTraits ? opponentTraits.goal + (setup.opponentSquad?.hidden ?? 0) * 0.002 : 0) - traits.concede
    // Player quality still decides the duel; the tactic decided the opening.
    const ratingEdge = 1 + (att - def) / 160
    const goalChance = clamp(quality * ratingEdge * (1.15 - keeper / 200) + swing, 0.02, 0.8)

    const shooter = weAttack
      ? pickScorer(setup.team.evaluations, rng)
      : setup.opponentSquad
        ? pickScorer(setup.opponentSquad.evaluations, rng)
        : { name: OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)], uid: null, slotId: null }

    ball = { x: clamp(ball.x + (rng() * 20 - 10), 20, 80), y: weAttack ? 94 : 6 }

    if (rng() < goalChance) {
      metrics[side].shotsOnTarget += 1
      if (weAttack) {
        scoreFor++
        if (shooter.uid) scorerUids.push(shooter.uid)
      } else {
        scoreAgainst++
        if (shooter.uid) opponentScorerUids.push(shooter.uid)
      }
      events.push({
        minute,
        type: 'goal',
        side,
        text: `⚽ ${shooter.name} 골! ${scoreFor} : ${scoreAgainst}`,
      })
      stoppage = { kind: 'goal', ticksLeft: STOPPAGE_TICKS.goal, text: '골! 경기 재개 준비' }
      return
    }
    if (rng() < 0.5) {
      metrics[side].shotsOnTarget += 1
      const keeperName_ = weAttack
        ? setup.opponentSquad
          ? keeperName(setup.opponentSquad.evaluations)
          : `${setup.opponent.name} 골키퍼`
        : keeperName(setup.team.evaluations)
      events.push({
        minute,
        type: 'save',
        side,
        text: `${shooter.name}의 슈팅, ${keeperName_}가 선방합니다.`,
      })
      stoppage = { kind: 'out', ticksLeft: STOPPAGE_TICKS.out, text: '코너킥 준비' }
      return
    }
    events.push({
      minute,
      type: 'chance',
      side,
      text: `${shooter.name}의 슈팅이 골대를 살짝 빗나갑니다.`,
    })
    stoppage = { kind: 'out', ticksLeft: STOPPAGE_TICKS.out, text: '골킥 준비' }
  }

  // A tick is a move only some of the time; the rest is circulation. How often
  // a side actually goes for it is a tactical choice, not a fixed rate.
  const moveGate = clamp((0.5 + attacker.state.chanceFrequency * 0.8) * traits.tempo, 0.25, 1.1)

  if (!stoppage && rng() < moveGate) {
    const sequence = resolveSequence(
      attacker,
      defender,
      rng,
      // How we play in the six seconds after losing it.
      models[attackerSide].inPhase('DEFENSIVE_TRANSITION'),
    )

    metrics[attackerSide].passes += sequence.passes
    metrics[attackerSide].passesCompleted += sequence.completed
    metrics[attackerSide].longPasses += sequence.longPasses
    metrics[defenderSide].pressures += sequence.pressures
    metrics[defenderSide].defensiveActions += sequence.defensiveActions
    if (sequence.finalThird) {
      metrics[attackerSide].finalThirdEntries += 1
      metrics[attackerSide].progressions += 1
    }

    if (sequence.kind === 'chance' && sequence.shot) {
      playShot(attackerSide, sequence.shot.quality, sequence.shot.route, false)
    } else if (sequence.kind === 'foul') {
      const fouler =
        attackerSide === 'home'
          ? setup.opponentSquad
            ? pickScorer(setup.opponentSquad.evaluations, rng).name
            : OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)]
          : (pickScorer(setup.team.evaluations, rng).name ?? '우리 선수')
      metrics[defenderSide].fouls += 1
      events.push({
        minute,
        type: 'foul',
        side: defenderSide,
        text: `${fouler}의 파울, 경기가 잠시 멈춥니다.`,
      })
      stoppage = { kind: 'foul', ticksLeft: STOPPAGE_TICKS.foul, text: '파울 — 프리킥 준비' }
    } else if (sequence.kind === 'out') {
      stoppage = { kind: 'out', ticksLeft: STOPPAGE_TICKS.out, text: '스로인 준비' }
    } else if (sequence.kind === 'turnover' && sequence.turnover) {
      metrics[attackerSide].turnoversLost += 1
      if (sequence.pressBeaten) metrics[attackerSide].pressBeaten += 1
      if (sequence.turnover.counterPressed) {
        // Won straight back by the counter press — the ball never really left.
        metrics[attackerSide].highTurnovers += 1
        metrics[attackerSide].defensiveActions += 1
      } else if (sequence.turnover.high) {
        metrics[defenderSide].highTurnovers += 1
      }
      // Won it high with the other side committed? That is a break, and its
      // danger comes from the space they left, not from a counter bonus.
      if (sequence.turnover.counterable) {
        const counter = resolveCounter(
          models[defenderSide].inPhase('ATTACKING_TRANSITION'),
          models[attackerSide].inPhase('DEFENSIVE_TRANSITION'),
          sequence.turnover.high,
          rng,
        )
        metrics[defenderSide].passes += counter.passes
        metrics[defenderSide].passesCompleted += counter.completed
        metrics[attackerSide].defensiveActions += counter.defensiveActions
        if (counter.kind === 'chance' && counter.shot) {
          metrics[defenderSide].finalThirdEntries += 1
          playShot(defenderSide, counter.shot.quality, counter.shot.route, true)
        }
      }
    }
  }

  return {
    ...state,
    minute,
    phase: stoppage ? 'stoppage' : 'play',
    stoppage,
    possession,
    ball,
    home: drift(state.home, ball, rng),
    away: drift(state.away, ball, rng),
    scoreFor,
    scoreAgainst,
    shotsFor,
    shotsAgainst,
    possessionTicks,
    events,
    scorerUids,
    opponentScorerUids,
    stamina,
    opponentStamina,
    metrics,
  }
}

/** Both sides' derived tactical state, for the post match report. */
export function tacticalStates(setup: MatchSetup, fatigue = 0) {
  const models = buildModels(setup, strengthOf(setup, () => 0.5, 1), fatigue)
  return {
    ours: models.home.inPhase('IN_POSSESSION').state,
    theirs: models.away.inPhase('OUT_OF_POSSESSION').state,
  }
}

export function runToEnd(setup: MatchSetup, rng: () => number = Math.random): LiveMatchState {
  let state = createMatch(setup)
  let guard = 0
  while (!state.finished && guard++ < 2000) state = advance(state, setup, rng)
  return state
}

export function matchOutcome(state: LiveMatchState): 'W' | 'D' | 'L' {
  if (state.scoreFor > state.scoreAgainst) return 'W'
  return state.scoreFor === state.scoreAgainst ? 'D' : 'L'
}

export function possessionPercent(state: LiveMatchState): number {
  const total = state.possessionTicks.home + state.possessionTicks.away
  if (total === 0) return 50
  return Math.round((state.possessionTicks.home / total) * 100)
}

export function toResult(
  state: LiveMatchState,
  setup: MatchSetup,
  meta: { seed: string; engineVersion?: string },
): MatchResult {
  return {
    opponent: setup.opponentSquad ? (setup.opponentName ?? setup.opponent.name) : setup.opponent.name,
    scorerUids: state.scorerUids,
    opponentScorerUids: state.opponentScorerUids,
    opponentRating: setup.opponent.rating,
    scoreFor: state.scoreFor,
    scoreAgainst: state.scoreAgainst,
    result: matchOutcome(state),
    events: state.events,
    reward: 0,
    possession: possessionPercent(state),
    shotsFor: state.shotsFor,
    shotsAgainst: state.shotsAgainst,
    seed: meta.seed,
    engineVersion: meta.engineVersion ?? ENGINE_VERSION,
  }
}
