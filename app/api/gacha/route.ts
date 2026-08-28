import { NextResponse } from 'next/server'
import { DRAW_TEN_SIZE, drawMany } from '../../../lib/gacha'
import { RARITY_WEIGHTS } from '../../../lib/rarity'

export const dynamic = 'force-dynamic'

/**
 * Rolls one or more cards. `?count=10` runs the ten pull, which guarantees a
 * Rare or better.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requested = Number.parseInt(searchParams.get('count') ?? '1', 10)
  const count = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), DRAW_TEN_SIZE) : 1

  const cards = drawMany(count).map((player) => ({
    id: player.id,
    name: player.name,
    rarity: player.rarity,
    position: player.position,
    ovr: player.ovr,
    nation: player.nation,
    club: player.club,
    stats: player.stats,
  }))

  return NextResponse.json({ count, rates: RARITY_WEIGHTS, cards })
}
