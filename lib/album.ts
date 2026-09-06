import { LIMITED_SCHEDULE } from './limited'
import { PLAYERS } from './players'
import { getSupabase } from './supabase'
import { tune, type KnobKey } from './tuning'
import type { Card, PlayerDef } from './types'

/**
 * 앨범 — the card collection with rewards (docs/ALBUM_PLAN.md).
 *
 * Registering a card costs nothing: a set counts the distinct players you own
 * right now, so selling a card also un-registers it. Each set pays once; the
 * claim is recorded on the server (album_claims), which re-checks the claim
 * against the cloud save before mailing the reward to the 선물함.
 *
 * Set definitions are derived from the roster here and pushed to the server
 * (album_sets) from the operator console, so the server can verify a claim
 * without bundling the roster. A set the server has not seen yet shows as
 * "운영자 동기화 대기" and cannot be claimed.
 */

export type AlbumKind = 'club' | 'league' | 'special'

export interface AlbumSet {
  id: string
  kind: AlbumKind
  title: string
  /** League name for club sets; a one-line note for special sets. */
  subtitle: string
  /** Cards that count. Empty for league sets, which are judged by their clubs. */
  playerIds: string[]
  /** Distinct owned players (club/special) or complete child sets (league) needed. */
  required: number
  /** League sets: the club set ids that must all be complete. */
  childIds: string[]
}

/** A club album is complete at this many distinct players (or the whole squad when smaller). */
export const CLUB_REQUIRED = 11

/** The current-squad cards that belong in a club album. */
export function isAlbumClubCard(player: PlayerDef): boolean {
  return Boolean(player.fromSquad) && !player.unreleased && !player.limited && !player.retired && player.rarity !== 'World'
}

export function buildAlbumSets(players: readonly PlayerDef[] = PLAYERS): AlbumSet[] {
  const byClub = new Map<string, { league: string; ids: string[] }>()
  for (const player of players) {
    if (!isAlbumClubCard(player)) continue
    const entry = byClub.get(player.club) ?? { league: player.league, ids: [] }
    entry.ids.push(player.id)
    byClub.set(player.club, entry)
  }
  const clubs: AlbumSet[] = [...byClub.entries()]
    .sort((a, b) => a[1].league.localeCompare(b[1].league, 'ko') || a[0].localeCompare(b[0], 'ko'))
    .map(([club, entry]) => ({
      id: `club:${club}`,
      kind: 'club',
      title: club,
      subtitle: entry.league,
      playerIds: entry.ids,
      required: Math.min(CLUB_REQUIRED, entry.ids.length),
      childIds: [],
    }))

  const byLeague = new Map<string, AlbumSet[]>()
  for (const set of clubs) byLeague.set(set.subtitle, [...(byLeague.get(set.subtitle) ?? []), set])
  const leagues: AlbumSet[] = [...byLeague.entries()].map(([league, sets]) => ({
    id: `league:${league}`,
    kind: 'league',
    title: league,
    subtitle: `${sets.length}개 클럽 앨범을 모두 완성`,
    playerIds: [],
    required: sets.length,
    childIds: sets.map((set) => set.id),
  }))

  const specials: AlbumSet[] = []
  const world = players.filter((player) => player.rarity === 'World' && !player.unreleased && !player.retired).map((player) => player.id)
  if (world.length > 0) {
    specials.push({ id: 'special:world', kind: 'special', title: '월드 레전드', subtitle: `지금까지 나온 월드 카드 ${world.length}장 전부`, playerIds: world, required: world.length, childIds: [] })
  }
  for (const batch of LIMITED_SCHEDULE) {
    const ids = players.filter((player) => player.limited?.label === batch.label && !player.unreleased).map((player) => player.id)
    if (ids.length === 0) continue
    specials.push({
      id: `special:limited:${batch.id}`,
      kind: 'special',
      title: `리미티드 · ${batch.label}`,
      subtitle: `그 주 리미티드 카드 ${ids.length}장 전부`,
      playerIds: ids,
      required: ids.length,
      childIds: [],
    })
  }
  return [...clubs, ...leagues, ...specials]
}

let cached: AlbumSet[] | null = null
export function albumSets(): AlbumSet[] {
  if (!cached) cached = buildAlbumSets()
  return cached
}

export function ownedPlayerIds(cards: readonly Card[]): Set<string> {
  return new Set(cards.map((card) => card.playerId))
}

export interface AlbumProgress {
  have: number
  need: number
  complete: boolean
}

export function albumProgress(set: AlbumSet, owned: Set<string>, all: readonly AlbumSet[] = albumSets()): AlbumProgress {
  if (set.kind === 'league') {
    const children = set.childIds.map((id) => all.find((s) => s.id === id)).filter((s): s is AlbumSet => Boolean(s))
    const have = children.filter((child) => albumProgress(child, owned, all).complete).length
    return { have, need: set.required, complete: set.required > 0 && have >= set.required }
  }
  const have = set.playerIds.filter((id) => owned.has(id)).length
  return { have, need: set.required, complete: set.required > 0 && have >= set.required }
}

export interface AlbumReward {
  gold: number
  tickets: number
}

const REWARD_KNOBS: Record<AlbumKind, { gold: KnobKey; tickets?: KnobKey }> = {
  club: { gold: 'albumClubGold' },
  league: { gold: 'albumLeagueGold', tickets: 'albumLeagueTickets' },
  special: { gold: 'albumSpecialGold', tickets: 'albumSpecialTickets' },
}

export function albumReward(kind: AlbumKind, rates: Partial<Record<KnobKey, number>> = {}): AlbumReward {
  const knobs = REWARD_KNOBS[kind]
  const read = (key: KnobKey) => Math.round(rates[key] ?? tune(key))
  return { gold: read(knobs.gold), tickets: knobs.tickets ? read(knobs.tickets) : 0 }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

/** What the operator console pushes to album_sets — the definitions, minus display text. */
export function albumSetPayload(sets: readonly AlbumSet[] = albumSets()): { id: string; kind: AlbumKind; title: string; playerIds: string[]; required: number; childIds: string[] }[] {
  return sets.map((set) => ({ id: set.id, kind: set.kind, title: set.title, playerIds: set.playerIds, required: set.required, childIds: set.childIds }))
}

export async function syncAlbumSets(): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('admin_sync_album_sets', { p_sets: albumSetPayload() })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string; count?: number } | null
  return body?.ok ? { ok: true, count: Number(body.count ?? 0) } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

/** Ids of the sets the server knows, so the client can tell "not synced" from "not complete". */
export async function fetchSyncedAlbumSetIds(): Promise<Set<string> | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('album_sets').select('id')
  if (error || !data) return null
  return new Set((data as { id: string }[]).map((row) => row.id))
}

export async function fetchMyAlbumClaims(): Promise<Set<string>> {
  const supabase = getSupabase()
  if (!supabase) return new Set()
  const { data, error } = await supabase.from('album_claims').select('set_id')
  if (error || !data) return new Set()
  return new Set((data as { set_id: string }[]).map((row) => row.set_id))
}

export async function claimAlbumSet(setId: string): Promise<{ ok: true; gold: number; tickets: number } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'offline' }
  const { data, error } = await supabase.rpc('claim_album_set', { p_set_id: setId })
  if (error) return { ok: false, reason: 'unavailable' }
  const body = data as { ok?: boolean; reason?: string; gold?: number; tickets?: number } | null
  return body?.ok ? { ok: true, gold: Number(body.gold ?? 0), tickets: Number(body.tickets ?? 0) } : { ok: false, reason: body?.reason ?? 'unavailable' }
}

export interface AlbumClaimStat {
  set_id: string
  claims: number
}

export async function fetchAlbumClaimStats(): Promise<AlbumClaimStat[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_album_claim_stats')
  if (error || !Array.isArray(data)) return []
  return data as AlbumClaimStat[]
}

export const ALBUM_FAILURE_MESSAGE: Record<string, string> = {
  offline: '서버에 연결되지 않았습니다.',
  unavailable: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'not signed in': '로그인이 풀렸습니다.',
  'unknown set': '운영자가 이 앨범을 아직 열지 않았습니다. 잠시 뒤 다시 시도해 주세요.',
  'already claimed': '이미 받은 앨범 보상입니다.',
  'not complete': '서버에 저장된 카드로는 아직 완성이 아닙니다. 잠시 뒤(저장이 올라간 뒤) 다시 시도해 주세요.',
  'no save': '클라우드 저장이 아직 없습니다. 잠시 뒤 다시 시도해 주세요.',
  'not an operator': '운영자만 할 수 있습니다.',
}
