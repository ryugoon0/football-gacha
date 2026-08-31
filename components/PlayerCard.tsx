'use client'

import { MAX_CONDITION, TIRED_CONDITION } from '../lib/condition'
import { GK_STAT_LABELS, STAT_LABELS, effectiveOvr, effectiveStats } from '../lib/players'
import { RARITY_STYLES } from '../lib/rarity'
import type { PlayerDef, Stats } from '../lib/types'
import PlayerAvatar from './PlayerAvatar'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { frame: string; ovr: string; name: string; meta: string }> = {
  sm: {
    frame: 'w-[68px] text-[9px] sm:w-20 sm:text-[10px]',
    ovr: 'text-base sm:text-lg',
    name: 'text-[10px]',
    meta: 'text-[8px]',
  },
  md: { frame: 'w-32 text-xs', ovr: 'text-2xl', name: 'text-sm', meta: 'text-[10px]' },
  lg: { frame: 'w-48 text-sm', ovr: 'text-4xl', name: 'text-lg', meta: 'text-xs' },
}

const STAT_ORDER: (keyof Stats)[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

export default function PlayerCard({
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
}: {
  player: PlayerDef
  level?: number
  size?: Size
  selected?: boolean
  dimmed?: boolean
  /** Match fitness 0-100; omit for cards that are not owned yet. */
  condition?: number
  injuredFor?: number
  badge?: string
  onClick?: () => void
  className?: string
}) {
  const style = RARITY_STYLES[player.rarity]
  const dimensions = SIZES[size]
  const stats = effectiveStats(player, level)
  const ovr = effectiveOvr(player, level)
  const labels = player.position === 'GK' ? GK_STAT_LABELS : STAT_LABELS
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`relative block overflow-hidden rounded-xl border-2 bg-gradient-to-b text-left transition ${
        style.face
      } ${style.border} ${style.ink} ${dimensions.frame} ${
        selected ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900' : ''
      } ${dimmed ? 'opacity-45 grayscale' : ''} ${
        onClick ? 'hover:-translate-y-1 hover:shadow-xl' : ''
      } shadow-lg ${style.glow} ${className}`}
    >
      {injuredFor > 0 && (
        <span className="absolute left-1 top-1 z-10 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
          부상 {injuredFor}경기
        </span>
      )}
      {badge && (
        <span className="absolute right-1 top-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}

      <div className="flex gap-1 px-2 pt-2">
        <div className="flex w-8 shrink-0 flex-col items-center leading-none">
          <span className={`font-black ${dimensions.ovr}`}>{ovr}</span>
          <span className="mt-0.5 text-[10px] font-bold">{player.position}</span>
          <span className="mt-1 h-px w-4 bg-current opacity-40" />
          <span className="mt-1 text-[8px] font-semibold opacity-80">{player.nation}</span>
          {level > 1 && (
            <span className="mt-1 rounded bg-black/25 px-1 text-[8px] font-bold text-white">
              +{level - 1}
            </span>
          )}
        </div>
        <PlayerAvatar player={player} className="min-w-0 flex-1" />
      </div>

      {typeof condition === 'number' && (
        <div className="mx-2 mb-1 h-1 rounded-full bg-black/25">
          <div
            className={`h-1 rounded-full ${
              condition < TIRED_CONDITION ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, (condition / MAX_CONDITION) * 100))}%` }}
          />
        </div>
      )}

      <div className="bg-black/15 px-1.5 py-1 text-center">
        <div className={`truncate font-extrabold ${dimensions.name}`}>{player.name}</div>
        <div className={`truncate font-medium opacity-70 ${dimensions.meta}`}>
          {style.label} · {player.club}
        </div>
      </div>

      {size !== 'sm' && (
        <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 bg-black/10 px-1.5 py-1.5 text-center">
          {STAT_ORDER.map((key) => (
            <div key={key} className="leading-tight">
              <div className="text-[8px] font-semibold uppercase opacity-70">{labels[key]}</div>
              <div className="text-[11px] font-bold">{stats[key]}</div>
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  )
}
