'use client'

import { MAX_CONDITION, TIRED_CONDITION } from '../lib/condition'
import { GK_STAT_LABELS, STAT_LABELS, effectiveOvr, effectiveStats } from '../lib/players'
import { ratingInSlot } from '../lib/squad'
import { TRAITS, traitsOf } from '../lib/traits'
import { RARITY_STYLES } from '../lib/rarity'
import type { PlayerDef, Position, Stats } from '../lib/types'
import PlayerAvatar from './PlayerAvatar'
import RetroPlayerCard from './RetroPlayerCard'
import { useCardStyle } from './CardStyle'

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

interface CardProps {
  player: PlayerDef
  level?: number
  size?: Size
  selected?: boolean
  dimmed?: boolean
  /** Match fitness 0-100; omit for cards that are not owned yet. */
  condition?: number
  injuredFor?: number
  suspendedFor?: number
  badge?: string
  /**
   * The slot the card is fielded in. When given, the card shows that position
   * and the overall the player is worth there (a listed alternative costs a
   * few points, an unlisted one far more) instead of the home position.
   */
  slotPosition?: Position
  onClick?: () => void
  className?: string
}

/**
 * Renders whichever card look is switched on. Both take the same props, so
 * every list, pitch slot and reveal in the game follows the switch.
 */
export default function PlayerCard(props: CardProps) {
  const { style } = useCardStyle()
  return style === 'card2' ? <RetroPlayerCard {...props} /> : <ModernPlayerCard {...props} />
}

function ModernPlayerCard({
  player,
  level = 1,
  size = 'md',
  selected = false,
  dimmed = false,
  condition,
  injuredFor = 0,
  suspendedFor = 0,
  badge,
  slotPosition,
  onClick,
  className = '',
}: CardProps) {
  const style = RARITY_STYLES[player.rarity]
  const dimensions = SIZES[size]
  const stats = effectiveStats(player, level)
  const shownPosition = slotPosition ?? player.position
  const ovr = slotPosition ? ratingInSlot(player, level, slotPosition) : effectiveOvr(player, level)
  const offPosition = Boolean(slotPosition) && slotPosition !== player.position
  const labels = player.position === 'GK' ? GK_STAT_LABELS : STAT_LABELS
  const traits = size === 'lg' ? traitsOf(player) : []
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
      {injuredFor > 0 ? (
        <span className="absolute left-1 top-1 z-10 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
          부상 {injuredFor}경기
        </span>
      ) : suspendedFor > 0 ? (
        <span className="absolute left-1 top-1 z-10 rounded bg-red-700 px-1.5 py-0.5 text-[9px] font-black text-white">
          🟥 출전정지 {suspendedFor}경기
        </span>
      ) : null}
      {badge && (
        <span className="absolute right-1 top-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}

      {size === 'sm' ? (
        // On the pitch and the bench the face is what a manager recognises, so
        // the portrait takes most of the small card and the numbers sit on top of it.
        <div className="relative px-1 pt-1">
          <PlayerAvatar player={player} className="mx-auto w-[46px] sm:w-[54px]" />
          <div className="absolute left-1 top-1 flex flex-col items-start leading-none">
            <span className={`font-black drop-shadow ${dimensions.ovr}`}>{ovr}</span>
            <span className={`text-[9px] font-bold drop-shadow ${offPosition ? 'opacity-80' : ''}`} title={offPosition ? `본 포지션 ${player.position}` : undefined}>{shownPosition}</span>
          </div>
          <span className="absolute bottom-0 right-1 rounded bg-black/40 px-1 text-[8px] font-bold text-white">Lv.{level}</span>
        </div>
      ) : (
        <div className="flex gap-1 px-2 pt-2">
          <div className="flex w-8 shrink-0 flex-col items-center leading-none">
            <span className={`font-black ${dimensions.ovr}`}>{ovr}</span>
            <span className="mt-0.5 text-[10px] font-bold">{shownPosition}</span>
            <span className="mt-1 h-px w-4 bg-current opacity-40" />
            <span className="mt-1 text-[8px] font-semibold opacity-80">{player.nation}</span>
            <span className="mt-0.5 rounded bg-black/25 px-1 text-[8px] font-bold text-white">
              Lv.{level}
            </span>
          </div>
          <PlayerAvatar player={player} className="min-w-0 flex-1" />
        </div>
      )}

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
        {size !== 'sm' && (
          <div className={`truncate font-medium opacity-70 ${dimensions.meta}`}>
            {style.label} · {player.club}
          </div>
        )}
      </div>

      {traits.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 bg-black/10 px-1.5 pb-1">
          {traits.map((id) => (
            <span
              key={id}
              className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                TRAITS[id].tone === 'good' ? 'bg-black/25 text-white' : 'bg-rose-900/70 text-rose-100'
              }`}
            >
              {TRAITS[id].name}
            </span>
          ))}
        </div>
      )}

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
