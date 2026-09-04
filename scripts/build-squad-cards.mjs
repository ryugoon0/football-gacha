import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * 실제 스쿼드 데이터(data/squads/*.json) → lib/rosterSquads.ts
 *
 * 각 JSON은 실존 클럽 한 곳의 현재 스쿼드다. 게임에 들어가는 것은 가명·
 * 포지션·국적·종합치뿐이고, 실명은 운영자 화면의 실명 힌트로만 나간다
 * (rosterRealHints.ts의 이중화 원칙). 생년·등번호·외형 속성은 초상 생성
 * 프롬프트에 쓴다.
 *
 * 카드 id는 명단 내 위치라서, 여기서 만든 행은 항상 LATE_ADDITIONS 뒤에
 * 붙는다(lib/players.ts). 새 클럽은 파일 순서(파일명 정렬) 뒤에 추가한다 —
 * 앞에 끼워 넣으면 뒤 카드들의 id가 밀린다.
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

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
for (const file of files) {
  const squad = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  for (const p of squad.players) {
    if (realHints[p.name]) throw new Error(`가명 중복: ${p.name} (${file})`)
    const extras = { unreleased: squad.pilot === true }
    if (p.stats) extras.stats = p.stats
    if (p.hidden) extras.hidden = p.hidden
    rows[rarityFor(p.ovr)].push([p.name, p.pos, p.ovr, squad.club, p.nation, extras])
    realHints[p.name] = `${p.real} (${squad.realClub} #${p.number})`
    portraits[p.name] = p.key
    meta[p.key] = { name: p.name, nation: p.nation, birthYear: p.birthYear, pos: p.pos, club: squad.club }
  }
}

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
const rowLine = ([name, pos, ovr, club, nation, extras]) =>
  `    [${q(name)}, ${q(pos)}, ${ovr}, ${q(club)}, ${q(nation)}, ${JSON.stringify(extras)}],`

const out = `// scripts/build-squad-cards.mjs가 data/squads/*.json에서 만든다. 손으로 고치지 않는다.
import type { Rarity } from './types'
import type { RosterRow } from './players'

/** 실제 스쿼드 기반 카드 — ROSTER에서 LATE_ADDITIONS 뒤에 붙는다. */
export const SQUAD_ROSTER: Record<Rarity, RosterRow[]> = {
${Object.entries(rows)
  .map(([rarity, list]) => `  ${rarity}: [\n${list.map(rowLine).join('\n')}\n  ],`)
  .join('\n')}
}

/** 운영자 전용 — 가명 → 실명 (실제 클럽 #등번호). 정확한 1:1 매핑. */
export const SQUAD_REAL_HINTS: Record<string, string> = ${JSON.stringify(realHints, null, 2)}

/** 가명 → 초상 파일 키 (public/players/<key>.webp). */
export const SQUAD_PORTRAITS: Record<string, string> = ${JSON.stringify(portraits, null, 2)}

/** 초상 생성 프롬프트용 속성. */
export const SQUAD_PORTRAIT_META: Record<string, { name: string; nation: string; birthYear: number; pos: string; club: string }> = ${JSON.stringify(meta, null, 2)}
`
writeFileSync('lib/rosterSquads.ts', out)
const total = Object.values(rows).reduce((n, list) => n + list.length, 0)
console.log(`스쿼드 카드 ${total}장 (${files.length}개 클럽) → lib/rosterSquads.ts`)
