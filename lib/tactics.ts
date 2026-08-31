export type PlanKey = 'attack' | 'balanced' | 'defend'
export type PressingKey = 'low' | 'medium' | 'high'
export type LineKey = 'deep' | 'normal' | 'high'
export type TempoKey = 'slow' | 'normal' | 'fast'

/** Backwards compatible alias — the plan used to be the whole tactic. */
export type TacticKey = PlanKey

export interface TacticSetup {
  plan: PlanKey
  pressing: PressingKey
  line: LineKey
  tempo: TempoKey
}

export const DEFAULT_TACTIC: TacticSetup = {
  plan: 'balanced',
  pressing: 'medium',
  line: 'normal',
  tempo: 'normal',
}

interface Option<T extends string> {
  key: T
  label: string
  description: string
  /** Keyboard shortcut used during a match. */
  hotkey: string
}

export const PLANS: Option<PlanKey>[] = [
  { key: 'attack', label: '공격적', description: '기회를 많이 만들지만 뒷공간을 내줍니다', hotkey: '1' },
  { key: 'balanced', label: '균형', description: '공수 균형을 맞춘 기본 전술', hotkey: '2' },
  { key: 'defend', label: '수비적', description: '실점을 줄이는 대신 경기가 잠깁니다', hotkey: '3' },
]

export const PRESSINGS: Option<PressingKey>[] = [
  { key: 'low', label: '압박 낮음', description: '체력을 아끼고 파울이 줄어듭니다', hotkey: 'Q' },
  { key: 'medium', label: '압박 보통', description: '무난한 압박 강도', hotkey: 'W' },
  { key: 'high', label: '압박 높음', description: '공을 빨리 뺏지만 체력 소모와 파울이 늘어납니다', hotkey: 'E' },
]

export const LINES: Option<LineKey>[] = [
  { key: 'deep', label: '수비 라인 낮게', description: '뒷공간을 막지만 공격이 무뎌집니다', hotkey: 'A' },
  { key: 'normal', label: '수비 라인 보통', description: '기본 위치', hotkey: 'S' },
  { key: 'high', label: '수비 라인 높게', description: '공격이 살지만 역습에 약해집니다', hotkey: 'D' },
]

export const TEMPOS: Option<TempoKey>[] = [
  { key: 'slow', label: '템포 느리게', description: '경기 수를 줄이고 체력을 아낍니다', hotkey: 'Z' },
  { key: 'normal', label: '템포 보통', description: '기본 속도', hotkey: 'X' },
  { key: 'fast', label: '템포 빠르게', description: '기회가 늘지만 체력이 빨리 빠집니다', hotkey: 'C' },
]

export interface TacticEffects {
  /** Multiplier on our attack rating. */
  att: number
  /** Multiplier on our defence rating. */
  def: number
  /** Multiplier on how often chances happen. */
  chance: number
  /** Multiplier on foul frequency. */
  foul: number
  /** Multiplier on how fast the squad tires. */
  fatigue: number
  /** Rating the opponent gains on the counter. */
  counterRisk: number
}

export function tacticEffects(setup: TacticSetup = DEFAULT_TACTIC): TacticEffects {
  const effects: TacticEffects = { att: 1, def: 1, chance: 1, foul: 1, fatigue: 1, counterRisk: 0 }

  if (setup.plan === 'attack') {
    effects.att *= 1.08
    effects.def *= 0.93
    effects.chance *= 1.18
    effects.counterRisk += 2
  } else if (setup.plan === 'defend') {
    effects.att *= 0.93
    effects.def *= 1.08
    effects.chance *= 0.85
  }

  if (setup.pressing === 'high') {
    effects.chance *= 1.08
    effects.def *= 1.03
    effects.foul *= 1.6
    effects.fatigue *= 1.3
    effects.counterRisk += 2
  } else if (setup.pressing === 'low') {
    effects.chance *= 0.95
    effects.foul *= 0.6
    effects.fatigue *= 0.85
  }

  if (setup.line === 'high') {
    effects.att *= 1.05
    effects.counterRisk += 3
  } else if (setup.line === 'deep') {
    effects.def *= 1.05
    effects.chance *= 0.94
  }

  if (setup.tempo === 'fast') {
    effects.chance *= 1.15
    effects.fatigue *= 1.2
  } else if (setup.tempo === 'slow') {
    effects.chance *= 0.88
    effects.fatigue *= 0.9
  }

  return effects
}

/** Short label used on the match screen. */
export function tacticSummary(setup: TacticSetup): string {
  const plan = PLANS.find((item) => item.key === setup.plan)?.label ?? ''
  const pressing = PRESSINGS.find((item) => item.key === setup.pressing)?.label ?? ''
  const line = LINES.find((item) => item.key === setup.line)?.label ?? ''
  const tempo = TEMPOS.find((item) => item.key === setup.tempo)?.label ?? ''
  return [plan, pressing, line, tempo].filter(Boolean).join(' · ')
}

/** Older saves stored just the plan. */
export function normalizeTactic(value: unknown): TacticSetup {
  if (typeof value === 'string') {
    const plan = PLANS.some((item) => item.key === value) ? (value as PlanKey) : 'balanced'
    return { ...DEFAULT_TACTIC, plan }
  }
  if (value && typeof value === 'object') {
    const setup = value as Partial<TacticSetup>
    return {
      plan: PLANS.some((item) => item.key === setup.plan) ? setup.plan! : DEFAULT_TACTIC.plan,
      pressing: PRESSINGS.some((item) => item.key === setup.pressing)
        ? setup.pressing!
        : DEFAULT_TACTIC.pressing,
      line: LINES.some((item) => item.key === setup.line) ? setup.line! : DEFAULT_TACTIC.line,
      tempo: TEMPOS.some((item) => item.key === setup.tempo) ? setup.tempo! : DEFAULT_TACTIC.tempo,
    }
  }
  return DEFAULT_TACTIC
}

/** Everything a hotkey can change mid match, in one lookup table. */
export const TACTIC_HOTKEYS: {
  key: string
  field: keyof TacticSetup
  value: string
  label: string
}[] = [
  ...PLANS.map((item) => ({ key: item.hotkey, field: 'plan' as const, value: item.key, label: item.label })),
  ...PRESSINGS.map((item) => ({
    key: item.hotkey,
    field: 'pressing' as const,
    value: item.key,
    label: item.label,
  })),
  ...LINES.map((item) => ({ key: item.hotkey, field: 'line' as const, value: item.key, label: item.label })),
  ...TEMPOS.map((item) => ({
    key: item.hotkey,
    field: 'tempo' as const,
    value: item.key,
    label: item.label,
  })),
]
