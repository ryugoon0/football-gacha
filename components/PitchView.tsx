'use client'

import type { LiveMatchState } from '../lib/matchEngine'

/**
 * The match as discs on a board: our eleven in green, theirs in slate, the ball
 * as a small white dot. Positions come straight from the engine.
 *
 * `glideMs` is how long a disc takes to reach a new position. Casual mode
 * ticks every 90ms, so the default snap is right; the weekly live match gets
 * one position per match minute (10 real seconds), so it passes a glide of
 * about that length and the discs flow between updates instead of jumping
 * once every ten seconds — with a small sway on top so the board never
 * stands still.
 */
export default function PitchView({
  state,
  homeName,
  awayName,
  glideMs = 200,
}: {
  state: LiveMatchState
  homeName: string
  awayName: string
  glideMs?: number
}) {
  const stopped = state.stoppage !== null
  const glide = glideMs >= 1000
  const dotStyle = (x: number, y: number, index: number) => ({
    left: `${x}%`,
    bottom: `${y}%`,
    transitionDuration: `${glideMs}ms`,
    animationDelay: glide ? `${-(index % 7) * 0.37}s` : undefined,
  })

  return (
    <div className="pitch relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/15">
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-14 w-40 -translate-x-1/2 border border-white/25" />
      <div className="pointer-events-none absolute top-3 left-1/2 h-14 w-40 -translate-x-1/2 border border-white/25" />
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-white/20" />

      <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
        {awayName}
      </span>
      <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
        {homeName}
      </span>

      {state.away.map((dot, index) => (
        <span
          key={dot.id}
          className={`absolute h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full border border-white/30 bg-slate-300/80 transition-all ease-linear ${
            glide ? 'pitch-sway' : ''
          }`}
          style={dotStyle(dot.liveX, dot.liveY, index + 3)}
          title={`${awayName} ${dot.label}`}
        />
      ))}

      {state.home.map((dot, index) => (
        <span
          key={dot.id}
          className={`absolute flex h-5 w-5 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-emerald-200 btn-primary text-[7px] font-black transition-all ease-linear ${
            glide ? 'pitch-sway' : ''
          }`}
          style={dotStyle(dot.liveX, dot.liveY, index)}
          title={`${dot.label} (${dot.role})`}
        >
          {dot.role}
        </span>
      ))}

      <span
        className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all ease-linear"
        style={{ left: `${state.ball.x}%`, bottom: `${state.ball.y}%`, transitionDuration: `${Math.round(glideMs * 0.7)}ms` }}
      />

      <div className="absolute right-2 top-2 rounded-lg bg-black/50 px-2 py-1 text-right">
        <div className="text-[10px] font-bold text-slate-300">{state.minute}분</div>
        <div className="text-sm font-black text-white">
          {state.scoreFor} : {state.scoreAgainst}
        </div>
      </div>

      {stopped && (
        <div
          data-testid="stoppage-banner"
          className="absolute inset-x-0 bottom-0 bg-amber-400/90 px-3 py-1.5 text-center text-xs font-black text-slate-900"
        >
          경기 중단 — {state.stoppage!.text} · 지시가 적용되는 순간입니다
        </div>
      )}
    </div>
  )
}
