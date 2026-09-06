'use client'

import { MAX_CONDITION } from '../lib/condition'
import { tune } from '../lib/tuning'
import { effectiveOvr } from '../lib/players'
import { ratingInSlot } from '../lib/squad'
import type { PlayerDef, Position, Rarity } from '../lib/types'
import PlayerAvatar from './PlayerAvatar'

/**
 * The card the project shipped with before the football game replaced it:
 * a flat rarity colour, the portrait centred on top of it, and name, position
 * and rarity underneath. Legend, Live and World cards get the white ring that
 * pings, bounces or spins.
 *
 * The five PNG portraits the original used were dropped from the repo (15MB
 * for five faces across the whole roster), so the drawn portrait is reused —
 * the frame, colours, type and animations are the old ones.
 */

/** Flat card colours, straight from the original. */
export const RETRO_COLORS: Record<Rarity, string> = {
  Normal: 'bg-gray-300',
  Rare: 'bg-blue-400',
  Legend: 'bg-yellow-400',
  Live: 'bg-red-500',
  World: 'bg-green-500',
}

/** The reveal animation each top rarity got. */
export const RETRO_EFFECTS: Partial<Record<Rarity, string>> = {
  Legend: 'animate-ping',
  Live: 'animate-bounce',
  World: 'animate-spin',
}

/** Normal and Rare sat on light colours, so their text stayed dark. */
const RETRO_INK: Record<Rarity, string> = {
  Normal: 'text-gray-900',
  Rare: 'text-blue-950',
  Legend: 'text-yellow-950',
  Live: 'text-white',
  World: 'text-white',
}

type Size = 'sm' | 'md' | 'lg'

/** Outer widths match card1 exactly so no list or pitch layout shifts. */
const SIZES: Record<Size, { frame: string; pad: string; name: string; meta: string; ovr: string }> = {
  sm: {
    frame: 'w-[68px] sm:w-20',
    pad: 'p-1',
    name: 'text-[10px]',
    meta: 'text-[8px]',
    ovr: 'text-[10px]',
  },
  md: { frame: 'w-32', pad: 'p-2', name: 'text-sm', meta: 'text-[10px]', ovr: 'text-xs' },
  lg: { frame: 'w-48', pad: 'p-4', name: 'text-xl', meta: 'text-sm', ovr: 'text-base' },
}

export default function RetroPlayerCard({
  player,
  level = 1,
  size = 'md',
  selected = false,
  dimmed = false,
  condition,
  injuredFor = 0,
  badge,
  onClick,
  className = '',
  slotPosition,
}: {
  player: PlayerDef
  level?: number
  size?: Size
  selected?: boolean
  dimmed?: boolean
  condition?: number
  injuredFor?: number
  badge?: string
  onClick?: () => void
  className?: string
  slotPosition?: Position
}) {
  const dimensions = SIZES[size]
  // The original only ever showed one card at a time, so the ring could ping,
  // bounce and spin freely. In a squad list of twenty it is unreadable, so the
  // animation is kept for the reveal-sized card and the ring alone elsewhere.
  const effect = size === 'lg' ? RETRO_EFFECTS[player.rarity] : undefined
  const ringed = player.rarity in RETRO_EFFECTS
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`relative block rounded-xl text-center shadow-lg transition ${
        RETRO_COLORS[player.rarity]
      } ${RETRO_INK[player.rarity]} ${dimensions.frame} ${dimensions.pad} ${
        selected ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900' : ''
      } ${dimmed ? 'opacity-45 grayscale' : ''} ${
        onClick ? 'hover:-translate-y-1 hover:shadow-xl' : ''
      } ${className}`}
    >
      {/* The rarity ring. Only the top three rarities ever had one. */}
      {ringed && (
        <div
          className={`pointer-events-none absolute inset-0 z-10 rounded-xl border-4 border-white ${
            effect ?? ''
          }`}
        />
      )}

      {injuredFor > 0 && (
        <span className="absolute left-1 top-1 z-20 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
          부상 {injuredFor}
        </span>
      )}
      {badge && (
        <span className="absolute right-1 top-1 z-20 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}

      <PlayerAvatar player={player} className="relative z-20 mx-auto mb-1" />

      {typeof condition === 'number' && (
        <div className="relative z-20 mb-1 h-1 rounded-full bg-black/25">
          <div
            className={`h-1 rounded-full ${
              condition < tune('tiredCondition') ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, (condition / MAX_CONDITION) * 100))}%` }}
          />
        </div>
      )}

      <div className={`relative z-20 truncate font-bold ${dimensions.name}`}>{player.name}</div>
      <div className={`relative z-20 truncate ${dimensions.meta}`}>
        {size === 'sm' ? (slotPosition ?? player.position) : `Position: ${slotPosition ?? player.position}`}
      </div>
      {size !== 'sm' && (
        <div className={`relative z-20 truncate font-semibold ${dimensions.meta}`}>
          Rarity: {player.rarity}
        </div>
      )}
      <div className={`relative z-20 font-black ${dimensions.ovr}`}>
        {slotPosition ? ratingInSlot(player, level, slotPosition) : effectiveOvr(player, level)} · Lv.{level}
      </div>
    </Wrapper>
  )
}
