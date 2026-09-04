import type { HiddenStats, Position, Stats } from './types'

/**
 * Hand corrections to generated players.
 *
 * The bulk of the roster is built by a script, which gets a squad on the pitch
 * but has no opinion about any particular player. When a card reads wrong —
 * a winger with no pace, a defender whose numbers look bronze — the fix goes
 * here, keyed by the card's id.
 *
 * It cannot live in the database. The pull is settled by the Edge Function
 * from the roster bundled into it, so a correction the server does not have
 * would mean the game and the server disagree about who a card is.
 *
 * Written by hand or by the 선수 편집 tab, which produces these entries.
 */
export interface PlayerOverride {
  /** Only when the position itself is wrong. Changes which slots the card fits. */
  position?: Position
  /**
   * The full list of positions this card is eligible for, main position
   * included. Only set when the auto-generated spread (based on rarity and
   * nearby roles) is wrong — most cards never need this.
   */
  positions?: Position[]
  /** Only the six stats being corrected; the rest stay as generated. */
  stats?: Partial<Stats>
  /**
   * The 23 detailed sub-stats behind the six headline numbers (lib/subStats.ts),
   * only for a group whose auto-generated breakdown is wrong. Each array must
   * be in the same order as SUB_STATS[group] and average back to that group's
   * headline stat exactly — the game shows the headline as the average of its
   * detail, and a mismatch reads as a bug, not a choice.
   */
  subStats?: Partial<Record<keyof Stats, number[]>>
  hidden?: Partial<HiddenStats>
}

export const PLAYER_OVERRIDES: Record<string, PlayerOverride> = {
  'lv07': { positions: ['ST', 'LW'], stats: { pac: 95, phy: 95 }, hidden: { clutch: 10, consistency: 9 } }, // 엘링 홀란
  'w03': { positions: ['CM', 'CDM', 'CAM'], stats: { pac: 86, sho: 97, pas: 98, dri: 94, def: 78, phy: 85 } }, // 케빈 더브라
  'w04': { positions: ['CAM', 'ST', 'RW'], stats: { pac: 98, sho: 84, pas: 98, dri: 98, def: 63 }, hidden: { stamina: 10, consistency: 12 } }, // 리오 메시아
  'w05': { positions: ['LW', 'ST'], stats: { pac: 98, sho: 98, def: 70, phy: 95 }, hidden: { clutch: 11, stamina: 11, consistency: 10 } }, // 크리스 호날드
  'w06': { positions: ['ST', 'LW'], stats: { pac: 98, dri: 97, phy: 92 } }, // 킬리안 음바피
  'w75': { positions: ['CAM', 'LW', 'LM'], stats: { dri: 69 } }, // 마르쿠 로이센
}
