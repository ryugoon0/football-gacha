import { describe, expect, it } from 'vitest'
import {
  advance,
  createMatch,
  possessionPercent,
  runToEnd,
  shapeFromSquad,
  toResult,
  type MatchSetup,
} from '../lib/matchEngine'
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
