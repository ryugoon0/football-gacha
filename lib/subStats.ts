import { GK_STAT_LABELS, STAT_LABELS, effectiveStats, seededRandom } from './players'
import type { PlayerDef, Position, Stats } from './types'

export type StatGroup = keyof Stats

/**
 * The detailed attributes behind each of the six numbers on a card.
 *
 * A card only has room for six figures, and six figures cannot tell two
 * strikers apart — one finishes, the other heads everything in. So each
 * headline stat is a group of detailed attributes, and the card shows their
 * average. Nothing new is stored: the detail is derived from the card's own id,
 * so an existing save opens with the same players it always had.
 *
 * The rule that makes this safe is that the detail must average back to the
 * headline exactly. If the card says 수비 28 and the detail adds up to 30, the
 * player is right to think one of the two screens is lying.
 */
export interface SubStat {
  key: string
  label: string
  /** Same slot, different job. A keeper's 태클 is a save. */
  gkLabel: string
}

export const SUB_STATS: Record<StatGroup, SubStat[]> = {
  pac: [
    { key: 'acc', label: '가속력', gkLabel: '순발력' },
    { key: 'spd', label: '최고 속도', gkLabel: '반사 속도' },
    { key: 'rea', label: '반응 속도', gkLabel: '몸놀림' },
  ],
  sho: [
    { key: 'fin', label: '골 결정력', gkLabel: '펀칭 파워' },
    { key: 'pow', label: '슛 파워', gkLabel: '쳐내기' },
    { key: 'rng', label: '중거리 슛', gkLabel: '골킥' },
    { key: 'hea', label: '헤더', gkLabel: '공중볼 처리' },
  ],
  pas: [
    { key: 'sht', label: '짧은 패스', gkLabel: '짧은 배급' },
    { key: 'lng', label: '긴 패스', gkLabel: '롱킥' },
    { key: 'crs', label: '크로스', gkLabel: '빌드업' },
    { key: 'fkk', label: '프리킥', gkLabel: '발밑 처리' },
  ],
  dri: [
    { key: 'ctl', label: '볼 컨트롤', gkLabel: '캐칭' },
    { key: 'drb', label: '개인기', gkLabel: '볼 다루기' },
    { key: 'agi', label: '민첩성', gkLabel: '유연성' },
    { key: 'bal', label: '균형 감각', gkLabel: '안정감' },
  ],
  def: [
    { key: 'tkl', label: '태클', gkLabel: '반사 신경' },
    { key: 'mrk', label: '마크', gkLabel: '일대일 방어' },
    { key: 'itc', label: '가로채기', gkLabel: '크로스 차단' },
    { key: 'pos', label: '수비 위치', gkLabel: '수비 범위' },
  ],
  phy: [
    { key: 'str', label: '몸싸움', gkLabel: '제공권' },
    { key: 'jmp', label: '점프', gkLabel: '점프' },
    { key: 'sta', label: '스태미나', gkLabel: '집중력' },
    { key: 'cmp', label: '침착성', gkLabel: '담력' },
  ],
}

export const STAT_GROUPS = Object.keys(SUB_STATS) as StatGroup[]

/** How many detailed attributes there are in total — used in copy. */
export const SUB_STAT_COUNT = STAT_GROUPS.reduce((sum, group) => sum + SUB_STATS[group].length, 0)

type Role = 'keeper' | 'defender' | 'midfielder' | 'attacker'

const ROLE_OF: Record<Position, Role> = {
  GK: 'keeper',
  CB: 'defender',
  LB: 'defender',
  RB: 'defender',
  CDM: 'midfielder',
  CM: 'midfielder',
  CAM: 'midfielder',
  LM: 'midfielder',
  RM: 'midfielder',
  LW: 'attacker',
  RW: 'attacker',
  ST: 'attacker',
}

/**
 * Which way a role leans inside each group. Only the differences within a
 * group matter — the numbers are recentred before use — so this says "a
 * defender heads the ball better than they shoot", not "defenders shoot well".
 */
const TILT: Record<Role, Record<string, number>> = {
  keeper: {
    acc: 0, spd: -2, rea: 3,
    fin: 0, pow: 1, rng: -1, hea: 1,
    sht: 2, lng: 1, crs: -2, fkk: 0,
    ctl: 3, drb: -3, agi: 1, bal: 1,
    tkl: 4, mrk: 0, itc: -3, pos: 2,
    str: 0, jmp: 2, sta: 1, cmp: 2,
  },
  defender: {
    acc: -1, spd: 0, rea: 1,
    fin: -4, pow: 1, rng: -3, hea: 5,
    sht: 2, lng: 3, crs: -2, fkk: -3,
    ctl: 0, drb: -4, agi: -2, bal: 4,
    tkl: 4, mrk: 4, itc: 1, pos: 3,
    str: 5, jmp: 4, sta: 0, cmp: 1,
  },
  midfielder: {
    acc: 1, spd: -1, rea: 1,
    fin: -1, pow: 1, rng: 3, hea: -3,
    sht: 5, lng: 4, crs: 1, fkk: 2,
    ctl: 4, drb: 2, agi: 1, bal: 1,
    tkl: 1, mrk: -1, itc: 3, pos: 1,
    str: -1, jmp: -2, sta: 5, cmp: 2,
  },
  attacker: {
    acc: 3, spd: 3, rea: 0,
    fin: 5, pow: 3, rng: 1, hea: 0,
    sht: 1, lng: -4, crs: 1, fkk: 1,
    ctl: 3, drb: 5, agi: 3, bal: -1,
    tkl: -4, mrk: -4, itc: -1, pos: -2,
    str: 0, jmp: 1, sta: -2, cmp: 3,
  },
}

/** Nobody is a 5 at anything, and nobody is a 99 at everything. */
const MIN = 12
const MAX = 99

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Round a list of offsets to whole numbers that still add up to zero.
 * Largest remainder first, so the values that were closest to rounding up are
 * the ones that do.
 */
function roundToZero(values: number[]): number[] {
  const floors = values.map((value) => Math.floor(value))
  const order = values
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
  const out = [...floors]
  let owed = -floors.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < order.length && owed > 0; i++) {
    out[order[i].index] += 1
    owed -= 1
  }
  return out
}

/**
 * Detailed attributes for one headline stat, at the card's current level.
 *
 * The spread narrows as the headline approaches either end: a 96 cannot be the
 * average of a 90 and a 99 without something above 99, so a near maxed stat
 * shows near identical detail — which is also what being maxed out means.
 */
export function subStatsOf(
  player: PlayerDef,
  group: StatGroup,
  level = 1,
): { stat: SubStat; label: string; value: number }[] {
  const headline = effectiveStats(player, level)[group]
  const isKeeper = player.position === 'GK'
  const subs = SUB_STATS[group]
  const tilt = TILT[ROLE_OF[player.position]]
  const rng = seededRandom(hash(`${player.id}:${group}`))

  const raw = subs.map((sub) => tilt[sub.key] + (rng() * 8 - 4))
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length
  const centred = raw.map((value) => value - mean)

  // Leave a point of slack so rounding cannot push a value past either end.
  const room = Math.max(0, Math.min(headline - MIN, MAX - headline) - 1)
  const peak = Math.max(...centred.map((value) => Math.abs(value)))
  const scale = peak > room ? room / peak : 1
  const offsets = roundToZero(centred.map((value) => value * scale))

  return subs.map((sub, index) => ({
    stat: sub,
    label: isKeeper ? sub.gkLabel : sub.label,
    value: headline + offsets[index],
  }))
}

export interface GroupBreakdown {
  group: StatGroup
  label: string
  value: number
  subs: { stat: SubStat; label: string; value: number }[]
}

/** Every group at once, with the headline the card itself shows. */
export function breakdownOf(player: PlayerDef, level = 1): GroupBreakdown[] {
  const now = effectiveStats(player, level)
  const labels = player.position === 'GK' ? GK_STAT_LABELS : STAT_LABELS
  return STAT_GROUPS.map((group) => ({
    group,
    label: labels[group],
    value: now[group],
    subs: subStatsOf(player, group, level),
  }))
}

export function subStatLabel(stat: SubStat, isKeeper: boolean): string {
  return isKeeper ? stat.gkLabel : stat.label
}
