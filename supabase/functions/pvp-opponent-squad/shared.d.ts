// shared.js는 lib/publicClub.ts에서 만들어진 번들이라 타입이 없습니다. 여기서
// 쓰는 부분만 적어 둡니다.

export interface SharedCard {
  uid: string
  playerId: string
  level: number
  limit: number
  condition: number
  injuredFor: number
  exp: number
}

export interface SharedSquad {
  formation: string
  slots: Record<string, string | null>
  bench: (string | null)[]
}

export interface SharedGameState {
  club: string
  cards: SharedCard[]
  squad: SharedSquad
  season?: { division?: number }
}

export interface SharedPublicSquadMember {
  playerId: string
  level: number
  role: 'starter' | 'bench'
  slot: string
}

export function publicLineupOf(state: SharedGameState): SharedPublicSquadMember[]
