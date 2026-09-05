import { hashString, pickInRange } from './random'
import type { Rarity } from './types'

/**
 * The type name and the label a player sees no longer match: an earlier
 * rename swapped only the *display* labels below, so the 'Legend' type shows
 * as 골드 (was 월드 until 2026-09-05) and the 'World' type shows as 레전드 (the
 * actual top tier). The ladder a player sees is 일반 · 실버 · 골드 · 라이브 · 레전드. Renaming
 * the type itself would touch save data already written under these keys
 * (e.g. GameState.pulls.byRarity) and needs a migration, so it stays as-is —
 * read RARITY_STYLES[x].label, not the type name, for what a player sees.
 */
export const RARITIES: Rarity[] = ['Normal', 'Rare', 'Legend', 'Live', 'World']

/** Pull rates, in percent. Must sum to 100. */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  Normal: 70,
  Rare: 20,
  Legend: 5,
  Live: 3,
  World: 2,
}

interface RarityStyle {
  label: string
  /** Card face gradient. */
  face: string
  /** Card border colour. */
  border: string
  /** Text colour on the card face. */
  ink: string
  /** Small badge used in lists and filters. */
  chip: string
  /** Outer glow shown while revealing a pull. */
  glow: string
  /** Gold you get for selling a spare copy. */
  sell: number
  /** Base cost of one training level. */
  trainCost: number
}

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  Normal: {
    label: '일반',
    face: 'from-slate-300 via-slate-200 to-slate-400',
    border: 'border-slate-500',
    ink: 'text-slate-900',
    chip: 'bg-slate-200 text-slate-800',
    glow: 'shadow-slate-400/40',
    // 2026-09-05: 60 → 12 (20%) — releasing spare 일반 cards was funding pulls.
    sell: 12,
    trainCost: 150,
  },
  Rare: {
    label: '실버',
    face: 'from-sky-300 via-sky-200 to-blue-500',
    border: 'border-blue-700',
    ink: 'text-blue-950',
    chip: 'bg-sky-200 text-blue-900',
    glow: 'shadow-sky-400/50',
    // 2026-09-05: 220 → 66 (30%).
    sell: 66,
    trainCost: 320,
  },
  Legend: {
    label: '골드',
    face: 'from-amber-200 via-yellow-300 to-amber-500',
    border: 'border-amber-700',
    ink: 'text-amber-950',
    chip: 'bg-amber-200 text-amber-900',
    glow: 'shadow-amber-400/60',
    sell: 900,
    trainCost: 700,
  },
  Live: {
    label: '라이브',
    face: 'from-rose-300 via-red-400 to-rose-700',
    border: 'border-rose-900',
    ink: 'text-rose-50',
    chip: 'bg-rose-200 text-rose-900',
    glow: 'shadow-rose-500/60',
    sell: 1500,
    trainCost: 1000,
  },
  World: {
    label: '레전드',
    face: 'from-emerald-200 via-teal-300 to-emerald-600',
    border: 'border-emerald-900',
    ink: 'text-emerald-950',
    chip: 'bg-emerald-200 text-emerald-900',
    glow: 'shadow-emerald-400/70',
    sell: 3000,
    trainCost: 1600,
  },
}

/** Nothing can be trained past this. */
export const MAX_LEVEL = 10

interface RarityTier {
  /** Level a fresh card of this rarity starts on. */
  startLevel: [min: number, max: number]
  /** Highest level this rarity can ever reach. */
  levelCap: number
}

/**
 * Rarity decides both where a card starts and how far it can go, so a 일반 card
 * never catches a 월드 one even when both are fully trained.
 */
export const RARITY_TIERS: Record<Rarity, RarityTier> = {
  Normal: { startLevel: [2, 2], levelCap: 8 },
  Rare: { startLevel: [3, 3], levelCap: 9 },
  Legend: { startLevel: [4, 5], levelCap: MAX_LEVEL },
  Live: { startLevel: [4, 5], levelCap: MAX_LEVEL },
  World: { startLevel: [5, 5], levelCap: MAX_LEVEL },
}

export function startLevelOf(rarity: Rarity, playerId: string): number {
  const [min, max] = RARITY_TIERS[rarity].startLevel
  return min === max ? min : pickInRange(hashString(`${playerId}:start`), min, max)
}

export function levelCapOf(rarity: Rarity): number {
  return RARITY_TIERS[rarity].levelCap
}

export function trainCost(rarity: Rarity, level: number): number {
  return RARITY_STYLES[rarity].trainCost * level
}
