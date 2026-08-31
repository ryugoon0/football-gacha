export type TacticKey = 'attack' | 'balanced' | 'defend'

export interface Tactic {
  key: TacticKey
  label: string
  description: string
  /** Multipliers applied to the squad's attack and defence ratings. */
  att: number
  def: number
  /** How often chances happen in a match. */
  tempo: number
}

export const TACTICS: Record<TacticKey, Tactic> = {
  attack: {
    key: 'attack',
    label: '공격적',
    description: '기회를 많이 만들지만 뒷공간을 내줍니다',
    att: 1.08,
    def: 0.93,
    tempo: 1.18,
  },
  balanced: {
    key: 'balanced',
    label: '균형',
    description: '공수 균형을 맞춘 기본 전술',
    att: 1,
    def: 1,
    tempo: 1,
  },
  defend: {
    key: 'defend',
    label: '수비적',
    description: '실점을 줄이는 대신 경기가 잠깁니다',
    att: 0.93,
    def: 1.08,
    tempo: 0.85,
  },
}

export const TACTIC_KEYS = Object.keys(TACTICS) as TacticKey[]
