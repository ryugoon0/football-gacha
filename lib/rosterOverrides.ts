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
  hidden?: Partial<HiddenStats>
}

export const PLAYER_OVERRIDES: Record<string, PlayerOverride> = {
  'w03': { positions: ['CM', 'CDM', 'CAM'], stats: { pac: 84, dri: 92, def: 77, phy: 83 } }, // 케빈 더브라
  'w04': { positions: ['CAM', 'ST', 'RW'], stats: { pac: 98, sho: 96, pas: 98, dri: 98, def: 63 }, hidden: { stamina: 10, consistency: 12 } }, // 리오 메시아
  'w06': { positions: ['ST', 'LW'], stats: { pac: 98, dri: 97, phy: 92 } }, // 킬리안 음바피
}
