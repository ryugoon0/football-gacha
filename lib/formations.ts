import type { FormationKey, Position } from './types'

export interface Slot {
  id: string
  position: Position
  /** Pitch coordinates in percent. x: 0 = left touchline, y: 0 = own goal line. */
  x: number
  y: number
}

export interface Formation {
  key: FormationKey
  /** The shape — what the family button says (4-3-3, 4-4-2 …). */
  family: string
  /** The midfield make-up that tells variants of one shape apart (CM CDM CM …). */
  variant: string
  label: string
  description: string
  slots: Slot[]
}

/**
 * Slot ids are by role, not by formation — d1..d4 defenders left to right,
 * m1..m5 midfield, f1..f3 forwards — so switching shape keeps whoever still
 * has a slot of the same id (gameReducer setFormation). Variants of one
 * family share ids for the slots that stay put, so 4-3-3 → 4-3-3 CAM moves
 * nobody but the midfielder whose position changed.
 */
const gk: Slot = { id: 'gk', position: 'GK', x: 50, y: 9 }
const back4: Slot[] = [
  { id: 'd1', position: 'LB', x: 10, y: 32 },
  { id: 'd2', position: 'CB', x: 37, y: 30 },
  { id: 'd3', position: 'CB', x: 63, y: 30 },
  { id: 'd4', position: 'RB', x: 90, y: 32 },
]
const back3: Slot[] = [
  { id: 'd2', position: 'CB', x: 22, y: 31 },
  { id: 'd3', position: 'CB', x: 50, y: 31 },
  { id: 'd4', position: 'CB', x: 78, y: 31 },
]
const front3: Slot[] = [
  { id: 'f1', position: 'LW', x: 14, y: 80 },
  { id: 'f2', position: 'ST', x: 50, y: 82 },
  { id: 'f3', position: 'RW', x: 86, y: 80 },
]
const front2: Slot[] = [
  { id: 'f1', position: 'ST', x: 36, y: 82 },
  { id: 'f2', position: 'ST', x: 64, y: 82 },
]

const formation = (
  key: FormationKey,
  family: string,
  variant: string,
  description: string,
  slots: Slot[],
): Formation => ({ key, family, variant, label: variant ? `${family} ${variant}` : family, description, slots })

export const FORMATIONS: Record<FormationKey, Formation> = {
  '4-3-3': formation('4-3-3', '4-3-3', 'CM CDM CM', '한 명이 뒤를 받치고 둘이 오르내리는 기본 4-3-3', [
    gk,
    ...back4,
    { id: 'm1', position: 'CM', x: 22, y: 56 },
    { id: 'm2', position: 'CDM', x: 50, y: 48 },
    { id: 'm3', position: 'CM', x: 78, y: 56 },
    ...front3,
  ]),
  '4-3-3-cam': formation('4-3-3-cam', '4-3-3', 'CM CM CAM', '중원 둘 위에 공격형 미드필더를 세워 스리톱을 지원한다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CM', x: 28, y: 50 },
    { id: 'm3', position: 'CM', x: 72, y: 50 },
    { id: 'm2', position: 'CAM', x: 50, y: 66 },
    ...front3,
  ]),
  '4-3-3-2cdm': formation('4-3-3-2cdm', '4-3-3', 'CDM CDM CAM', '더블 볼란치로 뒤를 잠그고 공격형 미드필더가 연결한다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CDM', x: 34, y: 46 },
    { id: 'm3', position: 'CDM', x: 66, y: 46 },
    { id: 'm2', position: 'CAM', x: 50, y: 66 },
    ...front3,
  ]),
  '4-3-3-flat': formation('4-3-3-flat', '4-3-3', 'CM CM CM', '세 명이 한 줄로 서는 평평한 중원 — 점유에 강하다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CM', x: 24, y: 54 },
    { id: 'm2', position: 'CM', x: 50, y: 54 },
    { id: 'm3', position: 'CM', x: 76, y: 54 },
    ...front3,
  ]),
  '4-4-2': formation('4-4-2', '4-4-2', 'LM CM CM RM', '균형 잡힌 두 줄 수비와 투톱', [
    gk,
    ...back4,
    { id: 'm1', position: 'LM', x: 10, y: 54 },
    { id: 'm2', position: 'CM', x: 37, y: 50 },
    { id: 'm3', position: 'CM', x: 63, y: 50 },
    { id: 'm4', position: 'RM', x: 90, y: 54 },
    ...front2,
  ]),
  '4-4-2-diamond': formation('4-4-2-diamond', '4-4-2', '다이아몬드', '측면을 버리고 중앙을 마름모로 채운다 — 투톱과 CAM의 삼각형', [
    gk,
    ...back4,
    { id: 'm2', position: 'CDM', x: 50, y: 42 },
    { id: 'm1', position: 'CM', x: 26, y: 54 },
    { id: 'm4', position: 'CM', x: 74, y: 54 },
    { id: 'm3', position: 'CAM', x: 50, y: 67 },
    ...front2,
  ]),
  '4-4-2-2cdm': formation('4-4-2-2cdm', '4-4-2', 'LM CDM CDM RM', '중앙 둘이 수비형으로 내려앉아 측면 미드필더가 넓게 뛴다', [
    gk,
    ...back4,
    { id: 'm1', position: 'LM', x: 10, y: 56 },
    { id: 'm2', position: 'CDM', x: 37, y: 46 },
    { id: 'm3', position: 'CDM', x: 63, y: 46 },
    { id: 'm4', position: 'RM', x: 90, y: 56 },
    ...front2,
  ]),
  '4-2-3-1': formation('4-2-3-1', '4-2-3-1', 'LM CAM RM', '두 명의 수비형 미드필더로 중원을 잠근다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CDM', x: 35, y: 48 },
    { id: 'm2', position: 'CDM', x: 65, y: 48 },
    { id: 'm3', position: 'LM', x: 12, y: 66 },
    { id: 'm4', position: 'CAM', x: 50, y: 66 },
    { id: 'm5', position: 'RM', x: 88, y: 66 },
    { id: 'f1', position: 'ST', x: 50, y: 82 },
  ]),
  '4-2-3-1-wide': formation('4-2-3-1-wide', '4-2-3-1', 'LW CAM RW', '2선의 측면을 윙어로 세워 높이 올린다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CDM', x: 35, y: 48 },
    { id: 'm2', position: 'CDM', x: 65, y: 48 },
    { id: 'm3', position: 'LW', x: 12, y: 72 },
    { id: 'm4', position: 'CAM', x: 50, y: 66 },
    { id: 'm5', position: 'RW', x: 88, y: 72 },
    { id: 'f1', position: 'ST', x: 50, y: 84 },
  ]),
  '4-2-4': formation('4-2-4', '4-2-4', '', '중원 둘만 두고 앞에 넷 — 공격에 모든 것을 건다', [
    gk,
    ...back4,
    { id: 'm1', position: 'CM', x: 35, y: 50 },
    { id: 'm2', position: 'CM', x: 65, y: 50 },
    { id: 'f1', position: 'LW', x: 12, y: 78 },
    { id: 'f2', position: 'ST', x: 38, y: 84 },
    { id: 'f4', position: 'ST', x: 62, y: 84 },
    { id: 'f3', position: 'RW', x: 88, y: 78 },
  ]),
  '3-5-2': formation('3-5-2', '3-5-2', 'CM CDM CAM', '중원 숫자로 경기를 지배하는 전술', [
    gk,
    ...back3,
    { id: 'm1', position: 'LM', x: 10, y: 54 },
    { id: 'm2', position: 'CM', x: 34, y: 48 },
    { id: 'm3', position: 'CDM', x: 50, y: 40 },
    { id: 'm4', position: 'CAM', x: 66, y: 58 },
    { id: 'm5', position: 'RM', x: 90, y: 54 },
    ...front2,
  ]),
  '3-5-2-2cdm': formation('3-5-2-2cdm', '3-5-2', 'CDM CDM CAM', '스리백 앞에 더블 볼란치, 그 위에 공격형 미드필더', [
    gk,
    ...back3,
    { id: 'm1', position: 'LM', x: 10, y: 56 },
    { id: 'm2', position: 'CDM', x: 36, y: 44 },
    { id: 'm3', position: 'CDM', x: 64, y: 44 },
    { id: 'm4', position: 'CAM', x: 50, y: 64 },
    { id: 'm5', position: 'RM', x: 90, y: 56 },
    ...front2,
  ]),
  '3-4-3': formation('3-4-3', '3-4-3', '', '스리백에 중원 넷, 앞에 스리톱 — 측면 미드필더가 오르내린다', [
    gk,
    ...back3,
    { id: 'm1', position: 'LM', x: 10, y: 54 },
    { id: 'm2', position: 'CM', x: 37, y: 50 },
    { id: 'm3', position: 'CM', x: 63, y: 50 },
    { id: 'm4', position: 'RM', x: 90, y: 54 },
    ...front3,
  ]),
}

export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[]

export interface FormationFamily {
  family: string
  /** Variants in display order; the first is the family's default. */
  keys: FormationKey[]
}

/** Shapes in display order, each with its variants — the two-row picker in the squad screen. */
export const FORMATION_FAMILIES: FormationFamily[] = (() => {
  const families: FormationFamily[] = []
  for (const key of FORMATION_KEYS) {
    const family = FORMATIONS[key].family
    const entry = families.find((item) => item.family === family)
    if (entry) entry.keys.push(key)
    else families.push({ family, keys: [key] })
  }
  return families
})()

export function familyOf(key: FormationKey): FormationFamily {
  const family = FORMATIONS[key]?.family ?? FORMATIONS['4-3-3'].family
  return FORMATION_FAMILIES.find((item) => item.family === family) ?? FORMATION_FAMILIES[0]
}

export function emptySlots(key: FormationKey): Record<string, string | null> {
  const slots: Record<string, string | null> = {}
  for (const slot of FORMATIONS[key].slots) slots[slot.id] = null
  return slots
}
