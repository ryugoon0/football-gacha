import { hashString, pickInRange, seededRandom } from './random'
import { PLAYER_OVERRIDES, type PlayerOverride } from './rosterOverrides'
import { GENERATED_CLUBS, GENERATED_ROSTER } from './rosterData'
import { RARITY_TIERS, startLevelOf, MAX_LEVEL } from './rarity'
import type { HiddenStats, PlayerDef, Position, PositionGroup, Rarity, Stats } from './types'

export { hashString, seededRandom }

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  CDM: 'MF',
  CM: 'MF',
  CAM: 'MF',
  LM: 'MF',
  RM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW',
}

/** How much each of the six stats counts towards a player's overall, per position. */
const OVR_WEIGHTS: Record<Position, Stats> = {
  GK: { pac: 0.05, sho: 0.0, pas: 0.1, dri: 0.05, def: 0.6, phy: 0.2 },
  CB: { pac: 0.1, sho: 0.02, pas: 0.08, dri: 0.05, def: 0.45, phy: 0.3 },
  LB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  RB: { pac: 0.22, sho: 0.05, pas: 0.18, dri: 0.15, def: 0.28, phy: 0.12 },
  CDM: { pac: 0.08, sho: 0.06, pas: 0.24, dri: 0.12, def: 0.35, phy: 0.15 },
  CM: { pac: 0.1, sho: 0.14, pas: 0.32, dri: 0.22, def: 0.14, phy: 0.08 },
  CAM: { pac: 0.12, sho: 0.22, pas: 0.3, dri: 0.28, def: 0.03, phy: 0.05 },
  LM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  RM: { pac: 0.22, sho: 0.14, pas: 0.24, dri: 0.28, def: 0.06, phy: 0.06 },
  LW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  RW: { pac: 0.25, sho: 0.22, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.06 },
  ST: { pac: 0.22, sho: 0.36, pas: 0.08, dri: 0.2, def: 0.01, phy: 0.13 },
}

/** Shape of a player before the overall is normalised back to the target. */
const ARCHETYPE: Record<Position, Stats> = {
  GK: { pac: -25, sho: -45, pas: -12, dri: -25, def: 12, phy: 6 },
  CB: { pac: -8, sho: -30, pas: -10, dri: -14, def: 14, phy: 12 },
  LB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  RB: { pac: 8, sho: -18, pas: 2, dri: 0, def: 6, phy: -2 },
  CDM: { pac: -4, sho: -10, pas: 4, dri: -2, def: 12, phy: 8 },
  CM: { pac: -2, sho: 0, pas: 10, dri: 4, def: 0, phy: 0 },
  CAM: { pac: 2, sho: 6, pas: 10, dri: 10, def: -22, phy: -8 },
  LM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  RM: { pac: 8, sho: 0, pas: 6, dri: 8, def: -12, phy: -6 },
  LW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  RW: { pac: 12, sho: 6, pas: 0, dri: 12, def: -28, phy: -10 },
  ST: { pac: 8, sho: 14, pas: -8, dri: 6, def: -32, phy: 4 },
}

const STAT_KEYS: (keyof Stats)[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

export const STAT_LABELS: Record<keyof Stats, string> = {
  pac: '속도',
  sho: '슈팅',
  pas: '패스',
  dri: '드리블',
  def: '수비',
  phy: '피지컬',
}

/** Goalkeepers use the same six slots with different meanings. */
export const GK_STAT_LABELS: Record<keyof Stats, string> = {
  pac: '반응',
  sho: '펀칭',
  pas: '킥',
  dri: '핸들링',
  def: '선방',
  phy: '위치선정',
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function computeOvr(stats: Stats, position: Position): number {
  const w = OVR_WEIGHTS[position]
  const total = STAT_KEYS.reduce((sum, key) => sum + stats[key] * w[key], 0)
  return Math.round(total)
}

/**
 * Exported so the operator's card maker can show the exact card a roster row
 * would produce, rather than a guess that turns out different after a deploy.
 */
export function buildStats(id: string, position: Position, target: number): Stats {
  const rng = seededRandom(hashString(id))
  const shape = ARCHETYPE[position]

  // The shape of a position is a fixed offset, which read badly at the top of
  // the game: a 78 centre back and a 55 centre back were both docked the same
  // 40-odd points of shooting, so the gold defender's card showed numbers a
  // bronze striker would beat. A better player is better at the parts of the
  // game that are not their job too, so the offset eases off as the target
  // rises. The overall is normalised back to the target below either way.
  const easing = 1 - Math.min(0.35, Math.max(0, target - 58) / 100)

  const raw: Record<string, number> = {}
  for (const key of STAT_KEYS) {
    raw[key] = target + shape[key] * easing + (rng() * 8 - 4)
  }
  // Nudge everything so the weighted overall lands back on the target.
  const w = OVR_WEIGHTS[position]
  const mean = STAT_KEYS.reduce((sum, key) => sum + raw[key] * w[key], 0)
  const shift = target - mean
  const stats = {} as Stats
  for (const key of STAT_KEYS) {
    // The floor rises with the card. Nobody at this level is a 24 at anything.
    stats[key] = clamp(Math.round(raw[key] + shift), Math.max(24, Math.round(target * 0.36)), 99)
  }
  return stats
}

/** Positions a player can cover besides their main one. */
const NEARBY_POSITIONS: Record<Position, Position[]> = {
  GK: [],
  CB: ['CDM'],
  LB: ['LM', 'CB'],
  RB: ['RM', 'CB'],
  CDM: ['CM', 'CB'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'LM', 'RM'],
  LM: ['LW', 'LB'],
  RM: ['RW', 'RB'],
  LW: ['LM', 'ST'],
  RW: ['RM', 'ST'],
  ST: ['CAM', 'LW', 'RW'],
}

/** Hidden attribute range per rarity: the gap that survives maxed out stats. */
const HIDDEN_RANGE: Record<Rarity, [min: number, max: number]> = {
  Normal: [0, 3],
  Rare: [2, 5],
  Legend: [5, 8],
  Live: [7, 10],
  World: [9, 12],
}

export const HIDDEN_MAX = 12

function buildPositions(id: string, position: Position, rarity: Rarity): Position[] {
  if (position === 'GK') return ['GK']
  const nearby = NEARBY_POSITIONS[position]
  // Better cards are likelier to be comfortable in more than one role.
  const extra = pickInRange(hashString(`${id}:pos`), 0, rarity === 'Normal' ? 1 : 2)
  return [position, ...nearby.slice(0, Math.min(extra, nearby.length))]
}

function buildHidden(id: string, rarity: Rarity): HiddenStats {
  const [min, max] = HIDDEN_RANGE[rarity]
  const rng = seededRandom(hashString(`${id}:hidden`))
  const roll = () => min + Math.round(rng() * (max - min))
  return { clutch: roll(), stamina: roll(), bigMatch: roll(), consistency: roll() }
}

/** Average of the hidden attributes, 0-12. */
export function hiddenPower(player: PlayerDef): number {
  const { clutch, stamina, bigMatch, consistency } = player.hidden
  return (clutch + stamina + bigMatch + consistency) / 4
}

export const NATIONS = [
  '대한민국',
  '브라질',
  '잉글랜드',
  '스페인',
  '프랑스',
  '독일',
  '이탈리아',
  '아르헨티나',
  '포르투갈',
  '네덜란드',
  '벨기에',
  '노르웨이',
  '크로아티아',
  '이집트',
  '일본',
]

export interface ClubDef {
  name: string
  league: string
}

/**
 * Clubs and leagues are invented, but named so you can tell which real side
 * they are winking at. Nothing here uses a real club, league or player name.
 */
const HAND_WRITTEN_CLUBS: ClubDef[] = [
  { name: '전북 모터스', league: '코리아 리그' },
  { name: '울산 호랑', league: '코리아 리그' },
  { name: '포항 스틸맨', league: '코리아 리그' },
  { name: '서울 캐피탈', league: '코리아 리그' },
  { name: '수원 블루버드', league: '코리아 리그' },
  { name: '맨체스 레즈', league: '킹덤 리그' },
  { name: '맨체스 블루', league: '킹덤 리그' },
  { name: '리버 머지', league: '킹덤 리그' },
  { name: '런던 블루스', league: '킹덤 리그' },
  { name: '북런던 건너스', league: '킹덤 리그' },
  { name: '북런던 화이트', league: '킹덤 리그' },
  { name: '마드리드 블랑코', league: '이베리아 리가' },
  { name: '카탈루냐 블라우', league: '이베리아 리가' },
  { name: '마드리드 로히블랑', league: '이베리아 리가' },
  { name: '세비야 로호', league: '이베리아 리가' },
  { name: '발렌시아 바트', league: '이베리아 리가' },
  { name: '밀라노 네로', league: '아주로 세리에' },
  { name: '토리노 비앙코', league: '아주로 세리에' },
  { name: '뮌헨 바바리안', league: '게르만 리가' },
  { name: '파리 캐피탈', league: '콘티넨탈 리그' },
  { name: '도르트 옐로우', league: '게르만 리가' },
]

/**
 * Every club. The hand written ones keep their names; the generated leagues
 * fill the rest out to twenty sides each. A club that appears in both lists
 * is kept once — the generated file reuses several of the original names.
 */
export const CLUBS: ClubDef[] = [
  ...HAND_WRITTEN_CLUBS.filter(
    (club) => !GENERATED_CLUBS.some((other) => other.name === club.name),
  ),
  ...GENERATED_CLUBS,
]

export const LEAGUE_OF_CLUB: Record<string, string> = CLUBS.reduce(
  (map, club) => {
    map[club.name] = club.league
    return map
  },
  {} as Record<string, string>,
)

export const LEAGUES = Array.from(new Set(CLUBS.map((club) => club.league)))

/**
 * Anything a roster row wants to pin down rather than let the generator decide.
 *
 * Left out, stats are shaped from the position and normalised to the overall,
 * and the hidden attributes are drawn from the rarity's band. A row that cares
 * about a particular player says so here, and only for the fields it names.
 */
export interface RosterExtras {
  stats?: Partial<Stats>
  hidden?: Partial<HiddenStats>
}

export type RosterRow = [
  name: string,
  position: Position,
  ovr: number,
  club?: string,
  nation?: string,
  extras?: RosterExtras,
]

/**
 * Every name is invented. The higher tiers are written to hint at the real
 * player they are modelled on — same shirt, same country, a name one letter
 * off — without borrowing anyone's actual name.
 */
const HAND_WRITTEN: Record<Rarity, RosterRow[]> = {
  Normal: [
    ['김준성', 'GK', 58, '전북 모터스', '대한민국'],
    ['박철벽', 'GK', 61, '울산 호랑', '대한민국'],
    ['이막내', 'CB', 55, '포항 스틸맨', '대한민국'],
    ['최수비', 'CB', 60, '서울 캐피탈', '대한민국'],
    ['정태클', 'CB', 57, '수원 블루버드', '대한민국'],
    ['노장현', 'CB', 53, '전북 모터스', '대한민국'],
    ['한동네', 'LB', 56, '울산 호랑', '대한민국'],
    ['배후방', 'LB', 52, '포항 스틸맨', '대한민국'],
    ['오른발', 'RB', 58, '서울 캐피탈', '대한민국'],
    ['서포백', 'RB', 54, '수원 블루버드', '대한민국'],
    ['강중원', 'CDM', 59, '전북 모터스', '대한민국'],
    ['도루묵', 'CDM', 55, '울산 호랑', '대한민국'],
    ['남기훈', 'CM', 62, '포항 스틸맨', '대한민국'],
    ['조패스', 'CM', 57, '서울 캐피탈', '대한민국'],
    ['윤드리', 'CAM', 63, '수원 블루버드', '대한민국'],
    ['임측면', 'LM', 56, '전북 모터스', '대한민국'],
    ['백윙어', 'RM', 58, '울산 호랑', '대한민국'],
    ['신발끝', 'LW', 60, '포항 스틸맨', '대한민국'],
    ['황돌파', 'RW', 61, '서울 캐피탈', '대한민국'],
    ['문전앞', 'ST', 64, '수원 블루버드', '대한민국'],
    ['유골넣', 'ST', 59, '전북 모터스', '대한민국'],
    ['차벤치', 'ST', 54, '울산 호랑', '일본'],
  ],
  Rare: [
    ['조현오', 'GK', 75, '울산 호랑', '대한민국'],
    ['구성윤', 'GK', 71, '서울 캐피탈', '대한민국'],
    ['김영건', 'CB', 73, '전북 모터스', '대한민국'],
    ['권경언', 'CB', 69, '포항 스틸맨', '대한민국'],
    ['김진서', 'LB', 70, '수원 블루버드', '대한민국'],
    ['이용희', 'RB', 72, '서울 캐피탈', '대한민국'],
    ['정우연', 'CDM', 71, '전북 모터스', '대한민국'],
    ['황인법', 'CM', 72, '전북 모터스', '대한민국'],
    ['백승훈', 'CM', 75, '런던 블루스', '대한민국'],
    ['이재승', 'CAM', 74, '북런던 건너스', '대한민국'],
    ['황희창', 'CAM', 78, '맨체스 레즈', '대한민국'],
    ['손흥맨', 'LW', 76, '북런던 화이트', '대한민국'],
    ['엄지창', 'RW', 74, '도르트 옐로우', '대한민국'],
    ['정우빈', 'RW', 73, '포항 스틸맨', '대한민국'],
    ['오현식', 'ST', 77, '세비야 로호', '대한민국'],
    ['조규송', 'ST', 72, '발렌시아 바트', '대한민국'],
  ],
  Legend: [
    ['지안루 부폰', 'GK', 83, '토리노 비앙코', '이탈리아'],
    ['파올로 말디', 'CB', 84, '밀라노 네로', '이탈리아'],
    ['세르히 라모', 'CB', 83, '마드리드 블랑코', '스페인'],
    ['박지승', 'CDM', 82, '맨체스 레즈', '대한민국'],
    ['사비 에르난', 'CM', 85, '카탈루냐 블라우', '스페인'],
    ['지네 지단', 'CAM', 84, '마드리드 블랑코', '프랑스'],
    ['아리엔 로벤', 'LW', 86, '뮌헨 바바리안', '네덜란드'],
    ['차봄근', 'RW', 85, '도르트 옐로우', '대한민국'],
    ['호나우 페노', 'ST', 86, '카탈루냐 블라우', '브라질'],
    ['필리포 인자', 'ST', 87, '밀라노 네로', '이탈리아'],
  ],
  Live: [
    ['알리손 베카', 'GK', 85, '리버 머지', '브라질'],
    ['김민제', 'CB', 86, '뮌헨 바바리안', '대한민국'],
    ['주드 벨링', 'CM', 89, '마드리드 블랑코', '잉글랜드'],
    ['이강윤', 'CAM', 86, '파리 캐피탈', '대한민국'],
    ['비니시우', 'LW', 87, '마드리드 블랑코', '브라질'],
    ['모 살라', 'RW', 88, '리버 머지', '이집트'],
    ['엘링 홀란', 'ST', 88, '맨체스 블루', '노르웨이'],
  ],
  World: [
    ['얀 노이만', 'GK', 92, '뮌헨 바바리안', '독일'],
    ['판 다이컨', 'CB', 91, '리버 머지', '네덜란드'],
    ['케빈 더브라', 'CM', 95, '맨체스 블루', '벨기에'],
    ['리오 메시아', 'CAM', 93, '카탈루냐 블라우', '아르헨티나'],
    ['크리스 호날드', 'LW', 93, '마드리드 블랑코', '포르투갈'],
    ['킬리안 음바피', 'ST', 94, '파리 캐피탈', '프랑스'],
  ],
}

/**
 * Added after the generated roster already locked its ids in. Appending here
 * — after GENERATED_ROSTER, not inside HAND_WRITTEN — keeps every card issued
 * so far at exactly the id it already has in players' saves.
 */
const LATE_ADDITIONS: Partial<Record<Rarity, RosterRow[]>> = {
  World: [['마르쿠 로이센', 'CAM', 90, '도르트 옐로우', '독일']],
}

/**
 * The whole roster: the hand written cards first, then the generated squads.
 *
 * The order matters more than it looks. A card's id is its place in this list,
 * and saves store that id — so anything new has to go on the end. Put one row
 * in front of the others and every collection in the game quietly becomes a
 * different set of players.
 */
export const ROSTER: Record<Rarity, RosterRow[]> = {
  Normal: [...HAND_WRITTEN.Normal, ...GENERATED_ROSTER.Normal, ...(LATE_ADDITIONS.Normal ?? [])],
  Rare: [...HAND_WRITTEN.Rare, ...GENERATED_ROSTER.Rare, ...(LATE_ADDITIONS.Rare ?? [])],
  Legend: [...HAND_WRITTEN.Legend, ...GENERATED_ROSTER.Legend, ...(LATE_ADDITIONS.Legend ?? [])],
  Live: [...HAND_WRITTEN.Live, ...GENERATED_ROSTER.Live, ...(LATE_ADDITIONS.Live ?? [])],
  World: [...HAND_WRITTEN.World, ...GENERATED_ROSTER.World, ...(LATE_ADDITIONS.World ?? [])],
}

export const RARITY_PREFIX: Record<Rarity, string> = {
  Normal: 'n',
  Rare: 'r',
  Legend: 'lg',
  Live: 'lv',
  World: 'w',
}

/** Where a card's id comes from: its rarity list and its place in it. */
const ROW_BY_ID: Record<string, { rarity: Rarity; row: RosterRow }> = {}
for (const rarity of Object.keys(ROSTER) as Rarity[]) {
  ROSTER[rarity].forEach((row, index) => {
    ROW_BY_ID[`${RARITY_PREFIX[rarity]}${String(index + 1).padStart(2, '0')}`] = { rarity, row }
  })
}

/**
 * One card, built from its roster row.
 *
 * Exported so the operator's editor can show what a correction does before it
 * is written into lib/rosterOverrides.ts — including what the card looks like
 * with no correction at all, which is what `fix` being empty gives you.
 */
export function buildPlayer(id: string, fix: PlayerOverride = PLAYER_OVERRIDES[id] ?? {}): PlayerDef | null {
  const entry = ROW_BY_ID[id]
  if (!entry) return null
  const { rarity, row } = entry
  const [name, position, ovr, clubName, nation, extras] = row
  // A roster row may pin values, and a hand correction may override those
  // again — the correction is the last word because it is the one a person
  // made on purpose after seeing the card.
  const slot = fix.position ?? position
  const stats = {
    ...buildStats(id, slot, ovr),
    ...(extras?.stats ?? {}),
    ...(fix.stats ?? {}),
  }
  // A roster row names the club and country; anything left blank falls back
  // to a stable draw from the id so the data is never half filled.
  const rng = seededRandom(hashString(id + name))
  const club = CLUBS.find((item) => item.name === clubName) ?? CLUBS[Math.floor(rng() * CLUBS.length)]
  return {
    id,
    name,
    position: slot,
    positions: fix.positions ?? buildPositions(id, slot, rarity),
    rarity,
    nation: nation ?? NATIONS[Math.floor(rng() * NATIONS.length)],
    club: club.name,
    league: club.league,
    stats,
    subStats: fix.subStats,
    hidden: { ...buildHidden(id, rarity), ...(extras?.hidden ?? {}), ...(fix.hidden ?? {}) },
    ovr: computeOvr(stats, slot),
  }
}

function buildRoster(): PlayerDef[] {
  return Object.keys(ROW_BY_ID)
    .map((id) => buildPlayer(id))
    .filter((player): player is PlayerDef => player !== null)
}

export const PLAYERS: PlayerDef[] = buildRoster()

export const PLAYERS_BY_ID: Record<string, PlayerDef> = PLAYERS.reduce(
  (map, player) => {
    map[player.id] = player
    return map
  },
  {} as Record<string, PlayerDef>,
)

export const PLAYERS_BY_RARITY: Record<Rarity, PlayerDef[]> = PLAYERS.reduce(
  (map, player) => {
    ;(map[player.rarity] ||= []).push(player)
    return map
  },
  {} as Record<Rarity, PlayerDef[]>,
)

export function getPlayer(id: string): PlayerDef | undefined {
  return PLAYERS_BY_ID[id]
}

/** The three attributes that matter most in a position. */
export function keyStatsOf(position: Position): (keyof Stats)[] {
  const weights = OVR_WEIGHTS[position]
  return [...STAT_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 3)
}

/** How far along the growth curve a card is, 0 at its start level, 1 at ten. */
export function growthProgress(player: PlayerDef, level: number): number {
  const start = startLevelOf(player.rarity, player.id)
  const span = MAX_LEVEL - start
  if (span <= 0) return 1
  return clamp((level - start) / span, 0, 1)
}

/**
 * Levelling pushes the position's key attributes towards 99 — reached only at
 * level 10, which the lower rarities can never get to.
 */
export function effectiveStats(player: PlayerDef, level: number): Stats {
  const progress = growthProgress(player, level)
  const keys = new Set(keyStatsOf(player.position))
  const stats = {} as Stats
  for (const key of STAT_KEYS) {
    const base = player.stats[key]
    const reach = keys.has(key) ? progress : progress * 0.55
    stats[key] = Math.min(99, Math.round(base + (99 - base) * reach))
  }
  return stats
}

export function startLevel(player: PlayerDef): number {
  return startLevelOf(player.rarity, player.id)
}

export function levelCap(player: PlayerDef): number {
  return RARITY_TIERS[player.rarity].levelCap
}

export function effectiveOvr(player: PlayerDef, level: number): number {
  return computeOvr(effectiveStats(player, level), player.position)
}
