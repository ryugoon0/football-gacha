import { seededRandom } from './players'
import type { PlayerDef, Stats } from './types'
import { effectiveStats } from './players'

export type StatGroup = keyof Stats

export interface SubStat {
  key: string
  label: string
  /** Label used when the player is a goalkeeper. */
  gkLabel: string
}

/** Three detailed attributes behind each of the six headline stats. */
export const SUB_STATS: Record<StatGroup, SubStat[]> = {
  pac: [
    { key: 'acc', label: '가속력', gkLabel: '반응 속도' },
    { key: 'spd', label: '최고 속도', gkLabel: '순간 반응' },
    { key: 'agi', label: '민첩성', gkLabel: '몸놀림' },
  ],
  sho: [
    { key: 'fin', label: '골 결정력', gkLabel: '펀칭' },
    { key: 'pow', label: '슛 파워', gkLabel: '쳐내기' },
    { key: 'hea', label: '헤더', gkLabel: '공중볼 처리' },
  ],
  pas: [
    { key: 'sht', label: '짧은 패스', gkLabel: '짧은 배급' },
    { key: 'lng', label: '긴 패스', gkLabel: '롱킥' },
    { key: 'crs', label: '크로스', gkLabel: '골킥' },
  ],
  dri: [
    { key: 'ctl', label: '볼 컨트롤', gkLabel: '핸들링' },
    { key: 'drb', label: '드리블', gkLabel: '볼 다루기' },
    { key: 'bal', label: '균형 감각', gkLabel: '안정감' },
  ],
  def: [
    { key: 'tkl', label: '태클', gkLabel: '선방' },
    { key: 'mrk', label: '마크', gkLabel: '일대일 방어' },
    { key: 'itc', label: '가로채기', gkLabel: '크로스 차단' },
  ],
  phy: [
    { key: 'str', label: '몸싸움', gkLabel: '제공권' },
    { key: 'sta', label: '스태미나', gkLabel: '집중력' },
    { key: 'jmp', label: '점프', gkLabel: '위치 선정' },
  ],
}

export const STAT_GROUPS = Object.keys(SUB_STATS) as StatGroup[]

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const clamp = (n: number) => Math.max(20, Math.min(99, n))

/**
 * Detailed attributes for one headline stat. The three values average back to
 * the headline number, so the card and the detail view never disagree.
 */
export function subStatsOf(
  player: PlayerDef,
  group: StatGroup,
  level = 1,
): { stat: SubStat; value: number }[] {
  const base = effectiveStats(player, level)[group]
  const rng = seededRandom(hash(`${player.id}:${group}`))
  const first = Math.round(rng() * 12 - 6)
  const second = Math.round(rng() * 12 - 6)
  const offsets = [first, second, -(first + second)]

  return SUB_STATS[group].map((stat, index) => ({
    stat,
    value: clamp(base + offsets[index]),
  }))
}

export function subStatLabel(stat: SubStat, isKeeper: boolean): string {
  return isKeeper ? stat.gkLabel : stat.label
}
