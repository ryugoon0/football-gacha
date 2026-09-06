import { useEffect, useState } from 'react'
import { CLUBS, PLAYERS } from './players'

/**
 * 「리네임팩」 — the manager's own names for players and clubs, on this device
 * only. Like the facepack it never leaves the browser (localStorage) and is
 * never shipped: the roster keeps its hint-style aliases, and a pack simply
 * relabels what this screen shows.
 *
 * Applying a pack rewrites `name`/`club` on the in-memory roster so every
 * screen follows without a hook at each call site. Identity never moves:
 * cards are keyed by id, team colours group by whatever string a club now
 * carries (renamed consistently for every card of that club), and anything
 * that must stay stable across renames — album set ids, exports — asks
 * originalClubOf()/originalNameOf() for the roster's own value.
 */

export interface RenamePack {
  /** card id → display name */
  players: Record<string, string>
  /** original club name → display name */
  clubs: Record<string, string>
}

const KEY = 'football-gacha:renamepack'
const MAX_NAME = 24

const originalNames = new Map<string, string>()
const originalClubs = new Map<string, string>()
let current: RenamePack = { players: {}, clubs: {} }
let loaded = false
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version += 1
  for (const listener of listeners) listener()
}

function rememberOriginals(): void {
  if (originalNames.size > 0) return
  for (const player of PLAYERS) {
    originalNames.set(player.id, player.name)
    originalClubs.set(player.id, player.club)
  }
}

export function originalNameOf(playerId: string): string | undefined {
  return originalNames.get(playerId)
}

/** The roster's own club name for a card, whatever the pack shows. */
export function originalClubOf(player: { id: string; club: string }): string {
  return originalClubs.get(player.id) ?? player.club
}

export function currentRenamePack(): RenamePack {
  return current
}

export function renamePackCounts(): { players: number; clubs: number } {
  return { players: Object.keys(current.players).length, clubs: Object.keys(current.clubs).length }
}

/** Writes the pack onto the roster: renamed where the pack says, original everywhere else. */
export function applyRenamePack(pack: RenamePack): void {
  rememberOriginals()
  current = pack
  for (const player of PLAYERS) {
    const original = originalNames.get(player.id)!
    const club = originalClubs.get(player.id)!
    player.name = pack.players[player.id] ?? original
    player.club = pack.clubs[club] ?? club
  }
  const clubOriginal = new Map<object, string>()
  for (const club of CLUBS) {
    if (!(club as { _original?: string })._original) (club as { _original?: string })._original = club.name
    clubOriginal.set(club, (club as { _original?: string })._original!)
  }
  for (const club of CLUBS) {
    const original = clubOriginal.get(club)!
    club.name = pack.clubs[original] ?? original
  }
  emit()
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME)
}

export interface RenameParseReport {
  pack: RenamePack
  players: number
  clubs: number
  /** Lines that named no known card or club. */
  unmatched: string[]
}

/**
 * Reads a pack from text. Accepted, line by line (comma or tab separated):
 *   player,<카드 id>,<새 이름>            club,<원래 클럽>,<새 클럽>
 *   <카드 id>,<새 이름>                    <원래 클럽>,<새 클럽>
 *   type,key,current,new  (the template — the last column is the new name)
 * or JSON { players: { id: name }, clubs: { club: name } }. Empty new names
 * are skipped, so a half-filled template is fine. Only original club names
 * and card ids are keys; the current display name is never the key.
 */
export function parseRenamePack(text: string): RenameParseReport {
  rememberOriginals()
  const pack: RenamePack = { players: {}, clubs: {} }
  const unmatched: string[] = []
  const clubNames = new Set(originalClubs.values())
  const ids = new Set(originalNames.keys())
  const body = text.replace(/^﻿/, '')

  if (body.trim().startsWith('{')) {
    try {
      const json = JSON.parse(body) as Partial<RenamePack>
      for (const [id, name] of Object.entries(json.players ?? {})) {
        if (ids.has(id) && typeof name === 'string' && clean(name)) pack.players[id] = clean(name)
        else unmatched.push(id)
      }
      for (const [club, name] of Object.entries(json.clubs ?? {})) {
        if (clubNames.has(club) && typeof name === 'string' && clean(name)) pack.clubs[club] = clean(name)
        else unmatched.push(club)
      }
    } catch {
      unmatched.push('JSON을 읽지 못했습니다')
    }
    return { pack, players: Object.keys(pack.players).length, clubs: Object.keys(pack.clubs).length, unmatched }
  }

  const split = (line: string): string[] => {
    const sep = line.includes('\t') ? '\t' : ','
    const out: string[] = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = !quoted
      } else if (ch === sep && !quoted) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out.map((v) => v.trim())
  }

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const cols = split(line)
    const head = cols[0]?.toLowerCase()
    if (head === 'type' || head === 'id') continue // header row
    let kind: 'player' | 'club' | null = null
    let key = ''
    let name = ''
    if ((head === 'player' || head === 'club') && cols.length >= 3) {
      kind = head
      key = cols[1]
      name = cols.length >= 4 ? cols[3] : cols[2]
    } else if (cols.length >= 2) {
      key = cols[0]
      name = cols[cols.length - 1]
      kind = ids.has(key) ? 'player' : clubNames.has(key) ? 'club' : null
    }
    if (!kind || !clean(name)) continue
    if (kind === 'player' && ids.has(key)) pack.players[key] = clean(name)
    else if (kind === 'club' && clubNames.has(key)) pack.clubs[key] = clean(name)
    else unmatched.push(key)
  }
  return { pack, players: Object.keys(pack.players).length, clubs: Object.keys(pack.clubs).length, unmatched }
}

/** The fill-in sheet: every club, then every card, with the current name and an empty column for the new one. */
export function renamePackTemplateCsv(): string {
  rememberOriginals()
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const clubs = [...new Set(originalClubs.values())].sort((a, b) => a.localeCompare(b, 'ko'))
  const rows: string[][] = [
    ...clubs.map((club) => ['club', club, club, current.clubs[club] ?? '']),
    ...PLAYERS.map((p) => ['player', p.id, originalNames.get(p.id) ?? p.name, current.players[p.id] ?? '']),
  ]
  return ['﻿type,key,current,new', ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

function save(pack: RenamePack): void {
  try {
    if (Object.keys(pack.players).length + Object.keys(pack.clubs).length === 0) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, JSON.stringify(pack))
  } catch {
    // No storage — the pack lives for this page only.
  }
}

/** Reads the saved pack once and applies it. Safe to call on every mount. */
export function loadRenamePack(): void {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return
    const json = JSON.parse(raw) as Partial<RenamePack>
    applyRenamePack({ players: json.players ?? {}, clubs: json.clubs ?? {} })
  } catch {
    // Broken storage — start clean.
  }
}

/** Imports a file (CSV/TSV/JSON), merges it over the current pack, applies and saves. */
export async function importRenamePack(file: File): Promise<RenameParseReport> {
  const report = parseRenamePack(await file.text())
  const merged: RenamePack = {
    players: { ...current.players, ...report.pack.players },
    clubs: { ...current.clubs, ...report.pack.clubs },
  }
  applyRenamePack(merged)
  save(merged)
  return report
}

export function clearRenamePack(): void {
  applyRenamePack({ players: {}, clubs: {} })
  save({ players: {}, clubs: {} })
}

/** Re-renders the caller whenever the pack changes. */
export function useRenamePackVersion(): number {
  const [v, setV] = useState(version)
  useEffect(() => {
    loadRenamePack()
    const listener = () => setV(version)
    listeners.add(listener)
    listener()
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return v
}
