'use client'

import { conditionFactor } from '../lib/condition'
import { positionFit, ratingInSlot } from '../lib/squad'
import type { PlayerDef, Position } from '../lib/types'

/** Where each position sits on the board (x %, y % from the bottom — own goal at the bottom). */
const SPOTS: { position: Position; x: number; y: number }[] = [
  { position: 'GK', x: 50, y: 8 },
  { position: 'LB', x: 15, y: 26 },
  { position: 'CB', x: 50, y: 24 },
  { position: 'RB', x: 85, y: 26 },
  { position: 'CDM', x: 50, y: 42 },
  { position: 'LM', x: 15, y: 55 },
  { position: 'CM', x: 50, y: 58 },
  { position: 'RM', x: 85, y: 55 },
  { position: 'CAM', x: 50, y: 73 },
  { position: 'LW', x: 18, y: 84 },
  { position: 'ST', x: 50, y: 90 },
  { position: 'RW', x: 82, y: 84 },
]

const TONE = {
  main: 'bg-emerald-400 text-slate-950 ring-emerald-200',
  sub: 'bg-amber-400 text-slate-950 ring-amber-200',
  out: 'bg-slate-800/80 text-slate-500 ring-white/10',
  empty: 'bg-slate-800/80 text-slate-500 ring-white/10',
} as const

const FIT_LABEL = { main: '주 포지션', sub: '가능 포지션', out: '불가능 (능력치 급감)', empty: '' } as const

/**
 * Every position on one board, coloured by how this player fits it, with the
 * rating they would play at there. Green is home, amber is fine, grey costs
 * most of the rating — the same colours the squad screen uses on its rings.
 */
export default function PositionMap({ player, level, condition }: { player: PlayerDef; level: number; condition: number }) {
  const factor = conditionFactor(condition)
  const score = (position: Position) => Math.round(ratingInSlot(player, level, position) * factor)
  const order: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST']

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
      <div className="pitch relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/15">
        <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-36 -translate-x-1/2 border border-white/25" />
        <div className="pointer-events-none absolute top-3 left-1/2 h-12 w-36 -translate-x-1/2 border border-white/25" />
        {SPOTS.map(({ position, x, y }) => {
          const fit = positionFit(player, position)
          return (
            <div
              key={position}
              style={{ left: `${x}%`, bottom: `${y}%` }}
              className={`absolute flex h-12 w-12 -translate-x-1/2 translate-y-1/2 flex-col items-center justify-center rounded-full ring-2 ${TONE[fit]} ${
                fit === 'main' ? 'scale-110 shadow-[0_0_18px_rgba(52,211,153,0.6)]' : ''
              }`}
              title={`${position} · ${FIT_LABEL[fit]} · ${score(position)}`}
            >
              <span className="text-[9px] font-black leading-none">{position}</span>
              <span className="text-sm font-black leading-tight tabular-nums">{score(position)}</span>
            </div>
          )
        })}
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1 text-[10px] font-bold">
          <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-emerald-200">주 포지션</span>
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-200">가능 포지션</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-slate-400">불가능</span>
        </div>
        <ul className="divide-y divide-white/5 text-[11px]">
          {order.map((position) => {
            const fit = positionFit(player, position)
            return (
              <li key={position} className={`flex items-center justify-between py-1 ${fit === 'out' ? 'text-slate-500' : 'text-slate-200'}`}>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${fit === 'main' ? 'bg-emerald-400' : fit === 'sub' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span className="w-9 font-bold">{position}</span>
                  <span className="text-[10px] text-slate-500">{FIT_LABEL[fit]}</span>
                </span>
                <span className={`font-black tabular-nums ${fit === 'main' ? 'text-emerald-300' : fit === 'sub' ? 'text-amber-200' : ''}`}>{score(position)}</span>
              </li>
            )
          })}
        </ul>
        <p className="pt-1 text-[10px] text-slate-500">숫자는 지금 체력을 반영한 그 자리 점수입니다.</p>
      </div>
    </div>
  )
}
