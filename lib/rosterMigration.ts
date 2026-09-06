import { PLAYERS, POSITION_GROUP, getPlayer, levelCap } from './players'
import { RARITIES } from './rarity'
import type { Card, PlayerDef, Squad } from './types'

/**
 * Moving owned cards from the old generated roster onto the real squads.
 *
 * When a club's real squad is published (data/squads), its older generated
 * cards are retired: gone from the packs, but still in players' collections.
 * Rather than leave two versions of one club side by side, each retired card
 * maps to one squad card of the same club — the same position group, the
 * closest overall, same exact position and same grade breaking ties — and an
 * owned copy becomes that card on load, keeping its level, limit, experience
 * and condition (capped to the new grade's ceiling).
 *
 * Since 2026-09-06 the whole generated roster is retired, so a card whose
 * club never got a real squad (an old generated club, a hand-written star at
 * a past club) falls back to the closest squad card in the same league. The
 * grade is weighed heavily there so a gold card lands on a gold card of
 * another club rather than a silver one of a nearer overall.
 *
 * The mapping is a pure function of the roster, so every device and the
 * server see the same result. 「퇴장감」 is never retired (CLAUDE.md).
 */

const targetsByClub = new Map<string, PlayerDef[]>()
const targetsByLeague = new Map<string, PlayerDef[]>()
for (const player of PLAYERS) {
  if (!player.fromSquad || player.unreleased) continue
  const list = targetsByClub.get(player.club) ?? []
  list.push(player)
  targetsByClub.set(player.club, list)
  const league = targetsByLeague.get(player.league) ?? []
  league.push(player)
  targetsByLeague.set(player.league, league)
}

const mapping = new Map<string, string>()

/** The squad card a retired card becomes, or null when the card is not retired (or the club has no squad yet). */
export function migrationTarget(playerId: string): PlayerDef | null {
  const cached = mapping.get(playerId)
  if (cached !== undefined) return cached ? getPlayer(cached) ?? null : null
  const old = getPlayer(playerId)
  if (!old?.retired) {
    mapping.set(playerId, '')
    return null
  }
  const group = POSITION_GROUP[old.position]
  const sameGroup = (list: PlayerDef[]) => list.filter((player) => POSITION_GROUP[player.position] === group)
  const clubPool = targetsByClub.get(old.club) ?? []
  const leaguePool = targetsByLeague.get(old.league) ?? []
  const fallback = clubPool.length === 0
  const pool = (() => {
    const club = sameGroup(clubPool)
    if (club.length > 0) return club
    if (clubPool.length > 0) return clubPool
    const league = sameGroup(leaguePool)
    return league.length > 0 ? league : leaguePool
  })()
  if (pool.length === 0) {
    mapping.set(playerId, '')
    return null
  }
  // Within the club the overall decides; across the league the grade must
  // match first, or a retired gold card would come back as somebody's silver.
  const rank = (player: PlayerDef) =>
    Math.abs(player.ovr - old.ovr) * 10 +
    (player.position === old.position ? 0 : 3) +
    Math.abs(RARITIES.indexOf(player.rarity) - RARITIES.indexOf(old.rarity)) * (fallback ? 100 : 2)
  const best = [...pool].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))[0]
  mapping.set(playerId, best.id)
  return best
}

/** The card as it stands after migration — the same uid, so squads and stats keep pointing at it. */
export function migrateCard(card: Card): Card {
  const target = migrationTarget(card.playerId)
  if (!target) return card
  const cap = levelCap(target)
  const limit = Math.max(1, Math.min(card.limit, cap))
  return { ...card, playerId: target.id, limit, level: Math.max(1, Math.min(card.level, limit)) }
}

export interface MigrationReport {
  cards: Card[]
  collected: string[]
  squad: Squad
  /** How many owned cards changed identity. */
  moved: number
}

/**
 * Migrates a whole collection. Two old cards may land on the same squad
 * player; the game allows one copy of a player on the team sheet, so a
 * duplicate that ends up in the squad is dropped from the sheet (the card
 * itself stays in the collection).
 */
export function migrateCollection(cards: Card[], collected: string[], squad: Squad): MigrationReport {
  let moved = 0
  const nextCards = cards.map((card) => {
    const next = migrateCard(card)
    if (next.playerId !== card.playerId) moved += 1
    return next
  })
  if (moved === 0) return { cards, collected, squad, moved: 0 }

  const nextCollected = Array.from(new Set(collected.map((id) => migrationTarget(id)?.id ?? id)))

  const byUid = new Map(nextCards.map((card) => [card.uid, card]))
  const seen = new Set<string>()
  const keep = (uid: string | null): string | null => {
    if (!uid) return null
    const card = byUid.get(uid)
    if (!card) return uid
    if (seen.has(card.playerId)) return null
    seen.add(card.playerId)
    return uid
  }
  const slots = Object.fromEntries(Object.entries(squad.slots).map(([slotId, uid]) => [slotId, keep(uid)]))
  const bench = squad.bench.map((uid) => keep(uid))
  return { cards: nextCards, collected: nextCollected, squad: { ...squad, slots, bench }, moved }
}
