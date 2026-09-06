import { describe, expect, it } from 'vitest'
import { FORMATIONS, FORMATION_FAMILIES, FORMATION_KEYS, familyOf } from '../lib/formations'

describe('formations', () => {
  it('모든 포메이션은 골키퍼 하나에 11명이고 슬롯 id가 겹치지 않는다', () => {
    for (const key of FORMATION_KEYS) {
      const slots = FORMATIONS[key].slots
      expect(slots, key).toHaveLength(11)
      expect(slots.filter((slot) => slot.position === 'GK'), key).toHaveLength(1)
      expect(new Set(slots.map((slot) => slot.id)).size, key).toBe(11)
      for (const slot of slots) {
        expect(slot.x, `${key} ${slot.id}`).toBeGreaterThanOrEqual(0)
        expect(slot.x, `${key} ${slot.id}`).toBeLessThanOrEqual(100)
        expect(slot.y, `${key} ${slot.id}`).toBeGreaterThanOrEqual(0)
        expect(slot.y, `${key} ${slot.id}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('예전 네 가지 키는 각 가족의 기본 유형으로 남아 있다', () => {
    for (const legacy of ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'] as const) {
      expect(familyOf(legacy).keys[0]).toBe(legacy)
    }
  })

  it('가족마다 유형이 겹치지 않고 모든 키를 덮는다', () => {
    const all = FORMATION_FAMILIES.flatMap((family) => family.keys)
    expect(new Set(all).size).toBe(all.length)
    expect(all.sort()).toEqual([...FORMATION_KEYS].sort())
    for (const family of FORMATION_FAMILIES) {
      const variants = family.keys.map((key) => FORMATIONS[key].variant)
      expect(new Set(variants).size, family.family).toBe(variants.length)
    }
  })

  it('같은 가족 안에서 유형을 바꾸면 자리가 대부분 유지된다', () => {
    const base = new Set(FORMATIONS['4-3-3'].slots.map((slot) => slot.id))
    for (const key of familyOf('4-3-3').keys) {
      const shared = FORMATIONS[key].slots.filter((slot) => base.has(slot.id)).length
      expect(shared, key).toBe(11)
    }
  })
})
