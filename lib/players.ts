import type { PlayerDef, Position, PositionGroup, Rarity, Stats } from './types'

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

function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small deterministic PRNG so a player's stats never change between renders. */
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
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
        rarity,
        nation: NATIONS[Math.floor(rng() * NATIONS.length)],
        club: club.name,
        league: club.league,
        stats,
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

/** Training adds one point to every stat per level above 1. */
export function effectiveStats(player: PlayerDef, level: number): Stats {
  const bonus = Math.max(0, level - 1)
  const stats = {} as Stats
  for (const key of STAT_KEYS) {
    stats[key] = Math.min(99, player.stats[key] + bonus)
  }
  return stats
}

export function effectiveOvr(player: PlayerDef, level: number): number {
  return computeOvr(effectiveStats(player, level), player.position)
}
