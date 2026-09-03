import { getPlayer } from './players'
import type { GameState } from './types'

export interface PublicSquadMember {
  playerId: string
  level: number
  role: 'starter' | 'bench'
  slot: string
}

export interface PublicClubRow {
  user_id: string
  club_name: string
  division: number
  rating: number
  formation: string
  lineup: PublicSquadMember[]
  is_public: boolean
  updated_at: string
}

/**
 * The public profile is deliberately a small read-only snapshot. It exposes
 * player definitions and levels, never a save, card uid, economy, or tactics.
 */
export function publicLineupOf(state: GameState): PublicSquadMember[] {
  const byUid = new Map(state.cards.map((card) => [card.uid, card]))
  const starters = Object.entries(state.squad.slots).flatMap(([slot, uid]) => {
    const card = uid ? byUid.get(uid) : null
    if (!card || !getPlayer(card.playerId)) return []
    return [{ playerId: card.playerId, level: card.level, role: 'starter' as const, slot }]
  })
  const bench = state.squad.bench.flatMap((uid, index) => {
    const card = uid ? byUid.get(uid) : null
    if (!card || !getPlayer(card.playerId)) return []
    return [{ playerId: card.playerId, level: card.level, role: 'bench' as const, slot: `bench-${index}` }]
  })
  return [...starters, ...bench]
}

export function isPublicSquadMember(value: unknown): value is PublicSquadMember {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PublicSquadMember>
  return (
    typeof item.playerId === 'string' &&
    typeof item.level === 'number' &&
    (item.role === 'starter' || item.role === 'bench') &&
    typeof item.slot === 'string'
  )
}
