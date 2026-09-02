// shared.js는 lib/gacha.ts에서 만들어진 번들이라 타입이 없습니다. 여기서
// 쓰는 부분만 적어 둡니다. 값은 여전히 한 벌이고, 이 파일은 모양만 말합니다.
export interface SharedPlayer {
  id: string
  name: string
  rarity: string
}

export interface SharedPack {
  id: string
  count: number
  cost: number
  rates: Record<string, number>
  guarantee?: string | null
}

export const PACKS: SharedPack[]
export const PITY_LIMIT: number
export function packOf(id: string): SharedPack
export function featuredPlayer(weekKey: string): SharedPlayer
export function pickupWeekKey(now?: Date): string
export function drawSession(options: {
  count: number
  pity?: number
  featured?: SharedPlayer | null
  group?: string | null
  minRarity?: string | null
  guarantee?: string | null
  rates?: Record<string, number>
  rng?: () => number
}): { players: SharedPlayer[]; pity: number; pityHit: boolean }
