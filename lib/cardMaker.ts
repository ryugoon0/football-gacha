import { CLUBS, NATIONS, RARITY_PREFIX, ROSTER, buildStats, computeOvr } from './players'
import type { PlayerDef, Position, Rarity, Stats } from './types'

/**
 * Building a new player card.
 *
 * A card cannot be created at runtime: the roster is bundled into the Edge
 * Function so that a pull the server settles is drawn from a pool nobody can
 * change from a browser. Letting the database add cards would mean the server
 * and the game disagree about what exists.
 *
 * So this makes the roster line instead. The operator fills in the card, sees
 * exactly what it will become — the same code the game uses builds the preview —
 * and pastes one line into lib/players.ts. No guessing, and no developer.
 */

export interface CardDraft {
  name: string
  position: Position
  ovr: number
  club: string
  nation: string
  rarity: Rarity
}

export const OVR_RANGE = { min: 40, max: 99 }

/** Every position a roster row may name. */
export const POSITION_CHOICES: Position[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST',
]

export function emptyDraft(): CardDraft {
  return { name: '', position: 'ST', ovr: 70, club: CLUBS[0].name, nation: NATIONS[0], rarity: 'Rare' }
}

export function validateDraft(draft: CardDraft): string | null {
  const name = draft.name.trim()
  if (!name) return '선수 이름을 입력해 주세요.'
  if (name.length > 12) return '이름은 12자까지 쓸 수 있습니다.'
  if (name.includes("'")) return "이름에 작은따옴표(')는 쓸 수 없습니다."
  if (!POSITION_CHOICES.includes(draft.position)) return '포지션을 골라 주세요.'
  if (!Number.isInteger(draft.ovr) || draft.ovr < OVR_RANGE.min || draft.ovr > OVR_RANGE.max) {
    return `종합 능력치는 ${OVR_RANGE.min}에서 ${OVR_RANGE.max} 사이여야 합니다.`
  }
  if (nameTaken(draft.name)) return '같은 이름의 선수가 이미 있습니다.'
  return null
}

export function nameTaken(name: string): boolean {
  const wanted = name.trim()
  return Object.values(ROSTER).some((rows) => rows.some((row) => row[0] === wanted))
}

/** The id this card will get — the next free number in its rarity. */
export function nextId(rarity: Rarity): string {
  const index = ROSTER[rarity].length + 1
  return `${RARITY_PREFIX[rarity]}${String(index).padStart(2, '0')}`
}

/**
 * The card as the game will actually build it. The stats are shaped by the
 * position and normalised back to the target overall, so what you type is not
 * quite what you get — better to see it now than after a deploy.
 */
export function previewCard(draft: CardDraft): PlayerDef & { stats: Stats } {
  const id = nextId(draft.rarity)
  const stats = buildStats(id, draft.position, draft.ovr)
  const club = CLUBS.find((item) => item.name === draft.club) ?? CLUBS[0]
  return {
    id,
    name: draft.name.trim() || '이름 없음',
    position: draft.position,
    positions: [draft.position],
    rarity: draft.rarity,
    nation: draft.nation,
    club: club.name,
    league: club.league,
    stats,
    hidden: { clutch: 0, stamina: 0, bigMatch: 0, consistency: 0 },
    ovr: computeOvr(stats, draft.position),
  }
}

/** The line to paste into ROSTER in lib/players.ts. */
export function rosterLine(draft: CardDraft): string {
  const name = draft.name.trim()
  return `    ['${name}', '${draft.position}', ${draft.ovr}, '${draft.club}', '${draft.nation}'],`
}

export function pasteInstructions(draft: CardDraft): string {
  return [
    `lib/players.ts를 열고 ROSTER의 ${draft.rarity} 목록 맨 아래에 이 줄을 넣으세요.`,
    '그다음 커밋하고 배포하면 됩니다. 뽑기는 서버가 하므로 함수도 다시 배포해야 합니다:',
    'npm run build:functions && npx supabase functions deploy draw-pack',
  ].join('\n')
}
