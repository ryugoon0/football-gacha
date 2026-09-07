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

// 등급 경계 (2026-09-07 확정): 플래티넘 85 · 골드 79 · 실버 72 · 일반 71 이하.
// 클럽당 플래티넘은 OVR 순 5장까지, 넘치는 선수는 골드. 아래 rarityFor 는 카드 id 를
// 정하는 목록 배치라 옛 경계 그대로 두고, 실제 등급은 extras.rarity 로 싣는다.
const GRADE_PLAT = 85
const GRADE_GOLD = 79
const GRADE_SILVER = 72
const PLAT_PER_CLUB = 5
function gradeFor(ovr) {
  if (ovr >= GRADE_PLAT) return 'Live'
  if (ovr >= GRADE_GOLD) return 'Legend'
  if (ovr >= GRADE_SILVER) return 'Rare'
  return 'Normal'
}
function gradesForSquad(players) {
  const grades = new Map()
  let plats = 0
  for (const p of [...players].sort((a, b) => b.ovr - a.ovr)) {
    let grade = gradeFor(p.ovr)
    if (grade === 'Live') {
      plats += 1
      if (plats > PLAT_PER_CLUB) grade = 'Legend'
    }
    grades.set(p, grade)
  }
  return grades
}

function rarityFor(ovr) {
  if (ovr >= 86) return 'World'
  if (ovr >= 82) return 'Live'
  if (ovr >= 76) return 'Legend'
  if (ovr >= 68) return 'Rare'
  return 'Normal'
}

const rows = { Normal: [], Rare: [], Legend: [], Live: [], World: [] }

// 같은 실존 인물의 카드(현 스쿼드·월드 시즌·리미티드)가 한 라인업에 두 번 서지 않도록,
// 실명의 FNV-1a 해시를 person 으로 붙인다. lib/personKey.ts 와 같은 알고리즘 — 이름은
// 번들에 실리지 않고 해시만 실린다.
function personKey(realName) {
  let hash = 0x811c9dc5
  const text = String(realName ?? '').normalize('NFC').trim()
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return 'p' + hash.toString(16).padStart(8, '0')
}

const realHints = {}
const portraits = {}
const meta = {}
/** 가명 → 실명, for the same-person check the 리미티드 loader makes. */
const squadRealByName = {}
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
  const grades = gradesForSquad(squad.players)
  for (const p of squad.players) {
    if (realHints[p.name]) throw new Error(`가명 중복: ${p.name} (${file})`)
    if (takenNames.has(p.name)) throw new Error(`가명 중복: ${p.name} (${file}) — ${takenNames.get(p.name)} 에 같은 이름이 있습니다`)
    if (!p.key) throw new Error(`${file}: ${p.name} 에 key 가 없습니다`)
    if (p.number !== null && p.number !== undefined) {
      if (numbers.has(p.number)) throw new Error(`${file}: 등번호 중복 ${p.number}`)
      numbers.add(p.number)
    }
    const extras = { squad: true, unreleased: squad.pilot === true, ...(p.real ? { person: personKey(p.real) } : {}) }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    // A row may pin the playable positions (측면 미드필더 conversions keep their wing).
    if (Array.isArray(p.positions) && p.positions.length > 0) extras.positions = p.positions
    // The season the file describes ("2026-27 (2026-09-05 기준)" → "2026-27").
    const season = typeof squad.season === 'string' ? squad.season.split(' ')[0] : undefined
    if (season) extras.season = season
    // The list a card sits in is its id and never moves; the grade it plays
    // at is the new OVR ladder with the club cap (docs/CARD_GRADES_PLAN.md 6절).
    const list = rarityFor(p.ovr)
    extras.rarity = grades.get(p)
    rows[list].push([p.name, p.pos, p.ovr, squad.club, p.nation, extras])
    realHints[p.name] = `${p.real} (${squad.realClub}${p.number ? ` #${p.number}` : ''})`
    squadRealByName[p.name] = p.real
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
    const extras = { squad: true, rarity: 'World', season: p.season, unreleased: set.pilot === true, ...(p.real ? { person: personKey(p.real) } : {}) }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    rows.World.push([p.name, p.pos, p.ovr, p.club, p.nation, extras])
    realHints[p.name] = `${p.real} (${p.realClub} ${p.season})`
    portraits[p.name] = p.key
    meta[p.key] = { name: p.name, nation: p.nation, birthYear: p.birthYear, pos: p.pos, club: p.club }
  }
}

// 리미티드 카드 — 한 주의 MOM (data/limited/*.json). 플래티넘(Live) 목록에 들어가고 등급도
// 플래티넘이지만 `limited` 창 안에서만 뽑기 풀에 포함된다(lib/limited.ts). 파일마다
// label·from·to 가 있고 lib/limited.ts 의 LIMITED_SCHEDULE 과 label 이 같아야 예고·띠와 이어진다.
const LIMITED_DIR = 'data/limited'
const limitedFiles = existsSync(LIMITED_DIR) ? readdirSync(LIMITED_DIR).filter((f) => f.endsWith('.json')).sort() : []
for (const file of limitedFiles) {
  const set = JSON.parse(readFileSync(join(LIMITED_DIR, file), 'utf8'))
  if (!set.label || !set.from || !set.to) throw new Error(`${file}: label·from·to 가 필요합니다`)
  // 같은 기간의 리미티드는 클럽당 1장 (사용자 결정 2026-09-07).
  const limitedClubs = new Set()
  for (const p of set.players) {
    if (limitedClubs.has(p.club)) throw new Error(`${file}: 리미티드는 같은 기간 한 클럽에 1장 — ${p.club} 중복`)
    limitedClubs.add(p.club)
    // 리미티드 카드는 같은 인물의 정규 카드와 **같은 가명**을 쓴다(사용자 결정 2026-09-07).
    // 다른 인물이 같은 가명을 쓰는 것만 막는다.
    const samePerson = squadRealByName[p.name] !== undefined && squadRealByName[p.name] === p.real
    if (!samePerson && (realHints[p.name] || takenNames.has(p.name))) throw new Error(`가명 중복: ${p.name} (${file})`)
    if (!p.key || !p.club) throw new Error(`${file}: ${p.name} 에 key·club 이 필요합니다`)
    if (!clubs.some((c) => c.name === p.club)) {
      if (!set.league) throw new Error(`${file}: 새 클럽 ${p.club} 에는 league 가 필요합니다`)
      clubs.push({ name: p.club, league: set.league })
    }
    const extras = {
      squad: true,
      rarity: 'Live',
      season: set.label,
      limited: { label: set.label, from: set.from, to: set.to, story: p.story },
      unreleased: set.pilot === true,
      ...(p.real ? { person: personKey(p.real) } : {}),
    }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    rows.Live.push([p.name, p.pos, p.ovr, p.club, p.nation, extras])
    // The regular card's hint and portrait key stay in charge of the shared name.
    if (!realHints[p.name]) realHints[p.name] = `${p.real} (${p.realClub}, ${set.label} 리미티드)`
    if (!portraits[p.name]) portraits[p.name] = p.key
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
