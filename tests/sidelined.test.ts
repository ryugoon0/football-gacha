import { describe, expect, it } from 'vitest'
import { clearSidelined, majorityClubOf } from '../lib/autoSub'
import { FORMATIONS, emptySlots } from '../lib/formations'
import { PLAYERS, effectiveOvr } from '../lib/players'
import { kickoffSquadOf } from '../lib/weeklyLeague/liveMatch'
import type { Card, PlayerDef, Squad } from '../lib/types'

/** Two clubs with plenty of outfield players, so 팀 컬러 can be told apart. */
function twoClubs(): { a: PlayerDef[]; b: PlayerDef[]; keepers: PlayerDef[] } {
  const byClub = new Map<string, PlayerDef[]>()
  for (const player of PLAYERS) {
    if (player.positions.includes('GK')) continue
    const list = byClub.get(player.club) ?? []
    list.push(player)
    byClub.set(player.club, list)
  }
  const clubs = [...byClub.entries()].filter(([, list]) => list.length >= 10).map(([, list]) => list)
  const keepers = PLAYERS.filter((player) => player.positions.includes('GK'))
  return { a: clubs[0], b: clubs[1], keepers }
}

const card = (uid: string, player: PlayerDef, extra: Partial<Card> = {}): Card => ({
  uid,
  playerId: player.id,
  level: 1,
  limit: 5,
  condition: 100,
  injuredFor: 0,
  exp: 0,
  ...extra,
})

/** Six from club A, five from club B in a 4-3-3, keeper from elsewhere. */
function fixture() {
  const { a, b, keepers } = twoClubs()
  const slotIds = FORMATIONS['4-3-3'].slots.map((slot) => slot.id)
  const gkSlot = FORMATIONS['4-3-3'].slots.find((slot) => slot.position === 'GK')!.id
  const outfieldSlots = slotIds.filter((id) => id !== gkSlot)
  const cards: Card[] = [card('gk', keepers[0])]
  const slots = { ...emptySlots('4-3-3'), [gkSlot]: 'gk' }
  outfieldSlots.forEach((slotId, index) => {
    const player = index < 6 ? a[index] : b[index - 6]
    const uid = `s${index}`
    cards.push(card(uid, player))
    slots[slotId] = uid
  })
  return { a, b, keepers, cards, slots, gkSlot, outfieldSlots }
}

describe('clearSidelined', () => {
  it('벤치의 부상 카드는 선발에 가장 많은 클럽 카드로 바꾼다', () => {
    const { a, b, cards, slots } = fixture()
    const injuredBench = card('bench0', b[7], { injuredFor: 2 })
    // Vault: a stronger club-B card and a weaker club-A card — club A must win.
    const strongB = card('vaultB', b[8], { level: 5 })
    const weakA = card('vaultA', a[8], { level: 1 })
    expect(effectiveOvr(b[8], 5)).toBeGreaterThan(effectiveOvr(a[8], 1))
    const squad: Squad = { formation: '4-3-3', slots, bench: ['bench0', null, null, null, null, null, null] }
    const { squad: next, fills } = clearSidelined([...cards, injuredBench, strongB, weakA], squad, 5)
    expect(majorityClubOf(cards, squad)).toBe(a[0].club)
    expect(next.bench[0]).toBe('vaultA')
    expect(fills).toEqual([expect.objectContaining({ benchIndex: 0, outUid: 'bench0', inUid: 'vaultA' })])
  })

  it('벤치가 못 메운 부상 선발은 보관함에서 채우고, 아무도 없으면 비운다', () => {
    const { a, cards, slots, outfieldSlots } = fixture()
    const injured = cards.find((c) => c.uid === 's0')!
    injured.injuredFor = 3
    const fit = card('vault', a[9])
    const squad: Squad = { formation: '4-3-3', slots, bench: [null, null, null, null, null, null, null] }
    const filled = clearSidelined([...cards, fit], squad, 5)
    expect(filled.squad.slots[outfieldSlots[0]]).toBe('vault')
    const empty = clearSidelined(cards, squad, 5)
    expect(empty.squad.slots[outfieldSlots[0]]).toBeNull()
    expect(empty.fills[0].inUid).toBeNull()
  })

  it('이미 18명 안에 있는 인물의 다른 카드는 부르지 않고, 골키퍼 자리는 골키퍼로 채운다', () => {
    const { keepers, cards, slots, gkSlot } = fixture()
    const gk = cards.find((c) => c.uid === 'gk')!
    gk.injuredFor = 1
    const samePerson = PLAYERS.find((p) => p.id !== keepers[0].id && p.person === keepers[0].person)
    const otherKeeper = keepers.find((k) => k.person !== keepers[0].person)!
    const vault = [card('gk2', otherKeeper, { condition: 40 })]
    if (samePerson) vault.push(card('dup', samePerson))
    const squad: Squad = { formation: '4-3-3', slots, bench: [null, null, null, null, null, null, null] }
    const { squad: next } = clearSidelined([...cards, ...vault], squad, 5)
    expect(next.slots[gkSlot]).toBe('gk2')
  })
})

describe('kickoffSquadOf', () => {
  it('자동 교체를 꺼도 부상 선발은 벤치에서 올라오고 부상자는 벤치에서도 빠진다', () => {
    const { a, cards, slots, outfieldSlots } = fixture()
    cards.find((c) => c.uid === 's1')!.injuredFor = 2
    const benchFit = card('b0', a[7])
    const vaultA = card('v0', a[8])
    const squad: Squad = { formation: '4-3-3', slots, bench: ['b0', null, null, null, null, null, null] }
    const kickoff = kickoffSquadOf({ cards: [...cards, benchFit, vaultA], squad, division: 5, autoSub: false })
    expect(kickoff.slots[outfieldSlots[1]]).toBe('b0')
    expect(kickoff.bench).not.toContain('s1')
    expect(kickoff.bench[0]).toBe('v0')
  })

  it('자동 교체를 꺼두면 지친 선수는 그대로 뛴다', () => {
    const { a, cards, slots, outfieldSlots } = fixture()
    cards.find((c) => c.uid === 's1')!.condition = 10
    const squad: Squad = { formation: '4-3-3', slots, bench: [card('b0', a[7]).uid, null, null, null, null, null, null] }
    const kickoff = kickoffSquadOf({ cards: [...cards, card('b0', a[7])], squad, division: 5, autoSub: false })
    expect(kickoff.slots[outfieldSlots[1]]).toBe('s1')
  })
})
