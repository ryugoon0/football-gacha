import { PLAYERS, buildPlayer } from './players'
import { PLAYER_OVERRIDES, type PlayerOverride } from './rosterOverrides'
import { HIDDEN_KEYS, HIDDEN_RANGE, STAT_KEYS, STAT_LABELS, STAT_RANGE } from './cardMaker'
import { STAT_GROUPS, SUB_STATS, subStatsOf, type StatGroup } from './subStats'
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
  /** Hand-pinned detailed breakdown per headline stat — see lib/subStats.ts. */
  subStats: Partial<Record<StatGroup, number[]>>
  hidden: Partial<HiddenStats>
}

/** Everything the operator has changed this session, keyed by card id. */
export type EditMap = Record<string, PlayerEdit>

export const emptyEdit = (): PlayerEdit => ({ stats: {}, subStats: {}, hidden: {} })

function samePositions(a: Position[], b: Position[]): boolean {
  if (a.length !== b.length) return false
  const sorted = [...b].sort()
  return [...a].sort().every((item, index) => item === sorted[index])
}

function sameNumbers(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
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
  const subStats: Partial<Record<StatGroup, number[]>> = {}
  for (const group of STAT_GROUPS) {
    const pinned = fix.subStats?.[group]
    if (pinned) subStats[group] = [...pinned]
  }
  return {
    position: fix.position,
    positions: fix.positions ? [...fix.positions] : undefined,
    stats: { ...fix.stats },
    subStats,
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
  const subStats: Partial<Record<StatGroup, number[]>> = {}
  for (const group of STAT_GROUPS) {
    const values = edit.subStats[group]
    if (!values) continue
    const defaults = shaped ? subStatsOf(shaped, group, 1).map((s) => s.value) : null
    if (!defaults || !sameNumbers(values, defaults)) subStats[group] = values
  }
  if (Object.keys(stats).length) fix.stats = stats
  if (Object.keys(subStats).length) fix.subStats = subStats
  if (Object.keys(hidden).length) fix.hidden = hidden
  return fix
}

export function isEmpty(fix: PlayerOverride): boolean {
  return !fix.position && !fix.positions && !fix.stats && !fix.subStats && !fix.hidden
}

/** The card as it will be once the edit is committed. */
export function previewEdit(id: string, edit: PlayerEdit): PlayerDef | null {
  return buildPlayer(id, tighten(id, edit))
}

/**
 * `headlineOf` gives the effective headline stat for a group (the pinned
 * override if any, otherwise whatever the auto-generated card has) — the
 * caller already has this from a preview, so it is passed in rather than
 * recomputed here.
 */
export function validateEdit(edit: PlayerEdit, headlineOf?: (group: StatGroup) => number): string | null {
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
  for (const group of STAT_GROUPS) {
    const values = edit.subStats[group]
    if (!values) continue
    const expected = SUB_STATS[group].length
    if (values.length !== expected) {
      return `${STAT_LABELS[group]} 세부 능력치는 ${expected}개를 모두 채워야 합니다.`
    }
    for (const value of values) {
      if (!Number.isInteger(value) || value < STAT_RANGE.min || value > STAT_RANGE.max) {
        return `${STAT_LABELS[group]} 세부 능력치는 ${STAT_RANGE.min}에서 ${STAT_RANGE.max} 사이여야 합니다.`
      }
    }
    if (headlineOf) {
      const headline = headlineOf(group)
      const sum = values.reduce((total, value) => total + value, 0)
      if (sum !== headline * values.length) {
        return `${STAT_LABELS[group]} 세부 능력치는 평균이 ${headline}이어야 합니다 (지금 합계로는 평균 ${(sum / values.length).toFixed(1)}).`
      }
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
  if (fix.subStats) {
    const groups = STAT_GROUPS.filter((group) => fix.subStats?.[group] !== undefined)
    parts.push(
      `subStats: { ${groups.map((group) => `${group}: [${fix.subStats?.[group]?.join(', ')}]`).join(', ')} }`,
    )
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
    'lib/rosterOverrides.ts를 열고 PLAYER_OVERRIDES 블록을 이 내용으로 바꾸세요.',
    '주의: 이 화면이 아는 건 지금 켜져 있는 페이지가 불러온 시점의 파일뿐입니다.',
    '그 뒤 다른 세션이나 다른 사람이 커밋한 항목은 여기 안 보입니다 —',
    '통째로 덮어쓰기 전에 실제 파일을 열어 이 목록에 없는 다른 선수 항목이',
    '있는지 먼저 확인하고, 있다면 지우지 말고 이 항목만 더해 넣으세요.',
    '적지 않은 능력치는 지금처럼 자동으로 생성됩니다.',
    '커밋하고 배포한 뒤, 뽑기·경기 판정도 서버가 하므로 함수도 다시 배포해야 합니다:',
    'npm run build:functions && npx supabase functions deploy draw-pack && npx supabase functions deploy simulate-match',
  ].join('\n')
}
