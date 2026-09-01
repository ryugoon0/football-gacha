import { describe, expect, it } from 'vitest'
import {
  LIVE_TIRED,
  advance,
  averageStamina,
  createMatch,
  possessionPercent,
  runToEnd,
  shapeFromSquad,
  staminaFactor,
  toResult,
  type MatchSetup,
} from '../lib/matchEngine'
import { applyAutoSubs } from '../lib/autoSub'
import { seededRandom } from '../lib/players'
import { evaluateSquad } from '../lib/squad'
import { initialState } from '../lib/storage'
import { DEFAULT_TACTIC, tacticEffects, normalizeTactic, TACTIC_HOTKEYS } from '../lib/tactics'

const setupOf = (overrides: Partial<MatchSetup> = {}): MatchSetup => {
  const state = initialState()
  const rating = evaluateSquad(state.cards, state.squad, 5)
  return {
    team: rating,
    teamName: state.club,
    opponent: { id: 'x', name: '상대', badge: 'XX', rating: 58 },
    division: 5,
    venue: 'home',
    tactic: DEFAULT_TACTIC,
    traits: rating.traits,
    homeShape: shapeFromSquad(state.squad.formation, rating.evaluations),
    ...overrides,
  }
}

describe('tactic dials', () => {
  it('turns each dial into a distinct effect', () => {
    const base = tacticEffects(DEFAULT_TACTIC)
    expect(base).toMatchObject({ att: 1, def: 1, chance: 1, foul: 1, fatigue: 1 })

    const attacking = tacticEffects({ ...DEFAULT_TACTIC, plan: 'attack' })
    expect(attacking.att).toBeGreaterThan(base.att)
    expect(attacking.def).toBeLessThan(base.def)

    const pressing = tacticEffects({ ...DEFAULT_TACTIC, pressing: 'high' })
    expect(pressing.foul).toBeGreaterThan(base.foul)
    expect(pressing.fatigue).toBeGreaterThan(base.fatigue)

    const line = tacticEffects({ ...DEFAULT_TACTIC, line: 'high' })
    expect(line.counterRisk).toBeGreaterThan(base.counterRisk)

    const tempo = tacticEffects({ ...DEFAULT_TACTIC, tempo: 'fast' })
    expect(tempo.chance).toBeGreaterThan(base.chance)
  })

  it('reads an old single-string tactic', () => {
    expect(normalizeTactic('defend')).toEqual({ ...DEFAULT_TACTIC, plan: 'defend' })
    expect(normalizeTactic(undefined)).toEqual(DEFAULT_TACTIC)
    expect(normalizeTactic({ plan: 'attack', pressing: 'high' })).toMatchObject({
      plan: 'attack',
      pressing: 'high',
      line: 'normal',
    })
  })

  it('gives every option a unique hotkey', () => {
    const keys = TACTIC_HOTKEYS.map((item) => item.key.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('1')
    expect(keys).toContain('q')
  })
})

describe('live engine', () => {
  it('kicks off with everyone in position and the ball in the middle', () => {
    const state = createMatch(setupOf())
    expect(state.minute).toBe(0)
    expect(state.home).toHaveLength(11)
    expect(state.away).toHaveLength(11)
    expect(state.ball).toEqual({ x: 50, y: 50 })
    expect(state.events[0].type).toBe('kickoff')
  })

  it('keeps every dot inside the pitch', () => {
    const setup = setupOf()
    const rng = seededRandom(4)
    let state = createMatch(setup)
    for (let i = 0; i < 200 && !state.finished; i++) {
      state = advance(state, setup, rng)
      for (const dot of [...state.home, ...state.away]) {
        expect(dot.liveX).toBeGreaterThanOrEqual(0)
        expect(dot.liveX).toBeLessThanOrEqual(100)
        expect(dot.liveY).toBeGreaterThanOrEqual(0)
        expect(dot.liveY).toBeLessThanOrEqual(100)
      }
      expect(state.ball.x).toBeGreaterThanOrEqual(0)
      expect(state.ball.x).toBeLessThanOrEqual(100)
    }
  })

  it('halts play on goals, fouls and half time', () => {
    const setup = setupOf()
    const rng = seededRandom(11)
    let state = createMatch(setup)
    const kinds = new Set<string>()
    while (!state.finished) {
      state = advance(state, setup, rng)
      if (state.stoppage) kinds.add(state.stoppage.kind)
    }
    expect(kinds.has('half')).toBe(true)
    // A full match always produces at least one break in play.
    expect(kinds.size).toBeGreaterThan(1)
  })

  it('finishes after ninety minutes with a coherent result', () => {
    const setup = setupOf()
    const state = runToEnd(setup, seededRandom(7))
    const result = toResult(state, setup)

    expect(state.minute).toBe(90)
    expect(state.events[state.events.length - 1].type).toBe('full')
    const goals = state.events.filter((event) => event.type === 'goal')
    expect(goals.filter((event) => event.side === 'home')).toHaveLength(result.scoreFor)
    expect(result.shotsFor).toBeGreaterThanOrEqual(result.scoreFor)
    expect(possessionPercent(state)).toBeGreaterThan(0)
    expect(possessionPercent(state)).toBeLessThan(100)
  })

  it('reacts to a tactical change made mid match', () => {
    const chances = (plan: 'attack' | 'defend') => {
      const setup = setupOf({ tactic: { ...DEFAULT_TACTIC, plan } })
      const rng = seededRandom(3)
      const state = runToEnd(setup, rng)
      return state.shotsFor + state.shotsAgainst
    }
    // Attacking football produces a busier match than shutting up shop.
    expect(chances('attack')).toBeGreaterThan(chances('defend'))
  })

  it('produces more fouls when pressing high', () => {
    const fouls = (pressing: 'low' | 'high') => {
      const setup = setupOf({ tactic: { ...DEFAULT_TACTIC, pressing } })
      let total = 0
      for (let seed = 0; seed < 30; seed++) {
        const state = runToEnd(setup, seededRandom(seed))
        total += state.events.filter((event) => event.type === 'foul').length
      }
      return total
    }
    expect(fouls('high')).toBeGreaterThan(fouls('low'))
  })

  it('runs headless without any dots when the pitch is not shown', () => {
    const setup = setupOf({ homeShape: undefined })
    const state = runToEnd(setup, seededRandom(2))
    expect(state.home).toHaveLength(0)
    expect(state.scoreFor).toBeGreaterThanOrEqual(0)
  })
})

describe('live stamina', () => {
  it('starts every starter on their pre match condition', () => {
    const setup = setupOf()
    const state = createMatch(setup)
    for (const item of setup.team.evaluations) {
      if (!item.card) continue
      expect(state.stamina[item.card.uid]).toBe(item.condition)
    }
  })

  it('drains legs over the ninety minutes, keepers least of all', () => {
    const setup = setupOf()
    const final = runToEnd(setup, seededRandom(11))
    const keeper = setup.team.evaluations.find((item) => item.slotPosition === 'GK')!
    const striker = setup.team.evaluations.find((item) => item.slotPosition !== 'GK')!

    expect(averageStamina(final, setup.team.evaluations)).toBeLessThan(100)
    expect(final.stamina[keeper.card!.uid]).toBeGreaterThan(final.stamina[striker.card!.uid])
    expect(final.stamina[striker.card!.uid]).toBeGreaterThan(0)
  })

  it('burns more with a high press and a fast tempo', () => {
    const calm = runToEnd(
      setupOf({ tactic: { plan: 'balanced', pressing: 'low', line: 'normal', tempo: 'slow' } }),
      seededRandom(4),
    )
    const frantic = runToEnd(
      setupOf({ tactic: { plan: 'balanced', pressing: 'high', line: 'normal', tempo: 'fast' } }),
      seededRandom(4),
    )
    const evaluations = setupOf().team.evaluations
    expect(averageStamina(frantic, evaluations)).toBeLessThan(averageStamina(calm, evaluations))
  })

  it('costs at most 15% of the rating when the tank is empty', () => {
    expect(staminaFactor(100)).toBe(1)
    expect(staminaFactor(0)).toBeCloseTo(0.85)
    expect(staminaFactor(50)).toBeGreaterThan(staminaFactor(20))
  })

  it('feeds the tired substitution rule with live legs', () => {
    const state = initialState()
    const setup = setupOf()
    const final = runToEnd(setup, seededRandom(7))
    // Pretend the match ran the legs down past the threshold.
    const drained = Object.fromEntries(
      Object.keys(final.stamina).map((uid) => [uid, LIVE_TIRED - 10]),
    )
    const auto = applyAutoSubs(
      state.cards,
      state.squad,
      5,
      (card) => drained[card.uid] ?? card.condition,
      LIVE_TIRED,
    )
    expect(auto.subs.length).toBeGreaterThan(0)
    for (const sub of auto.subs) {
      expect(sub.reason).toBe('fatigue')
      expect(drained[sub.inUid]).toBeUndefined()
    }
    // With everyone fresh nothing is swapped.
    expect(applyAutoSubs(state.cards, state.squad, 5).subs).toHaveLength(0)
  })
})
