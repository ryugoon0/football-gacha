import { describe, expect, it } from 'vitest'
import { CLUBS, LEAGUES, PLAYERS, ROSTER, getPlayer } from '../lib/players'
import { RARITIES } from '../lib/rarity'
import { POSITION_CHOICES } from '../lib/cardMaker'

describe('the roster after the leagues were added', () => {
  it('did not move a single card that already existed', () => {
    // A card's id is its place in the list, and saves store that id. These are
    // the first cards of each rarity as they were before the expansion; if any
    // of them points somewhere else, every collection in the game has changed.
    const before: [string, string][] = [
      ['n01', '김준성'],
      ['r01', '조현오'],
      ['lg01', '지안루 부폰'],
      ['lv01', '알리손 베카'],
      ['w01', '얀 노이만'],
    ]
    for (const [id, name] of before) {
      expect(getPlayer(id)?.name, `${id}이(가) 다른 선수를 가리킵니다`).toBe(name)
    }
  })

  it('covers seven leagues of twenty clubs', () => {
    const wanted = [
      '킹덤 리그', '이베리아 리가', '게르만 리가', '아주로 세리에',
      '코리아 리그', '루소 프리메라', '오라녜 에레디', '트리콜로 리그',
    ]
    const perLeague = new Map<string, number>()
    for (const club of CLUBS) perLeague.set(club.league, (perLeague.get(club.league) ?? 0) + 1)
    for (const league of wanted) {
      expect(perLeague.get(league) ?? 0, `${league}의 클럽 수`).toBeGreaterThanOrEqual(20)
    }
    expect(LEAGUES).toEqual(expect.arrayContaining(wanted))
  })

  it('has no two clubs sharing a name', () => {
    const names = CLUBS.map((club) => club.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('fields every position at every rarity — the hole that started this', () => {
    // A 4-3-3 needs a left and a right back. Before this there was not one
    // above 실버, so two places in every squad could never be improved.
    for (const rarity of RARITIES) {
      const positions = new Set(ROSTER[rarity].map((row) => row[1]))
      const missing = POSITION_CHOICES.filter((position) => !positions.has(position))
      expect(missing, `${rarity} 등급에 없는 포지션`).toEqual([])
    }
  })

  it('gives every club at least a full back on each side', () => {
    const byClub = new Map<string, Set<string>>()
    for (const player of PLAYERS) {
      const held = byClub.get(player.club) ?? new Set()
      held.add(player.position)
      byClub.set(player.club, held)
    }
    // Clubs carried over from the original hand written list are small squads
    // on purpose; the generated ones are the ones that must be complete.
    const generated = [...byClub.entries()].filter(([, positions]) => positions.size >= 10)
    expect(generated.length).toBeGreaterThanOrEqual(160)
    for (const [club, positions] of generated) {
      expect(positions.has('LB'), `${club}에 왼쪽 수비수가 없습니다`).toBe(true)
      expect(positions.has('RB'), `${club}에 오른쪽 수비수가 없습니다`).toBe(true)
    }
  })

  // A tester's complaint: a gold centre back's card read like a bronze card,
  // because the shape of a position was docked the same fixed points whether
  // the player was a 55 or a 90. Defenders will always show fewer points than
  // playmakers at the same overall — their rating leans on the two stats they
  // are best at — but the gap had grown far past what the position explains.
  it('does not make a gold defender read like a bronze card', () => {
    const sums = new Map<string, number[]>()
    for (const player of PLAYERS) {
      if (player.rarity !== 'Legend') continue
      const stats = player.stats
      const sum = stats.pac + stats.sho + stats.pas + stats.dri + stats.def + stats.phy
      const list = sums.get(player.position) ?? []
      list.push(sum)
      sums.set(player.position, list)
    }
    const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length
    const outfield = [...sums.entries()].filter(([position]) => position !== 'GK')
    const best = Math.max(...outfield.map(([, list]) => mean(list)))
    for (const [position, list] of outfield) {
      expect(best - mean(list), `${position} 카드가 너무 낮게 보입니다`).toBeLessThan(60)
    }
    // And no single number on a gold card should look bronze.
    for (const player of PLAYERS) {
      if (player.rarity !== 'Legend' || player.position === 'GK') continue
      const lowest = Math.min(...Object.values(player.stats))
      expect(lowest, `${player.name} ${player.position}`).toBeGreaterThanOrEqual(30)
    }
  })

  it('never repeats a player name', () => {
    const names = PLAYERS.map((player) => player.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('gives every player a club that exists', () => {
    const known = new Set(CLUBS.map((club) => club.name))
    for (const player of PLAYERS) expect(known.has(player.club), player.club).toBe(true)
  })
})
