import { describe, expect, it } from 'vitest'
import { PLAYERS, POSITION_GROUP, getPlayer, levelCap } from '../lib/players'
import { migrateCard, migrateCollection, migrationTarget } from '../lib/rosterMigration'
import { normalizeSave } from '../lib/storage'
import { initialState } from '../lib/storage'
import type { Card } from '../lib/types'

const retired = PLAYERS.filter((player) => player.retired)
const card = (uid: string, playerId: string, level = 5, limit = 7): Card => ({ uid, playerId, level, limit, condition: 80, injuredFor: 0, exp: 12 })

describe('retired cards move onto the real squads', () => {
  it('retires only generated cards of clubs that have a published squad, never 퇴장감', () => {
    expect(retired.length).toBeGreaterThan(100)
    for (const player of retired) {
      expect(player.fromSquad).toBeUndefined()
      expect(player.unreleased).toBe(true)
      expect(PLAYERS.some((other) => other.fromSquad && other.club === player.club)).toBe(true)
    }
    expect(getPlayer('n1125')?.retired).toBeUndefined()
    expect(migrationTarget('n1125')).toBeNull()
  })

  it('maps every retired card to a squad card of the same club and position group', () => {
    for (const player of retired) {
      const target = migrationTarget(player.id)
      expect(target, player.id).not.toBeNull()
      expect(target!.club).toBe(player.club)
      expect(target!.fromSquad).toBe(true)
      expect(POSITION_GROUP[target!.position]).toBe(POSITION_GROUP[player.position])
    }
  })

  it('is deterministic and leaves live cards alone', () => {
    const sample = retired[0]
    expect(migrationTarget(sample.id)?.id).toBe(migrationTarget(sample.id)?.id)
    const live = PLAYERS.find((player) => player.fromSquad && !player.unreleased)!
    expect(migrationTarget(live.id)).toBeNull()
    expect(migrateCard(card('a', live.id)).playerId).toBe(live.id)
  })

  it('keeps level, experience and condition, capped to the new grade', () => {
    const sample = retired.find((player) => player.rarity === 'World') ?? retired[0]
    const moved = migrateCard(card('x', sample.id, 10, 10))
    const target = getPlayer(moved.playerId)!
    expect(moved.uid).toBe('x')
    expect(moved.exp).toBe(12)
    expect(moved.condition).toBe(80)
    expect(moved.limit).toBeLessThanOrEqual(levelCap(target))
    expect(moved.level).toBeLessThanOrEqual(moved.limit)
  })

  it('drops a duplicate player from the team sheet but keeps both cards', () => {
    const club = retired[0].club
    const twins = retired.filter((player) => player.club === club && migrationTarget(player.id)?.id === migrationTarget(retired[0].id)?.id)
    if (twins.length < 2) return
    const cards = [card('c1', twins[0].id), card('c2', twins[1].id)]
    const squad = { formation: '4-3-3' as const, slots: { gk: null, d1: 'c1', d2: 'c2' }, bench: [] }
    const report = migrateCollection(cards, [twins[0].id, twins[1].id], squad)
    expect(report.moved).toBe(2)
    expect(report.cards).toHaveLength(2)
    expect(report.squad.slots.d1).toBe('c1')
    expect(report.squad.slots.d2).toBeNull()
    expect(report.collected).toEqual([migrationTarget(twins[0].id)!.id])
  })

  it('migrates a whole save on read', () => {
    const state = initialState()
    const sample = retired[0]
    const raw = { ...state, cards: [...state.cards, card('old', sample.id)], collected: [...state.collected, sample.id] }
    const read = normalizeSave(raw)!
    const moved = read.cards.find((item) => item.uid === 'old')!
    expect(moved.playerId).toBe(migrationTarget(sample.id)!.id)
    expect(read.collected).toContain(moved.playerId)
    expect(read.collected).not.toContain(sample.id)
  })
})
