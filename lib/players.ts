import { hashString, pickInRange, seededRandom } from './random'
import { RARITY_TIERS, startLevelOf, MAX_LEVEL } from './rarity'
import type { HiddenStats, PlayerDef, Position, PositionGroup, Rarity, Stats } from './types'

export { hashString, seededRandom }

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  CDM: 'MF',
  CM: 'MF',
  CAM: 'MF',
  LM: 'MF',
  RM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW',
}

/** How much each of the six stats counts towards a player's overall, per position. */
const OVR_WEIGHTS: Record<Position, Stats> = {
  GK: { pac: 0.05, sho: 0.0, pas: 0.1, dri: 0.05, def: 0.6, phy: 0.2 },
  CB: { pac: 0.1, sho: 0.02, pas: 0.08, dri: 0.05, def: 0.45, phy: 0.3 },
  LB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  RB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  CDM: { pac: 0.08, sho: 0.06, pas: 0.24, dri: 0.12, def: 0.35, phy: 0.15 },
  CM: { pac: 0.1, sho: 0.14, pas: 0.32, dri: 0.22, def: 0.14, phy: 0.08 },
  CAM: { pac: 0.12, sho: 0.22, pas: 0.3, dri: 0.28, def: 0.03, phy: 0.05 },
  LM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  RM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  LW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  RW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  ST: { pac: 0.22, sho: 0.36, pas: 0.08, dri: 0.2, def: 0.01, phy: 0.13 },
}

/** Shape of a player before the overall is normalised back to the target. */
const ARCHETYPE: Record<Position, Stats> = {
  GK: { pac: -25, sho: -45, pas: -12, dri: -25, def: 12, phy: 6 },
  CB: { pac: -8, sho: -30, pas: -10, dri: -14, def: 14, phy: 12 },
  LB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  RB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  CDM: { pac: -4, sho: -10, pas: 4, dri: -2, def: 12, phy: 8 },
  CM: { pac: -2, sho: 0, pas: 10, dri: 4, def: 0, phy: 0 },
  CAM: { pac: 2, sho: 6, pas: 10, dri: 10, def: -22, phy: -8 },
  LM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  RM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  LW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  RW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  ST: { pac: 8, sho: 14, pas: -8, dri: 6, def: -32, phy: 4 },
}

const STAT_KEYS: (keyof Stats)[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

export const STAT_LABELS: Record<keyof Stats, string> = {
  pac: '속도',
  sho: '슈팅',
  pas: '패스',
  dri: '드리블',
  def: '수비',
  phy: '피지컬',
}

/** Goalkeepers use the same six slots with different meanings. */
export const GK_STAT_LABELS: Record<keyof Stats, string> = {
  pac: '반응',
  sho: '펀칭',
  pas: '킥',
  dri: '핸들링',
  def: '선방',
  phy: '위치선정',
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function computeOvr(stats: Stats, position: Position): number {
  const w = OVR_WEIGHTS[position]
  const total = STAT_KEYS.reduce((sum, key) => sum + stats[key] * w[key], 0)
  return Math.round(total)
}

function buildStats(id: string, position: Position, target: number): Stats {
  const rng = seededRandom(hashString(id))
  const shape = ARCHETYPE[position]
  const raw: Record<string, number> = {}
  for (const key of STAT_KEYS) {
    raw[key] = target + shape[key] + (rng() * 8 - 4)
  }
  // Nudge everything so the weighted overall lands back on the target.
  const w = OVR_WEIGHTS[position]
  const mean = STAT_KEYS.reduce((sum, key) => sum + raw[key] * w[key], 0)
  const shift = target - mean
  const stats = {} as Stats
  for (const key of STAT_KEYS) {
    stats[key] = clamp(Math.round(raw[key] + shift), 24, 99)
  }
  return stats
}

/** Positions a player can cover besides their main one. */
const NEARBY_POSITIONS: Record<Position, Position[]> = {
  GK: [],
  CB: ['CDM'],
  LB: ['LM', 'CB'],
  RB: ['RM', 'CB'],
  CDM: ['CM', 'CB'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'LM', 'RM'],
  LM: ['LW', 'LB'],
  RM: ['RW', 'RB'],
  LW: ['LM', 'ST'],
  RW: ['RM', 'ST'],
  ST: ['CAM', 'LW', 'RW'],
}

/** Hidden attribute range per rarity: the gap that survives maxed out stats. */
const HIDDEN_RANGE: Record<Rarity, [min: number, max: number]> = {
  Normal: [0, 3],
  Rare: [2, 5],
  Legend: [5, 8],
  Live: [7, 10],
  World: [9, 12],
}

export const HIDDEN_MAX = 12

function buildPositions(id: string, position: Position, rarity: Rarity): Position[] {
  if (position === 'GK') return ['GK']
  const nearby = NEARBY_POSITIONS[position]
  // Better cards are likelier to be comfortable in more than one role.
  const extra = pickInRange(hashString(`${id}:pos`), 0, rarity === 'Normal' ? 1 : 2)
  return [position, ...nearby.slice(0, Math.min(extra, nearby.length))]
}

function buildHidden(id: string, rarity: Rarity): HiddenStats {
  const [min, max] = HIDDEN_RANGE[rarity]
  const rng = seededRandom(hashString(`${id}:hidden`))
  const roll = () => min + Math.round(rng() * (max - min))
  return { clutch: roll(), stamina: roll(), bigMatch: roll(), consistency: roll() }
}

/** Average of the hidden attributes, 0-12. */
export function hiddenPower(player: PlayerDef): number {
  const { clutch, stamina, bigMatch, consistency } = player.hidden
  return (clutch + stamina + bigMatch + consistency) / 4
}

const NATIONS = [
  '대한민국',
  '브라질',
  '잉글랜드',
  '스페인',
  '프랑스',
  '독일',
  '아르헨티나',
  '포르투갈',
  '네덜란드',
  '일본',
]

export interface ClubDef {
  name: string
  league: string
}

export const CLUBS: ClubDef[] = [
  { name: '한강 FC', league: 'K리그' },
  { name: '서울 유나이티드', league: 'K리그' },
  { name: '부산 마린스', league: 'K리그' },
  { name: '대구 다이너모', league: 'K리그' },
  { name: '인천 하버스', league: 'K리그' },
  { name: '전주 피닉스', league: 'K리그' },
  { name: '울산 아이언', league: 'K리그' },
  { name: '마드리드 로얄', league: '유로 리그' },
  { name: '런던 크라운', league: '유로 리그' },
  { name: '밀라노 네로', league: '유로 리그' },
  { name: '파리 루미에르', league: '유로 리그' },
  { name: '뮌헨 알펜', league: '유로 리그' },
  { name: '암스테르담 카날', league: '유로 리그' },
  { name: '리우 삼바', league: '아메리카 리그' },
  { name: '부에노스 스타스', league: '아메리카 리그' },
  { name: '뉴욕 리버티', league: '아메리카 리그' },
  { name: '산티아고 안데스', league: '아메리카 리그' },
]

export const LEAGUE_OF_CLUB: Record<string, string> = CLUBS.reduce(
  (map, club) => {
    map[club.name] = club.league
    return map
  },
  {} as Record<string, string>,
)

export const LEAGUES = Array.from(new Set(CLUBS.map((club) => club.league)))

type RosterRow = [name: string, position: Position, ovr: number]

const ROSTER: Record<Rarity, RosterRow[]> = {
  Normal: [
    ['김준성', 'GK', 58],
    ['박철벽', 'GK', 61],
    ['이막내', 'CB', 55],
    ['최수비', 'CB', 60],
    ['정태클', 'CB', 57],
    ['노장현', 'CB', 53],
    ['한동네', 'LB', 56],
    ['배후방', 'LB', 52],
    ['오른발', 'RB', 58],
    ['서포백', 'RB', 54],
    ['강중원', 'CDM', 59],
    ['도루묵', 'CDM', 55],
    ['남기훈', 'CM', 62],
    ['조패스', 'CM', 57],
    ['윤드리', 'CAM', 63],
    ['임측면', 'LM', 56],
    ['백윙어', 'RM', 58],
    ['신발끝', 'LW', 60],
    ['황돌파', 'RW', 61],
    ['문전앞', 'ST', 64],
    ['유골넣', 'ST', 59],
    ['차벤치', 'ST', 54],
  ],
  Rare: [
    ['박수문', 'GK', 75],
    ['강키퍼', 'GK', 71],
    ['이강철', 'CB', 73],
    ['윤파워', 'CB', 69],
    ['정왼발', 'LB', 70],
    ['조태클', 'RB', 72],
    ['한중앙', 'CDM', 71],
    ['최미들', 'CM', 72],
    ['백중원', 'CM', 75],
    ['서라운드', 'CAM', 74],
    ['황드리블', 'CAM', 78],
    ['쏘니', 'LW', 76],
    ['김번개', 'RW', 74],
    ['임속도', 'RW', 73],
    ['오프사', 'ST', 77],
    ['남헤딩', 'ST', 72],
  ],
  Legend: [
    ['강철수문장', 'GK', 83],
    ['빗장수비', 'CB', 84],
    ['헤딩왕', 'CB', 83],
    ['그라운드의 사령관', 'CDM', 82],
    ['카펫패스', 'CM', 85],
    ['두 개의 심장', 'CAM', 84],
    ['왼발의 마법사', 'LW', 86],
    ['폭주기관차', 'RW', 85],
    ['황금발', 'ST', 86],
    ['침묵의 암살자', 'ST', 87],
  ],
  Live: [
    ['라이브 수문장', 'GK', 85],
    ['각성한 수비수', 'CB', 86],
    ['미친 중원', 'CM', 89],
    ['오늘의 히어로', 'CAM', 86],
    ['폼미쳤다', 'LW', 87],
    ['연승기관차', 'RW', 88],
    ['류상민', 'ST', 88],
  ],
  World: [
    ['신의 손', 'GK', 92],
    ['대륙의 벽', 'CB', 91],
    ['무결점 미드', 'CM', 95],
    ['월드클래스', 'CAM', 93],
    ['은하계 윙어', 'LW', 93],
    ['차영진', 'ST', 94],
  ],
}

const RARITY_PREFIX: Record<Rarity, string> = {
  Normal: 'n',
  Rare: 'r',
  Legend: 'lg',
  Live: 'lv',
  World: 'w',
}

function buildRoster(): PlayerDef[] {
  const players: PlayerDef[] = []
  for (const rarity of Object.keys(ROSTER) as Rarity[]) {
    ROSTER[rarity].forEach(([name, position, ovr], index) => {
      const id = `${RARITY_PREFIX[rarity]}${String(index + 1).padStart(2, '0')}`
      const stats = buildStats(id, position, ovr)
      const rng = seededRandom(hashString(id + name))
      const club = CLUBS[Math.floor(rng() * CLUBS.length)]
      players.push({
        id,
        name,
        position,
        positions: buildPositions(id, position, rarity),
        rarity,
        nation: NATIONS[Math.floor(rng() * NATIONS.length)],
        club: club.name,
        league: club.league,
        stats,
        hidden: buildHidden(id, rarity),
        ovr: computeOvr(stats, position),
      })
    })
  }
  return players
}

export const PLAYERS: PlayerDef[] = buildRoster()

export const PLAYERS_BY_ID: Record<string, PlayerDef> = PLAYERS.reduce(
  (map, player) => {
    map[player.id] = player
    return map
  },
  {} as Record<string, PlayerDef>,
)

export const PLAYERS_BY_RARITY: Record<Rarity, PlayerDef[]> = PLAYERS.reduce(
  (map, player) => {
    ;(map[player.rarity] ||= []).push(player)
    return map
  },
  {} as Record<Rarity, PlayerDef[]>,
)

export function getPlayer(id: string): PlayerDef | undefined {
  return PLAYERS_BY_ID[id]
}

/** The three attributes that matter most in a position. */
export function keyStatsOf(position: Position): (keyof Stats)[] {
  const weights = OVR_WEIGHTS[position]
  return [...STAT_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 3)
}

/** How far along the growth curve a card is, 0 at its start level, 1 at ten. */
export function growthProgress(player: PlayerDef, level: number): number {
  const start = startLevelOf(player.rarity, player.id)
  const span = MAX_LEVEL - start
  if (span <= 0) return 1
  return clamp((level - start) / span, 0, 1)
}

/**
 * Levelling pushes the position's key attributes towards 99 — reached only at
 * level 10, which the lower rarities can never get to.
 */
export function effectiveStats(player: PlayerDef, level: number): Stats {
  const progress = growthProgress(player, level)
  const keys = new Set(keyStatsOf(player.position))
  const stats = {} as Stats
  for (const key of STAT_KEYS) {
    const base = player.stats[key]
    const reach = keys.has(key) ? progress : progress * 0.55
    stats[key] = Math.min(99, Math.round(base + (99 - base) * reach))
  }
  return stats
}

export function startLevel(player: PlayerDef): number {
  return startLevelOf(player.rarity, player.id)
}

export function levelCap(player: PlayerDef): number {
  return RARITY_TIERS[player.rarity].levelCap
}

export function effectiveOvr(player: PlayerDef, level: number): number {
  return computeOvr(effectiveStats(player, level), player.position)
}
