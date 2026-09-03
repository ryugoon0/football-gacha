import { describe, expect, it } from 'vitest'
import {
  basePlayer,
  emptyEdit,
  isEmpty,
  overrideLine,
  overridesBlock,
  previewEdit,
  searchPlayers,
  tighten,
  validateEdit,
} from '../lib/rosterEditor'
import { PLAYERS_BY_ID, buildPlayer } from '../lib/players'
import type { Position } from '../lib/types'

const anyId = 'lg01'

describe('선수 편집', () => {
  it('건드리지 않은 선수는 아무 항목도 남기지 않는다', () => {
    expect(isEmpty(tighten(anyId, emptyEdit()))).toBe(true)
  })

  it('생성된 값과 같은 값을 적으면 항목이 남지 않는다', () => {
    const base = basePlayer(anyId)!
    const fix = tighten(anyId, { stats: { pac: base.stats.pac }, hidden: {} })
    expect(isEmpty(fix)).toBe(true)
  })

  it('고친 능력치만 남는다', () => {
    const base = basePlayer(anyId)!
    const fix = tighten(anyId, { stats: { pac: base.stats.pac, sho: 91 }, hidden: {} })
    expect(fix.stats).toEqual({ sho: 91 })
    expect(fix.hidden).toBeUndefined()
  })

  it('포지션을 바꾸면 자동 능력치도 그 포지션으로 다시 생성된다', () => {
    const id = 'lg02'
    const base = basePlayer(id)!
    const other = base.position === 'ST' ? 'CB' : 'ST'
    const preview = previewEdit(id, { position: other, stats: {}, hidden: {} })!
    expect(preview.position).toBe(other)
    expect(preview.positions[0]).toBe(other)
    expect(preview.stats).not.toEqual(base.stats)
    // The overall still lands on the same target after the reshape.
    expect(Math.abs(preview.ovr - base.ovr)).toBeLessThanOrEqual(1)
  })

  it('미리보기는 게임이 실제로 만드는 카드와 같다', () => {
    const edit = { stats: { pac: 77 }, hidden: { clutch: 9 } }
    const preview = previewEdit(anyId, edit)!
    const built = buildPlayer(anyId, tighten(anyId, edit))!
    expect(preview).toEqual(built)
    expect(preview.stats.pac).toBe(77)
    expect(preview.hidden.clutch).toBe(9)
  })

  it('범위를 벗어난 값은 막는다', () => {
    expect(validateEdit({ stats: { pac: 120 }, hidden: {} })).not.toBeNull()
    expect(validateEdit({ stats: {}, hidden: { clutch: 99 } })).not.toBeNull()
    expect(validateEdit({ stats: { pac: 80 }, hidden: { clutch: 5 } })).toBeNull()
  })

  it('자동 생성된 것과 같은 소화 포지션 목록을 적으면 항목이 남지 않는다', () => {
    const base = basePlayer(anyId)!
    const fix = tighten(anyId, { positions: base.positions, stats: {}, hidden: {} })
    expect(fix.positions).toBeUndefined()
  })

  it('소화 포지션을 늘리면 카드에 그대로 반영된다', () => {
    const base = basePlayer(anyId)!
    const extra: Position = base.positions.includes('CDM') ? 'CM' : 'CDM'
    const custom = [...base.positions, extra]
    const preview = previewEdit(anyId, { positions: custom, stats: {}, hidden: {} })!
    expect(preview.positions).toEqual(custom)
    // Everything else about the card is untouched by this alone.
    expect(preview.stats).toEqual(base.stats)
  })

  it('붙여넣을 블록은 파일에 그대로 들어가는 모양이다', () => {
    const block = overridesBlock({ [anyId]: { position: 'CB', stats: { pac: 70 }, hidden: {} } })
    expect(block.startsWith('export const PLAYER_OVERRIDES')).toBe(true)
    expect(block.trimEnd().endsWith('}')).toBe(true)
    expect(block).toContain(`'${anyId}': {`)
    expect(block).toContain("position: 'CB'")
    expect(block).toContain('pac: 70')
  })

  it('소화 포지션 목록도 붙여넣을 블록에 배열로 들어간다', () => {
    const block = overridesBlock({ [anyId]: { positions: ['CB', 'CDM'], stats: {}, hidden: {} } })
    expect(block).toContain("positions: ['CB', 'CDM']")
  })

  it('되돌린 선수는 블록에서 사라진다', () => {
    expect(overridesBlock({ [anyId]: emptyEdit() })).not.toContain(anyId)
  })

  it('한 줄에 누구인지 적어 둔다', () => {
    const line = overrideLine(anyId, { stats: { pac: 70 } }, PLAYERS_BY_ID[anyId].name)
    expect(line).toContain(PLAYERS_BY_ID[anyId].name)
  })

  it('이름, 소속팀, 번호 어느 쪽으로도 찾힌다', () => {
    const target = PLAYERS_BY_ID[anyId]
    const filters = { rarity: 'all', position: 'all' }
    expect(searchPlayers({ ...filters, query: target.name }).map((p) => p.id)).toContain(anyId)
    expect(searchPlayers({ ...filters, query: anyId }).map((p) => p.id)).toContain(anyId)
    expect(searchPlayers({ ...filters, query: target.club }).length).toBeGreaterThan(0)
  })

  it('등급과 포지션으로 좁힐 수 있다', () => {
    const found = searchPlayers({ query: '', rarity: 'Legend', position: 'CB' })
    expect(found.length).toBeGreaterThan(0)
    for (const player of found) {
      expect(player.rarity).toBe('Legend')
      expect(player.positions).toContain('CB')
    }
  })
})
