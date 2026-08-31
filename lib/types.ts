import type { SubEvent } from './autoSub'
import type { CupState } from './cup'
import type { DailyState } from './daily'
import type { PlayerRating } from './growth'
import type { Season } from './league'
import type { MarketState } from './market'
import type { TacticKey } from './tactics'

export type Rarity = 'Normal' | 'Rare' | 'Legend' | 'Live' | 'World'

export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST'

export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW'

export type FormationKey = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2'

export interface Stats {
  pac: number
  sho: number
  pas: number
  dri: number
  def: number
  phy: number
}

/** Attributes the card never shows. They decide how two 99 cards differ. */
export interface HiddenStats {
  /** Turning chances into goals. */
  clutch: number
  /** How slowly the player tires. */
  stamina: number
  /** Cup ties and finals. */
  bigMatch: number
  /** How rarely the player has an off day. */
  consistency: number
}

export interface PlayerDef {
  id: string
  name: string
  /** Main position. */
  position: Position
  /** Every position the player can be fielded in without collapsing. */
  positions: Position[]
  rarity: Rarity
  nation: string
  club: string
  league: string
  stats: Stats
  /** Never rendered as numbers; drives the rarity gap at max level. */
  hidden: HiddenStats
  ovr: number
}

/** An owned copy of a player. Duplicates get their own uid. */
export interface Card {
  uid: string
  playerId: string
  level: number
  /** Highest level this copy can reach; raised only by a duplicate. */
  limit: number
  /** Match fitness, 0-100. Tired players underperform. */
  condition: number
  /** Matches left on the sidelines; 0 means available. */
  injuredFor: number
  /** Experience banked towards the next level. */
  exp: number
}

export interface Squad {
  formation: FormationKey
  /** slot id -> card uid (null = empty) */
  slots: Record<string, string | null>
  /** Substitutes, in the order the auto-sub tries them. */
  bench: (string | null)[]
}

export interface MatchSummary {
  id: string
  competition: 'league' | 'cup'
  opponent: string
  scoreFor: number
  scoreAgainst: number
  result: 'W' | 'D' | 'L'
  reward: number
  at: number
}

export interface GameState {
  version: number
  club: string
  gold: number
  cards: Card[]
  squad: Squad
  tactic: TacticKey
  /** Pull injured or exhausted starters automatically before kick-off. */
  autoSub: boolean
  season: Season
  cup: CupState
  /** Position in the combined league + cup calendar. */
  matchday: number
  market: MarketState
  trophies: { cup: number; promotions: number }
  /** Card shards from released players. */
  shards: number
  /** Pulls since the last Legend or better. */
  pity: number
  /** Lifetime pull counts, for the odds page. */
  pulls: { total: number; byRarity: Record<Rarity, number> }
  /** Player marks from the most recent match. */
  lastRatings: PlayerRating[]
  /** Substitutions the auto-sub made before the last match. */
  lastSubs: SubEvent[]
  daily: DailyState
  guideDone: boolean
  record: { w: number; d: number; l: number }
  gf: number
  ga: number
  collected: string[]
  history: MatchSummary[]
}

export type MatchEventType = 'kickoff' | 'goal' | 'chance' | 'save' | 'foul' | 'half' | 'full'

export interface MatchEvent {
  minute: number
  type: MatchEventType
  side: 'home' | 'away'
  text: string
}

export interface MatchResult {
  opponent: string
  /** Card uids of our scorers, one entry per goal. */
  scorerUids: string[]
  opponentRating: number
  scoreFor: number
  scoreAgainst: number
  result: 'W' | 'D' | 'L'
  events: MatchEvent[]
  reward: number
  possession: number
  shotsFor: number
  shotsAgainst: number
}
