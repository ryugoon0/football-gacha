import { POSITION_GROUP, seededRandom } from './players'
import type { PlayerDef } from './types'

export type TraitId =
  | 'speedster'
  | 'finisher'
  | 'playmaker'
  | 'dribbler'
  | 'wall'
  | 'aerial'
  | 'ironman'
  | 'glass'
  | 'bigGame'
  | 'captain'

export interface TraitDef {
  id: TraitId
  name: string
  description: string
  tone: 'good' | 'bad'
}

export const TRAITS: Record<TraitId, TraitDef> = {
  speedster: {
    id: 'speedster',
    name: '스피드스타',
    description: '빠른 발로 경기 템포를 끌어올립니다',
    tone: 'good',
  },
  finisher: {
    id: 'finisher',
    name: '침착한 마무리',
    description: '결정적인 순간 골로 연결할 확률이 높습니다',
    tone: 'good',
  },
  playmaker: {
    id: 'playmaker',
    name: '플레이메이커',
    description: '경기를 조율해 점유율을 끌어올립니다',
    tone: 'good',
  },
  dribbler: {
    id: 'dribbler',
    name: '돌파의 명수',
    description: '수비를 벗겨내 기회를 만들어 냅니다',
    tone: 'good',
  },
  wall: {
    id: 'wall',
    name: '수비의 벽',
    description: '상대의 슈팅을 막아내 실점을 줄입니다',
    tone: 'good',
  },
  aerial: {
    id: 'aerial',
    name: '제공권 장악',
    description: '세트피스와 공중볼 싸움에 강합니다',
    tone: 'good',
  },
  ironman: {
    id: 'ironman',
    name: '강철 체력',
    description: '경기를 뛰어도 체력이 덜 떨어집니다',
    tone: 'good',
  },
  bigGame: {
    id: 'bigGame',
    name: '빅게임 플레이어',
    description: '컵 대회처럼 큰 경기에서 더 잘합니다',
    tone: 'good',
  },
  captain: {
    id: 'captain',
    name: '주장',
    description: '팀을 하나로 묶어 케미를 끌어올립니다',
    tone: 'good',
  },
  glass: {
    id: 'glass',
    name: '유리몸',
    description: '부상을 자주 당합니다',
    tone: 'bad',
  },
}

export const MAX_TRAITS = 3

interface Rule {
  id: TraitId
  /** Whether the player is eligible at all. */
  when: (player: PlayerDef) => boolean
  /** How often an eligible player actually gets it. */
  chance: number
}

const RULES: Rule[] = [
  { id: 'speedster', when: (p) => p.stats.pac >= 80, chance: 0.7 },
  { id: 'finisher', when: (p) => p.stats.sho >= 78, chance: 0.65 },
  { id: 'playmaker', when: (p) => p.stats.pas >= 78, chance: 0.6 },
  { id: 'dribbler', when: (p) => p.stats.dri >= 80, chance: 0.6 },
  { id: 'wall', when: (p) => p.stats.def >= 78, chance: 0.65 },
  {
    id: 'aerial',
    when: (p) => p.stats.phy >= 74 && ['CB', 'ST', 'GK'].includes(p.position),
    chance: 0.5,
  },
  { id: 'ironman', when: (p) => p.stats.phy >= 72, chance: 0.35 },
  {
    id: 'bigGame',
    when: (p) => ['Legend', 'Live', 'World'].includes(p.rarity),
    chance: 0.4,
  },
  {
    id: 'captain',
    when: (p) =>
      ['Legend', 'Live', 'World'].includes(p.rarity) && POSITION_GROUP[p.position] !== 'FW',
    chance: 0.35,
  },
  { id: 'glass', when: (p) => p.stats.phy <= 62, chance: 0.25 },
]

const cache = new Map<string, TraitId[]>()

/** Traits are fixed per player, so the same card always plays the same way. */
export function traitsOf(player: PlayerDef): TraitId[] {
  const cached = cache.get(player.id)
  if (cached) return cached

  const rng = seededRandom(
    player.id.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 17),
  )
  const traits: TraitId[] = []
  for (const rule of RULES) {
    const roll = rng()
    if (traits.length >= MAX_TRAITS) continue
    if (rule.when(player) && roll < rule.chance) traits.push(rule.id)
  }
  cache.set(player.id, traits)
  return traits
}

export function hasTrait(player: PlayerDef, trait: TraitId): boolean {
  return traitsOf(player).includes(trait)
}

export interface TraitEffects {
  /** Added to the chance that one of our shots goes in. */
  goal: number
  /** Taken off the chance that the opponent scores. */
  concede: number
  /** Multiplier on how many chances the match produces. */
  tempo: number
  /** Extra squad chemistry. */
  chemistry: number
  /** Rating bonus in cup ties. */
  cup: number
}

export const NO_TRAIT_EFFECTS: TraitEffects = {
  goal: 0,
  concede: 0,
  tempo: 1,
  chemistry: 0,
  cup: 0,
}

const CAPS = { goal: 0.08, concede: 0.08, tempo: 0.18, chemistry: 12, cup: 6 }

/** Adds up what the players on the pitch bring, with a ceiling on each effect. */
export function teamTraitEffects(players: PlayerDef[]): TraitEffects {
  let goal = 0
  let concede = 0
  let tempo = 0
  let chemistry = 0
  let cup = 0

  for (const player of players) {
    for (const trait of traitsOf(player)) {
      if (trait === 'finisher') goal += 0.015
      if (trait === 'aerial') goal += 0.008
      if (trait === 'dribbler') goal += 0.008
      if (trait === 'wall') concede += 0.015
      if (trait === 'speedster') tempo += 0.03
      if (trait === 'playmaker') tempo += 0.015
      if (trait === 'captain') chemistry += 4
      if (trait === 'bigGame') cup += 2
    }
  }

  return {
    goal: Math.min(CAPS.goal, goal),
    concede: Math.min(CAPS.concede, concede),
    tempo: 1 + Math.min(CAPS.tempo, tempo),
    chemistry: Math.min(CAPS.chemistry, chemistry),
    cup: Math.min(CAPS.cup, cup),
  }
}

/** Per player knobs used when a match wears the squad down. */
export function playerTraitFactors(player: PlayerDef | undefined): {
  conditionDrain: number
  injuryRisk: number
} {
  if (!player) return { conditionDrain: 1, injuryRisk: 1 }
  const traits = traitsOf(player)
  return {
    conditionDrain: traits.includes('ironman') ? 0.7 : 1,
    injuryRisk: traits.includes('glass') ? 1.7 : traits.includes('ironman') ? 0.7 : 1,
  }
}
