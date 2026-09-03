import { FORMATIONS, FORMATION_KEYS } from './formations'
import { CLUB_POOL, divisionBaseRating } from './league'
import { PLAYERS, effectiveOvr, levelCap, startLevel } from './players'
import { hashString, seededRandom } from './random'
import type { PublicClubRow, PublicSquadMember } from './publicClub'
import type { FormationKey, PlayerDef, Position } from './types'

/**
 * The league a visitor scouts is not a real season's fixture list yet — see
 * ROADMAP.md, "동일 리그 실제유저 매칭" has not shipped — so "same league" can
 * only mean "same division tier" for now. Real opted-in squads
 * (public_club_squads) fill part of that tier; this fills the rest with the
 * same AI clubs the game itself plays against, so the board reads like a
 * full ~20-team league rather than however many people happened to opt in.
 *
 * Nothing here is stored. Every id is deterministic (seeded by club name +
 * division), so the same club shows the same lineup on every visit without a
 * database row — and readers can tell it apart from a real, opted-in squad.
 */
const AI_ID_PREFIX = 'ai:'

export function aiClubId(division: number, name: string): string {
  return `${AI_ID_PREFIX}${division}:${name}`
}

export function isAiClubId(id: string): boolean {
  return id.startsWith(AI_ID_PREFIX)
}

function parseAiClubId(id: string): { division: number; name: string } | null {
  if (!isAiClubId(id)) return null
  const rest = id.slice(AI_ID_PREFIX.length)
  const sep = rest.indexOf(':')
  if (sep < 0) return null
  const division = Number(rest.slice(0, sep))
  const name = rest.slice(sep + 1)
  if (!Number.isFinite(division)) return null
  return { division, name }
}

/** The level (within the player's own start..cap range) closest to a target OVR. */
function bestLevelFor(player: PlayerDef, targetOvr: number): { level: number; ovr: number } {
  let best = { level: startLevel(player), ovr: effectiveOvr(player, startLevel(player)) }
  for (let level = startLevel(player) + 1; level <= levelCap(player); level++) {
    const ovr = effectiveOvr(player, level)
    if (Math.abs(ovr - targetOvr) < Math.abs(best.ovr - targetOvr)) best = { level, ovr }
  }
  return best
}

function pickForSlot(
  position: Position,
  targetOvr: number,
  rng: () => number,
  taken: Set<string>,
): { player: PlayerDef; level: number } | null {
  const pool = PLAYERS.filter((player) => player.positions.includes(position) && !taken.has(player.id))
  if (pool.length === 0) return null
  const ranked = pool
    .map((player) => ({ player, fit: bestLevelFor(player, targetOvr) }))
    .sort((a, b) => Math.abs(a.fit.ovr - targetOvr) - Math.abs(b.fit.ovr - targetOvr))
  // A little variety among close fits, instead of every division's every
  // club drifting toward the exact same handful of players.
  const window = ranked.slice(0, Math.min(8, ranked.length))
  const choice = window[Math.floor(rng() * window.length)]
  taken.add(choice.player.id)
  return { player: choice.player, level: choice.fit.level }
}

function buildLineup(
  formationKey: FormationKey,
  targetOvr: number,
  rng: () => number,
): PublicSquadMember[] {
  const taken = new Set<string>()
  const lineup: PublicSquadMember[] = []
  for (const slot of FORMATIONS[formationKey].slots) {
    const picked = pickForSlot(slot.position, targetOvr, rng, taken)
    if (picked) {
      lineup.push({ playerId: picked.player.id, level: picked.level, role: 'starter', slot: slot.id })
    }
  }
  // A short bench, roughly a tier below the XI — enough to fill the strip
  // without pretending to be a full matchday squad.
  const benchPositions: Position[] = ['GK', 'CB', 'CM', 'ST']
  benchPositions.forEach((position, index) => {
    const picked = pickForSlot(position, targetOvr - 6, rng, taken)
    if (picked) {
      lineup.push({ playerId: picked.player.id, level: picked.level, role: 'bench', slot: `bench-${index}` })
    }
  })
  return lineup
}

function ratingOfLineup(lineup: PublicSquadMember[], targetOvr: number): number {
  const starters = lineup.filter((member) => member.role === 'starter')
  if (starters.length === 0) return targetOvr
  const sum = starters.reduce((total, member) => {
    const player = PLAYERS.find((item) => item.id === member.playerId)
    return total + (player ? effectiveOvr(player, member.level) : targetOvr)
  }, 0)
  return Math.round(sum / starters.length)
}

function clubForSeed(division: number, name: string): PublicClubRow {
  const seed = hashString(`${division}:${name}`)
  const rng = seededRandom(seed)
  const formationKey = FORMATION_KEYS[Math.floor(rng() * FORMATION_KEYS.length)]
  const baseRating = divisionBaseRating(division)
  const swing = Math.floor(rng() * 9) - 4
  const targetOvr = Math.max(35, baseRating + swing)
  const lineup = buildLineup(formationKey, targetOvr, rng)

  return {
    user_id: aiClubId(division, name),
    club_name: name,
    division,
    rating: ratingOfLineup(lineup, targetOvr),
    formation: formationKey,
    lineup,
    is_public: true,
    // Not a real save, so there is no "last published" moment — the club
    // has simply always looked like this.
    updated_at: new Date(0).toISOString(),
  }
}

export function aiClubsForDivision(division: number): PublicClubRow[] {
  return CLUB_POOL.map(([name]) => clubForSeed(division, name))
}

export function aiClubById(id: string): PublicClubRow | null {
  const parsed = parseAiClubId(id)
  if (!parsed) return null
  const known = CLUB_POOL.some(([name]) => name === parsed.name)
  if (!known) return null
  return clubForSeed(parsed.division, parsed.name)
}
