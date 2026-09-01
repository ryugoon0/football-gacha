import { FORMATIONS } from './formations'
import { POSITION_GROUP } from './players'
import type { LeagueTeam } from './league'
import type { SlotEvaluation, SquadRating } from './squad'
import { DEFAULT_TACTIC, tacticEffects, type TacticSetup } from './tactics'
import { NO_TRAIT_EFFECTS, type TraitEffects } from './traits'
import type { FormationKey, MatchEvent, MatchResult, Position } from './types'

export type Venue = 'home' | 'away' | 'neutral'

/** Rating bump for playing at home. */
export const HOME_ADVANTAGE = 3
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
  division: number
  venue: Venue
  tactic: TacticSetup
  traits?: TraitEffects
  /** Our eleven, for the pitch view. Empty when running headless. */
  homeShape?: DotAnchor[]
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
  /** How much each starter has left in the tank, 0-100, by card uid. */
  stamina: Record<string, number>
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
const STAMINA_DRAIN = 0.65
/** A keeper barely runs, so they hold their legs. */
const KEEPER_DRAIN = 0.2
/** Below this a starter is worth pulling off mid match. */
export const LIVE_TIRED = 55

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
    stamina: seedStamina(setup.team.evaluations),
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

/** Recomputed every tick so a tactical change takes effect immediately. */
export function strengthOf(setup: MatchSetup, rng: () => number, fitness = 1): Strength {
  const plan = tacticEffects(setup.tactic ?? DEFAULT_TACTIC)
  const traits = setup.traits ?? NO_TRAIT_EFFECTS
  const homeBonus = setup.venue === 'home' ? HOME_ADVANTAGE : 0
  const awayBonus = setup.venue === 'away' ? HOME_ADVANTAGE : 0
  const bigGame = setup.venue === 'neutral' ? traits.cup : 0
  const hiddenEdge = setup.team.hidden / 2

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
  // Legs go first: every minute on the pitch costs condition, and a pressing,
  // fast tempo costs more. Fresh substitutes lift the average straight away.
  const fatigue = tacticEffects(setup.tactic ?? DEFAULT_TACTIC).fatigue
  const stamina = seedStamina(setup.team.evaluations, state.stamina)
  for (const item of setup.team.evaluations) {
    if (!item.card) continue
    const drain = (item.slotPosition === 'GK' ? KEEPER_DRAIN : STAMINA_DRAIN) * fatigue
    stamina[item.card.uid] = clamp(stamina[item.card.uid] - drain, 5, 100)
  }
  const strength = strengthOf(
    setup,
    rng,
    staminaFactor(averageStamina({ ...state, stamina }, setup.team.evaluations)),
  )
  const traits = setup.traits ?? NO_TRAIT_EFFECTS
  const events = [...state.events]
  let { scoreFor, scoreAgainst, shotsFor, shotsAgainst, possession, ball } = state
  const possessionTicks = { ...state.possessionTicks }
  const scorerUids = [...state.scorerUids]
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

  const share = strength.myMid / (strength.myMid + strength.oppMid)
  possession = rng() < share ? 'home' : 'away'
  possessionTicks[possession] += 1

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

  if (!stoppage && rng() < strength.chanceRate) {
    const weAttack = possession === 'home'
    const att = weAttack ? strength.myAtt : strength.oppAtt
    const def = weAttack ? strength.oppDef : strength.myDef
    const side: 'home' | 'away' = weAttack ? 'home' : 'away'
    if (weAttack) shotsFor++
    else shotsAgainst++

    const swing = weAttack ? traits.goal + setup.team.hidden * 0.002 : -traits.concede
    const goalChance = clamp(0.22 + (att - def) / 150 + swing, 0.06, 0.6)
    const shooter = weAttack
      ? pickScorer(setup.team.evaluations, rng)
      : { name: OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)], uid: null, slotId: null }

    ball = { x: clamp(ball.x + (rng() * 20 - 10), 20, 80), y: weAttack ? 94 : 6 }

    if (rng() < goalChance) {
      if (weAttack) {
        scoreFor++
        if (shooter.uid) scorerUids.push(shooter.uid)
      } else {
        scoreAgainst++
      }
      events.push({
        minute,
        type: 'goal',
        side,
        text: `⚽ ${shooter.name} 골! ${scoreFor} : ${scoreAgainst}`,
      })
      stoppage = { kind: 'goal', ticksLeft: STOPPAGE_TICKS.goal, text: '골! 경기 재개 준비' }
    } else if (rng() < 0.5) {
      const keeper = weAttack ? `${setup.opponent.name} 골키퍼` : keeperName(setup.team.evaluations)
      events.push({
        minute,
        type: 'save',
        side,
        text: `${shooter.name}의 슈팅, ${keeper}가 선방합니다.`,
      })
      stoppage = { kind: 'out', ticksLeft: STOPPAGE_TICKS.out, text: '코너킥 준비' }
    } else {
      events.push({
        minute,
        type: 'chance',
        side,
        text: `${shooter.name}의 슈팅이 골대를 살짝 빗나갑니다.`,
      })
      stoppage = { kind: 'out', ticksLeft: STOPPAGE_TICKS.out, text: '골킥 준비' }
    }
  } else if (!stoppage && rng() < strength.foulRate) {
    const fouler =
      possession === 'home'
        ? OPPONENT_PLAYERS[Math.floor(rng() * OPPONENT_PLAYERS.length)]
        : (pickScorer(setup.team.evaluations, rng).name ?? '우리 선수')
    events.push({
      minute,
      type: 'foul',
      side: possession === 'home' ? 'away' : 'home',
      text: `${fouler}의 파울, 경기가 잠시 멈춥니다.`,
    })
    stoppage = { kind: 'foul', ticksLeft: STOPPAGE_TICKS.foul, text: '파울 — 프리킥 준비' }
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
    stamina,
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

export function toResult(state: LiveMatchState, setup: MatchSetup): MatchResult {
  return {
    opponent: setup.opponent.name,
    scorerUids: state.scorerUids,
    opponentRating: setup.opponent.rating,
    scoreFor: state.scoreFor,
    scoreAgainst: state.scoreAgainst,
    result: matchOutcome(state),
    events: state.events,
    reward: 0,
    possession: possessionPercent(state),
    shotsFor: state.shotsFor,
    shotsAgainst: state.shotsAgainst,
  }
}
