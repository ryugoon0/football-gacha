import type { GameState } from './types'

/** A save as it is stored in the cloud, with the time it was written. */
export interface CloudSave {
  state: GameState
  updatedAt: string
}

export type SyncChoice = 'useLocal' | 'useCloud' | 'noConflict'

/** How much of the game a save represents, used to describe a conflict. */
export interface SaveSummary {
  club: string
  gold: number
  cards: number
  season: number
  division: number
  record: string
}

export function summarize(state: GameState): SaveSummary {
  return {
    club: state.club,
    gold: state.gold,
    cards: state.cards.length,
    season: state.season.index,
    division: state.season.division,
    record: `${state.record.w}승 ${state.record.d}무 ${state.record.l}패`,
  }
}

/** A rough "how far along" number, only used to spot an empty save. */
export function progressScore(state: GameState): number {
  const played = state.record.w + state.record.d + state.record.l
  return state.cards.length + played * 2 + state.season.index * 20 + state.trophies.cup * 30
}

/** A save nobody would mind losing: nothing pulled, nothing played, nothing won. */
export function isFreshSave(state: GameState): boolean {
  const played = state.record.w + state.record.d + state.record.l
  return (
    played === 0 &&
    state.pulls.total === 0 &&
    state.trophies.cup === 0 &&
    state.trophies.promotions === 0
  )
}

/**
 * Decides what to do when a player signs in on a device that already has a
 * save. Only a genuine clash — both sides have real progress — asks a question.
 */
export function planSync(
  local: GameState,
  cloud: CloudSave | null,
): { choice: SyncChoice; needsPrompt: boolean } {
  if (!cloud) return { choice: 'useLocal', needsPrompt: false }
  if (isFreshSave(local)) return { choice: 'useCloud', needsPrompt: false }
  if (isFreshSave(cloud.state)) return { choice: 'useLocal', needsPrompt: false }
  return { choice: 'noConflict', needsPrompt: true }
}
