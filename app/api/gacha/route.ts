import { NextResponse } from 'next/server'
import { weekKey } from '../../../lib/daily'
import { PACKS, PITY_LIMIT, drawSession, featuredPlayer, packOf, type PackId } from '../../../lib/gacha'
import { RARITY_WEIGHTS } from '../../../lib/rarity'
import type { PositionGroup } from '../../../lib/types'

export const dynamic = 'force-dynamic'

const GROUPS: PositionGroup[] = ['GK', 'DF', 'MF', 'FW']

/**
 * Opens a pack. The pity counter lives in the player's browser, so it is passed
 * in and handed back with the result.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const packId = (searchParams.get('pack') ?? 'basic') as PackId
  const pack = PACKS.some((item) => item.id === packId) ? packOf(packId) : packOf('basic')

  const requestedCount = Number.parseInt(searchParams.get('count') ?? '', 10)
  const count = Number.isFinite(requestedCount)
    ? Math.min(Math.max(requestedCount, 1), 10)
    : pack.count

  const pity = Math.max(0, Number.parseInt(searchParams.get('pity') ?? '0', 10) || 0)
  const groupParam = searchParams.get('group') as PositionGroup | null
  const group = groupParam && GROUPS.includes(groupParam) ? groupParam : null
  const week = searchParams.get('week') ?? weekKey()
  const featured = featuredPlayer(week)

  const outcome = drawSession({
    count,
    pity,
    featured,
    group: pack.id === 'position' ? group : null,
    minRarity: pack.minRarity ?? null,
    guaranteeRare: pack.guaranteeRare,
  })

  return NextResponse.json({
    pack: pack.id,
    count,
    rates: RARITY_WEIGHTS,
    pity: outcome.pity,
    pityHit: outcome.pityHit,
    pityLimit: PITY_LIMIT,
    featured: { id: featured.id, name: featured.name, rarity: featured.rarity },
    cards: outcome.players.map((player) => ({
      id: player.id,
      name: player.name,
      rarity: player.rarity,
      position: player.position,
      ovr: player.ovr,
      nation: player.nation,
      club: player.club,
      league: player.league,
      stats: player.stats,
    })),
  })
}
