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

const gk: Slot = { id: 'gk', position: 'GK', x: 50, y: 9 }

export const FORMATIONS: Record<FormationKey, Formation> = {
  '4-3-3': {
    key: '4-3-3',
    label: '4-3-3',
    description: '측면 공격에 힘을 싣는 기본 전술',
    slots: [
      gk,
      { id: 'd1', position: 'LB', x: 10, y: 32 },
      { id: 'd2', position: 'CB', x: 37, y: 30 },
      { id: 'd3', position: 'CB', x: 63, y: 30 },
      { id: 'd4', position: 'RB', x: 90, y: 32 },
      { id: 'm1', position: 'CM', x: 22, y: 56 },
      { id: 'm2', position: 'CDM', x: 50, y: 48 },
      { id: 'm3', position: 'CM', x: 78, y: 56 },
      { id: 'f1', position: 'LW', x: 14, y: 80 },
      { id: 'f2', position: 'ST', x: 50, y: 82 },
      { id: 'f3', position: 'RW', x: 86, y: 80 },
    ],
  },
  '4-4-2': {
    key: '4-4-2',
    label: '4-4-2',
    description: '균형 잡힌 두 줄 수비와 투톱',
    slots: [
      gk,
      { id: 'd1', position: 'LB', x: 10, y: 32 },
      { id: 'd2', position: 'CB', x: 37, y: 30 },
      { id: 'd3', position: 'CB', x: 63, y: 30 },
      { id: 'd4', position: 'RB', x: 90, y: 32 },
      { id: 'm1', position: 'LM', x: 10, y: 54 },
      { id: 'm2', position: 'CM', x: 37, y: 50 },
      { id: 'm3', position: 'CM', x: 63, y: 50 },
      { id: 'm4', position: 'RM', x: 90, y: 54 },
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
      { id: 'd1', position: 'LB', x: 10, y: 32 },
      { id: 'd2', position: 'CB', x: 37, y: 30 },
      { id: 'd3', position: 'CB', x: 63, y: 30 },
      { id: 'd4', position: 'RB', x: 90, y: 32 },
      { id: 'm1', position: 'CDM', x: 35, y: 48 },
      { id: 'm2', position: 'CDM', x: 65, y: 48 },
      { id: 'm3', position: 'LM', x: 12, y: 66 },
      { id: 'm4', position: 'CAM', x: 50, y: 66 },
      { id: 'm5', position: 'RM', x: 88, y: 66 },
      { id: 'f1', position: 'ST', x: 50, y: 82 },
    ],
  },
  '3-5-2': {
    key: '3-5-2',
    label: '3-5-2',
    description: '중원 숫자로 경기를 지배하는 전술',
    slots: [
      gk,
      { id: 'd2', position: 'CB', x: 22, y: 31 },
      { id: 'd3', position: 'CB', x: 50, y: 31 },
      { id: 'd4', position: 'CB', x: 78, y: 31 },
      { id: 'm1', position: 'LM', x: 10, y: 54 },
      { id: 'm2', position: 'CM', x: 34, y: 48 },
      { id: 'm3', position: 'CDM', x: 50, y: 40 },
      { id: 'm4', position: 'CAM', x: 66, y: 58 },
      { id: 'm5', position: 'RM', x: 90, y: 54 },
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
