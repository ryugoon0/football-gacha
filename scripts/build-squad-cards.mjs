import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * 실제 스쿼드 데이터(data/squads/*.json) → lib/rosterSquads.ts
 *
 * 각 JSON은 실존 클럽 한 곳의 현재 스쿼드다. 게임에 들어가는 것은 가명·
 * 포지션·국적·종합치뿐이고, 실명은 운영자 화면의 실명 힌트로만 나간다
 * (rosterRealHints.ts의 이중화 원칙). 생년·등번호는 운영자 자료다.
 *
 * 카드 id는 명단 내 위치라서, 여기서 만든 행은 항상 LATE_ADDITIONS 뒤에
 * 붙는다(lib/players.ts). 새 클럽은 파일 순서(파일명 정렬) 뒤에 추가한다 —
 * 앞에 끼워 넣으면 뒤 카드들의 id가 밀린다.
 *
 * JSON 필드: club(가명 클럽), realClub, league(게임 리그명), pilot(true면 미공개),
 * players[]: key, number, name(가명), real(실명), pos, nation, birthYear, ovr,
 * stats?, hidden?.
 *
 * pilot이 아닌 클럽은 "공개된 실제 스쿼드"라서, 같은 가명 클럽의 옛 생성 카드는
 * lib/players.ts가 뽑기 풀에서 뺀다(SQUAD_REPLACED_CLUBS).
 *
 * 실행: npm run build:squads
 */
const DIR = 'data/squads'

function rarityFor(ovr) {
  if (ovr >= 86) return 'World'
  if (ovr >= 82) return 'Live'
  if (ovr >= 76) return 'Legend'
  if (ovr >= 68) return 'Rare'
  return 'Normal'
}

const rows = { Normal: [], Rare: [], Legend: [], Live: [], World: [] }
const realHints = {}
const portraits = {}
const meta = {}
const clubs = []
const replaced = []

// 가명은 저장소 전체에서 하나여야 한다 — 생성 명단(lib/rosterData.ts)과 수기 명단
// (lib/players.ts)의 행 `['이름', 'POS', ...]` 에서 이름을 긁어 함께 검사한다. 전에는
// squads 파일끼리만 봐서 rosterGrowth 테스트에서야 걸렸다.
const POSITIONS = 'GK|CB|LB|RB|CDM|CM|CAM|LM|RM|LW|RW|ST'
const takenNames = new Map()
for (const source of ['lib/rosterData.ts', 'lib/players.ts']) {
  const text = readFileSync(source, 'utf8')
  const pattern = new RegExp(`\\['((?:[^'\\\\]|\\\\.)+)',\\s*'(?:${POSITIONS})'`, 'g')
  for (const match of text.matchAll(pattern)) takenNames.set(match[1].replace(/\\'/g, "'"), source)
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
for (const file of files) {
  const squad = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  if (!squad.club || !squad.league) throw new Error(`${file}: club·league 필드가 필요합니다`)
  clubs.push({ name: squad.club, league: squad.league })
  if (squad.pilot !== true) replaced.push(squad.club)
  const numbers = new Set()
  for (const p of squad.players) {
    if (realHints[p.name]) throw new Error(`가명 중복: ${p.name} (${file})`)
    if (takenNames.has(p.name)) throw new Error(`가명 중복: ${p.name} (${file}) — ${takenNames.get(p.name)} 에 같은 이름이 있습니다`)
    if (!p.key) throw new Error(`${file}: ${p.name} 에 key 가 없습니다`)
    if (p.number !== null && p.number !== undefined) {
      if (numbers.has(p.number)) throw new Error(`${file}: 등번호 중복 ${p.number}`)
      numbers.add(p.number)
    }
    const extras = { squad: true, unreleased: squad.pilot === true }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    // The season the file describes ("2026-27 (2026-09-05 기준)" → "2026-27").
    const season = typeof squad.season === 'string' ? squad.season.split(' ')[0] : undefined
    if (season) extras.season = season
    // A current player good enough for the World list stays in it (ids never
    // move) but plays as 플래티넘: the World grade is for past-season legends
    // (docs/CARD_GRADES_PLAN.md).
    const list = rarityFor(p.ovr)
    if (list === 'World') extras.rarity = 'Live'
    rows[list].push([p.name, p.pos, p.ovr, squad.club, p.nation, extras])
    realHints[p.name] = `${p.real} (${squad.realClub}${p.number ? ` #${p.number}` : ''})`
    portraits[p.name] = p.key
    meta[p.key] = { name: p.name, nation: p.nation, birthYear: p.birthYear, pos: p.pos, club: squad.club }
  }
}

// 월드 카드 — 과거 시즌 레전드 (data/world/*.json). 한 파일이 리그 하나; 항목마다 당시 가명
// 클럽·시즌을 갖는다. World 목록에 들어가고 등급도 World 그대로다. 파일 순서·항목 순서가 id 라
// 새 카드는 파일 끝(또는 새 파일)에만 붙인다.
const WORLD_DIR = 'data/world'
const worldFiles = existsSync(WORLD_DIR) ? readdirSync(WORLD_DIR).filter((f) => f.endsWith('.json')).sort() : []
for (const file of worldFiles) {
  const set = JSON.parse(readFileSync(join(WORLD_DIR, file), 'utf8'))
  if (!set.league) throw new Error(`${file}: league 필드가 필요합니다`)
  for (const p of set.players) {
    if (realHints[p.name] || takenNames.has(p.name)) throw new Error(`가명 중복: ${p.name} (${file})`)
    if (!p.key || !p.club || !p.season) throw new Error(`${file}: ${p.name} 에 key·club·season 이 필요합니다`)
    if (!clubs.some((c) => c.name === p.club)) clubs.push({ name: p.club, league: set.league })
    const extras = { squad: true, rarity: 'World', season: p.season, unreleased: set.pilot === true }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    rows.World.push([p.name, p.pos, p.ovr, p.club, p.nation, extras])
    realHints[p.name] = `${p.real} (${p.realClub} ${p.season})`
    portraits[p.name] = p.key
    meta[p.key] = { name: p.name, nation: p.nation, birthYear: p.birthYear, pos: p.pos, club: p.club }
  }
}

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
const rowLine = ([name, pos, ovr, club, nation, extras]) =>
  `    [${q(name)}, ${q(pos)}, ${ovr}, ${q(club)}, ${q(nation)}, ${JSON.stringify(extras)}],`

const out = `// scripts/build-squad-cards.mjs가 data/squads/*.json에서 만든다. 손으로 고치지 않는다.
import type { Rarity } from './types'
import type { ClubDef, RosterRow } from './players'

/** 실제 스쿼드 기반 카드 — ROSTER에서 LATE_ADDITIONS 뒤에 붙는다. */
export const SQUAD_ROSTER: Record<Rarity, RosterRow[]> = {
${Object.entries(rows)
  .map(([rarity, list]) => `  ${rarity}: [\n${list.map(rowLine).join('\n')}\n  ],`)
  .join('\n')}
}

/** 실제 스쿼드가 있는 클럽과 그 리그 — CLUBS에 없는 클럽(승격팀 등)을 보탠다. */
export const SQUAD_CLUBS: ClubDef[] = ${JSON.stringify(clubs, null, 2)}

/** 공개된(pilot 아님) 실제 스쿼드 클럽 — 같은 클럽의 옛 생성 카드는 뽑기 풀에서 빠진다. */
export const SQUAD_REPLACED_CLUBS: string[] = ${JSON.stringify(replaced, null, 2)}

/** 운영자 전용 — 가명 → 실명 (실제 클럽 #등번호). 정확한 1:1 매핑. */
export const SQUAD_REAL_HINTS: Record<string, string> = ${JSON.stringify(realHints, null, 2)}

/** 가명 → 초상 파일 키 (public/players/<key>.webp). */
export const SQUAD_PORTRAITS: Record<string, string> = ${JSON.stringify(portraits, null, 2)}

/** 초상 생성 프롬프트용 속성. */
export const SQUAD_PORTRAIT_META: Record<string, { name: string; nation: string; birthYear: number; pos: string; club: string }> = ${JSON.stringify(meta, null, 2)}
`
writeFileSync('lib/rosterSquads.ts', out)
const total = Object.values(rows).reduce((n, list) => n + list.length, 0)
console.log(`스쿼드 카드 ${total}장 (${files.length}개 클럽, 공개 ${replaced.length}개) → lib/rosterSquads.ts`)
