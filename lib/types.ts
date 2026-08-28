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

export interface PlayerDef {
  id: string
  name: string
  position: Position
  rarity: Rarity
  nation: string
  club: string
  stats: Stats
  ovr: number
}

/** An owned copy of a player. Duplicates get their own uid. */
export interface Card {
  uid: string
  playerId: string
  level: number
}

export interface Squad {
  formation: FormationKey
  /** slot id -> card uid (null = empty) */
  slots: Record<string, string | null>
}

export interface MatchSummary {
  id: string
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
  record: { w: number; d: number; l: number }
  gf: number
  ga: number
  points: number
  division: number
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
