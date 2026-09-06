import { CLUBS, HIDDEN_MAX, NATIONS, RARITY_PREFIX, ROSTER, buildStats, computeOvr } from './players'
import type { HiddenStats, PlayerDef, Position, Rarity, Stats } from './types'

/**
 * Building a new player card.
 *
 * A card cannot be created at runtime: the roster is bundled into the Edge
 * Function so a pull the server settles comes from a pool nobody can change
 * from a browser. Letting the database add cards would mean the server and the
 * game disagree about what exists.
 *
 * So this makes the roster line instead. The operator fills in the card, sees
 * exactly what it will become — the same code the game uses builds the preview
 * — and pastes one line into lib/players.ts.
 */

export interface CardDraft {
  name: string
  position: Position
  ovr: number
  club: string
  nation: string
  rarity: Rarity
  /** Only the stats the operator pinned. The rest stay generated. */
  stats: Partial<Stats>
  hidden: Partial<HiddenStats>
}

export const OVR_RANGE = { min: 40, max: 99 }
export const STAT_RANGE = { min: 1, max: 99 }
export const HIDDEN_RANGE = { min: 0, max: HIDDEN_MAX }

export const POSITION_CHOICES: Position[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST',
]

export const STAT_KEYS: (keyof Stats)[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']
export const HIDDEN_KEYS: (keyof HiddenStats)[] = ['clutch', 'stamina', 'bigMatch', 'consistency']

export const STAT_LABELS: Record<keyof Stats, string> = {
  pac: '속도',
  sho: '슛',
  pas: '패스',
  dri: '드리블',
  def: '수비',
  phy: '피지컬',
}

export const HIDDEN_LABELS: Record<keyof HiddenStats, { label: string; note: string }> = {
  clutch: { label: '결정력', note: '만든 기회를 골로 바꾸는 능력.' },
  stamina: { label: '지구력', note: '천천히 지칩니다.' },
  bigMatch: { label: '큰 경기', note: '컵과 결승에서 더 합니다.' },
  consistency: { label: '기복', note: '높을수록 부진한 날이 드뭅니다.' },
}

export function emptyDraft(): CardDraft {
  return {
    name: '',
    position: 'ST',
    ovr: 70,
    club: CLUBS[0].name,
    nation: NATIONS[0],
    rarity: 'Rare',
    stats: {},
    hidden: {},
  }
}

export function nameTaken(name: string): boolean {
  const wanted = name.trim()
  return Object.values(ROSTER).some((rows) => rows.some((row) => row[0] === wanted))
}

function outOfRange(value: number, range: { min: number; max: number }): boolean {
  return !Number.isInteger(value) || value < range.min || value > range.max
}

export function validateDraft(draft: CardDraft): string | null {
  const name = draft.name.trim()
  if (!name) return '선수 이름을 입력해 주세요.'
  if (name.length > 12) return '이름은 12자까지 쓸 수 있습니다.'
  if (name.includes("'")) return "이름에 작은따옴표(')는 쓸 수 없습니다."
  if (!POSITION_CHOICES.includes(draft.position)) return '포지션을 골라 주세요.'
  if (outOfRange(draft.ovr, OVR_RANGE)) {
    return `종합 능력치는 ${OVR_RANGE.min}에서 ${OVR_RANGE.max} 사이의 정수여야 합니다.`
  }
  for (const key of STAT_KEYS) {
    const value = draft.stats[key]
    if (value !== undefined && outOfRange(value, STAT_RANGE)) {
      return `${STAT_LABELS[key]}은(는) ${STAT_RANGE.min}에서 ${STAT_RANGE.max} 사이여야 합니다.`
    }
  }
  for (const key of HIDDEN_KEYS) {
    const value = draft.hidden[key]
    if (value !== undefined && outOfRange(value, HIDDEN_RANGE)) {
      return `${HIDDEN_LABELS[key].label}은(는) ${HIDDEN_RANGE.min}에서 ${HIDDEN_RANGE.max} 사이여야 합니다.`
    }
  }
  if (nameTaken(name)) return '같은 이름의 선수가 이미 있습니다.'
  return null
}

/** The id this card will get — the next free number in its rarity. */
export function nextId(rarity: Rarity): string {
  return `${RARITY_PREFIX[rarity]}${String(ROSTER[rarity].length + 1).padStart(2, '0')}`
}

/** The stats the generator would produce for this draft, before any pinning. */
export function generatedStats(draft: CardDraft): Stats {
  return buildStats(nextId(draft.rarity), draft.position, draft.ovr)
}

/**
 * The card as the game will actually build it. Stats are shaped by the position
 * and normalised back to the target overall, so what you type is not quite what
 * you get — better to see it now than after a deploy.
 */
export function previewCard(draft: CardDraft): PlayerDef {
  const id = nextId(draft.rarity)
  const stats: Stats = { ...generatedStats(draft), ...draft.stats }
  const club = CLUBS.find((item) => item.name === draft.club) ?? CLUBS[0]
  return {
    id,
    person: id,
    name: draft.name.trim() || '이름 없음',
    position: draft.position,
    positions: [draft.position],
    rarity: draft.rarity,
    nation: draft.nation,
    club: club.name,
    league: club.league,
    stats,
    hidden: {
      clutch: draft.hidden.clutch ?? 0,
      stamina: draft.hidden.stamina ?? 0,
      bigMatch: draft.hidden.bigMatch ?? 0,
      consistency: draft.hidden.consistency ?? 0,
    },
    ovr: computeOvr(stats, draft.position),
  }
}

function pinned(draft: CardDraft): string {
  const parts: string[] = []
  const stats = STAT_KEYS.filter((key) => draft.stats[key] !== undefined)
    .map((key) => `${key}: ${draft.stats[key]}`)
  const hidden = HIDDEN_KEYS.filter((key) => draft.hidden[key] !== undefined)
    .map((key) => `${key}: ${draft.hidden[key]}`)
  if (stats.length) parts.push(`stats: { ${stats.join(', ')} }`)
  if (hidden.length) parts.push(`hidden: { ${hidden.join(', ')} }`)
  return parts.length ? `, { ${parts.join(', ')} }` : ''
}

/** The line to paste into ROSTER in lib/players.ts. */
export function rosterLine(draft: CardDraft): string {
  const name = draft.name.trim()
  return `    ['${name}', '${draft.position}', ${draft.ovr}, '${draft.club}', '${draft.nation}'${pinned(draft)}],`
}

export function pasteInstructions(draft: CardDraft): string {
  return [
    `lib/players.ts를 열고 ROSTER의 ${draft.rarity} 목록 맨 아래에 이 줄을 넣으세요.`,
    '적지 않은 능력치는 종합과 포지션에 맞춰 그대로 생성됩니다.',
    '커밋하고 배포한 뒤, 뽑기는 서버가 하므로 함수도 다시 배포해야 합니다:',
    'npm run build:functions && npx supabase functions deploy draw-pack',
  ].join('\n')
}
