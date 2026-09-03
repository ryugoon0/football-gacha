import { PLAYERS, buildPlayer } from './players'
import { PLAYER_OVERRIDES, type PlayerOverride } from './rosterOverrides'
import { HIDDEN_KEYS, HIDDEN_RANGE, STAT_KEYS, STAT_LABELS, STAT_RANGE } from './cardMaker'
import type { HiddenStats, PlayerDef, Position, Stats } from './types'

/**
 * Editing a player who already exists.
 *
 * Same constraint as the card maker: the roster is bundled into the Edge
 * Function that settles pulls, so nothing here writes to the database. What it
 * produces is the PLAYER_OVERRIDES block for lib/rosterOverrides.ts, which the
 * game and the server both read from the same source file.
 *
 * An edit is stored as a difference from the card as generated, not as a full
 * copy of it. Pin only what is wrong and the rest keeps moving when the
 * generator changes — otherwise a balance pass would silently skip every card
 * anyone had ever touched.
 */

export interface PlayerEdit {
  position?: Position
  /** The full eligible-position list, main position included. */
  positions?: Position[]
  stats: Partial<Stats>
  hidden: Partial<HiddenStats>
}

/** Everything the operator has changed this session, keyed by card id. */
export type EditMap = Record<string, PlayerEdit>

export const emptyEdit = (): PlayerEdit => ({ stats: {}, hidden: {} })

function samePositions(a: Position[], b: Position[]): boolean {
  if (a.length !== b.length) return false
  const sorted = [...b].sort()
  return [...a].sort().every((item, index) => item === sorted[index])
}

/** The card with no correction at all — what the generator alone produces. */
export function basePlayer(id: string): PlayerDef | null {
  return buildPlayer(id, {})
}

/** The card as the game builds it right now, corrections included. */
export function currentPlayer(id: string): PlayerDef | null {
  return buildPlayer(id)
}

/** The edit that reproduces the correction already committed for this card. */
export function editFromOverrides(id: string): PlayerEdit {
  const fix = PLAYER_OVERRIDES[id]
  if (!fix) return emptyEdit()
  return {
    position: fix.position,
    positions: fix.positions ? [...fix.positions] : undefined,
    stats: { ...fix.stats },
    hidden: { ...fix.hidden },
  }
}

/**
 * Drop anything that matches the generated card. An operator dragging a slider
 * back to where it started should leave no trace, or the overrides file fills
 * up with lines that do nothing and the next person cannot tell which of them
 * were meant.
 */
export function tighten(id: string, edit: PlayerEdit): PlayerOverride {
  const base = basePlayer(id)
  const fix: PlayerOverride = {}
  if (edit.position && (!base || edit.position !== base.position)) fix.position = edit.position
  // Position changes reshape the generated stats and the default eligible-position
  // spread, so both are only redundant when they match the card as it will be
  // built with the new position (not the untouched original).
  const shaped = base ? buildPlayer(id, fix.position ? { position: fix.position } : {}) : null
  if (edit.positions && (!shaped || !samePositions(edit.positions, shaped.positions))) {
    fix.positions = edit.positions
  }
  const stats: Partial<Stats> = {}
  for (const key of STAT_KEYS) {
    const value = edit.stats[key]
    if (value !== undefined && (!shaped || value !== shaped.stats[key])) stats[key] = value
  }
  const hidden: Partial<HiddenStats> = {}
  for (const key of HIDDEN_KEYS) {
    const value = edit.hidden[key]
    if (value !== undefined && (!shaped || value !== shaped.hidden[key])) hidden[key] = value
  }
  if (Object.keys(stats).length) fix.stats = stats
  if (Object.keys(hidden).length) fix.hidden = hidden
  return fix
}

export function isEmpty(fix: PlayerOverride): boolean {
  return !fix.position && !fix.positions && !fix.stats && !fix.hidden
}

/** The card as it will be once the edit is committed. */
export function previewEdit(id: string, edit: PlayerEdit): PlayerDef | null {
  return buildPlayer(id, tighten(id, edit))
}

export function validateEdit(edit: PlayerEdit): string | null {
  for (const key of STAT_KEYS) {
    const value = edit.stats[key]
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < STAT_RANGE.min || value > STAT_RANGE.max) {
      return `${STAT_LABELS[key]}은(는) ${STAT_RANGE.min}에서 ${STAT_RANGE.max} 사이여야 합니다.`
    }
  }
  for (const key of HIDDEN_KEYS) {
    const value = edit.hidden[key]
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < HIDDEN_RANGE.min || value > HIDDEN_RANGE.max) {
      return `히든 능력치는 ${HIDDEN_RANGE.min}에서 ${HIDDEN_RANGE.max} 사이여야 합니다.`
    }
  }
  return null
}

export interface SearchFilters {
  query: string
  rarity: string
  position: string
}

/**
 * Finding one card in a few thousand. Name, club and id all match, because an
 * operator arriving from a bug report has whichever of those the report gave.
 */
export function searchPlayers(filters: SearchFilters, limit = 40): PlayerDef[] {
  const needle = filters.query.trim().toLowerCase()
  const found = PLAYERS.filter((player) => {
    if (filters.rarity !== 'all' && player.rarity !== filters.rarity) return false
    if (filters.position !== 'all' && !player.positions.includes(filters.position as Position)) return false
    if (!needle) return true
    return (
      player.name.toLowerCase().includes(needle) ||
      player.club.toLowerCase().includes(needle) ||
      player.id.toLowerCase().includes(needle)
    )
  })
  // Best first: an operator looking up "레알" wants the cards people notice.
  found.sort((a, b) => b.ovr - a.ovr)
  return found.slice(0, limit)
}

function entryBody(fix: PlayerOverride): string {
  const parts: string[] = []
  if (fix.position) parts.push(`position: '${fix.position}'`)
  if (fix.positions) parts.push(`positions: [${fix.positions.map((item) => `'${item}'`).join(', ')}]`)
  if (fix.stats) {
    parts.push(`stats: { ${STAT_KEYS.filter((key) => fix.stats?.[key] !== undefined)
      .map((key) => `${key}: ${fix.stats?.[key]}`)
      .join(', ')} }`)
  }
  if (fix.hidden) {
    parts.push(`hidden: { ${HIDDEN_KEYS.filter((key) => fix.hidden?.[key] !== undefined)
      .map((key) => `${key}: ${fix.hidden?.[key]}`)
      .join(', ')} }`)
  }
  return `{ ${parts.join(', ')} }`
}

/** One line of the overrides map, with the player's name written beside it. */
export function overrideLine(id: string, fix: PlayerOverride, name?: string): string {
  const comment = name ? ` // ${name}` : ''
  return `  '${id}': ${entryBody(fix)},${comment}`
}

/**
 * The whole block to paste, committed corrections and this session's together.
 * Pasting the block rather than a line means an operator who edited the same
 * card twice does not end up with two entries, only the later of which counts.
 */
export function overridesBlock(edits: EditMap): string {
  const merged: Record<string, PlayerOverride> = {}
  for (const [id, fix] of Object.entries(PLAYER_OVERRIDES)) merged[id] = fix
  for (const [id, edit] of Object.entries(edits)) {
    const fix = tighten(id, edit)
    if (isEmpty(fix)) delete merged[id]
    else merged[id] = fix
  }
  const ids = Object.keys(merged).sort()
  const lines = ids.map((id) => overrideLine(id, merged[id], currentPlayer(id)?.name))
  const body = lines.length ? `\n${lines.join('\n')}\n` : ''
  return `export const PLAYER_OVERRIDES: Record<string, PlayerOverride> = {${body}}`
}

export function pasteInstructions(): string {
  return [
    'lib/rosterOverrides.ts를 열고 PLAYER_OVERRIDES 블록을 통째로 이 내용으로 바꾸세요.',
    '적지 않은 능력치는 지금처럼 자동으로 생성됩니다.',
    '커밋하고 배포한 뒤, 뽑기는 서버가 하므로 함수도 다시 배포해야 합니다:',
    'npm run build:functions && npx supabase functions deploy draw-pack',
  ].join('\n')
}
