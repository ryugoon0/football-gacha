import type { ItemId } from './items'
import { PLAYERS } from './players'
import type { PlayerDef } from './types'

/**
 * 스카우트 지정권 — an item that hands over one card the manager names, not a
 * random pull. Two kinds (2026-09-07):
 *  - 플래티넘 지정권: any released 플래티넘 (rarity Live, not limited) card.
 *  - 라이브 지정권: any 리미티드(라이브) card whose window has opened at least
 *    once — last week's batch counts, so the ticket is worth keeping.
 * Neither is sold; they arrive by gift or event. The card lands even past
 * the vault cap, like a gift would.
 */
export const PICK_ITEM_IDS: ItemId[] = ['platinumPick', 'livePick']

export function isPickItem(id: ItemId): boolean {
  return PICK_ITEM_IDS.includes(id)
}

export function pickCandidates(id: ItemId, nowMs: number = Date.now()): PlayerDef[] {
  if (id === 'platinumPick') {
    return PLAYERS.filter((player) => player.rarity === 'Live' && !player.limited && !player.unreleased && !player.retired)
  }
  if (id === 'livePick') {
    return PLAYERS.filter((player) => Boolean(player.limited) && !player.unreleased && Date.parse(player.limited!.from) <= nowMs)
  }
  return []
}

export function canPick(id: ItemId, playerId: string, nowMs: number = Date.now()): boolean {
  return pickCandidates(id, nowMs).some((player) => player.id === playerId)
}
