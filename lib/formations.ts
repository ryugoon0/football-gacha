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
  label: string
  description: string
  slots: Slot[]
}

const gk: Slot = { id: 'gk', position: 'GK', x: 50, y: 10 }

export const FORMATIONS: Record<FormationKey, Formation> = {
  '4-3-3': {
    key: '4-3-3',
    label: '4-3-3',
    description: '측면 공격에 힘을 싣는 기본 전술',
    slots: [
      gk,
      { id: 'd1', position: 'LB', x: 14, y: 30 },
      { id: 'd2', position: 'CB', x: 38, y: 26 },
      { id: 'd3', position: 'CB', x: 62, y: 26 },
      { id: 'd4', position: 'RB', x: 86, y: 30 },
      { id: 'm1', position: 'CM', x: 26, y: 50 },
      { id: 'm2', position: 'CDM', x: 50, y: 44 },
      { id: 'm3', position: 'CM', x: 74, y: 50 },
      { id: 'f1', position: 'LW', x: 18, y: 78 },
      { id: 'f2', position: 'ST', x: 50, y: 82 },
      { id: 'f3', position: 'RW', x: 82, y: 78 },
    ],
  },
  '4-4-2': {
    key: '4-4-2',
    label: '4-4-2',
    description: '균형 잡힌 두 줄 수비와 투톱',
    slots: [
      gk,
      { id: 'd1', position: 'LB', x: 14, y: 30 },
      { id: 'd2', position: 'CB', x: 38, y: 26 },
      { id: 'd3', position: 'CB', x: 62, y: 26 },
      { id: 'd4', position: 'RB', x: 86, y: 30 },
      { id: 'm1', position: 'LM', x: 14, y: 54 },
      { id: 'm2', position: 'CM', x: 38, y: 48 },
      { id: 'm3', position: 'CM', x: 62, y: 48 },
      { id: 'm4', position: 'RM', x: 86, y: 54 },
      { id: 'f1', position: 'ST', x: 36, y: 82 },
      { id: 'f2', position: 'ST', x: 64, y: 82 },
    ],
  },
  '4-2-3-1': {
    key: '4-2-3-1',
    label: '4-2-3-1',
    description: '두 명의 수비형 미드필더로 중원을 잠근다',
    slots: [
      gk,
      { id: 'd1', position: 'LB', x: 14, y: 30 },
      { id: 'd2', position: 'CB', x: 38, y: 26 },
      { id: 'd3', position: 'CB', x: 62, y: 26 },
      { id: 'd4', position: 'RB', x: 86, y: 30 },
      { id: 'm1', position: 'CDM', x: 36, y: 42 },
      { id: 'm2', position: 'CDM', x: 64, y: 42 },
      { id: 'm3', position: 'LM', x: 16, y: 66 },
      { id: 'm4', position: 'CAM', x: 50, y: 66 },
      { id: 'm5', position: 'RM', x: 84, y: 66 },
      { id: 'f1', position: 'ST', x: 50, y: 82 },
    ],
  },
  '3-5-2': {
    key: '3-5-2',
    label: '3-5-2',
    description: '중원 숫자로 경기를 지배하는 전술',
    slots: [
      gk,
      { id: 'd2', position: 'CB', x: 26, y: 26 },
      { id: 'd3', position: 'CB', x: 50, y: 25 },
      { id: 'd4', position: 'CB', x: 74, y: 26 },
      { id: 'm1', position: 'LM', x: 12, y: 52 },
      { id: 'm2', position: 'CM', x: 34, y: 48 },
      { id: 'm3', position: 'CDM', x: 50, y: 40 },
      { id: 'm4', position: 'CAM', x: 66, y: 58 },
      { id: 'm5', position: 'RM', x: 88, y: 52 },
      { id: 'f1', position: 'ST', x: 36, y: 82 },
      { id: 'f2', position: 'ST', x: 64, y: 82 },
    ],
  },
}

export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[]

export function emptySlots(key: FormationKey): Record<string, string | null> {
  const slots: Record<string, string | null> = {}
  for (const slot of FORMATIONS[key].slots) slots[slot.id] = null
  return slots
}
