'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RARITY_STYLES } from '../lib/rarity'
import { isHighRarity, type ReelPlan, type ReelStop } from '../lib/scoutReel'
import PlayerCard from './PlayerCard'

/** PlayerCard size "md" is w-32; the gap is what keeps the strip readable at speed. */
const CARD_W = 128
const GAP = 12
const STEP = CARD_W + GAP
/** Laps of the seven-card strip before the stop; `long` adds two or three more. */
const BASE_CYCLES = 5
const FAST_MS = 350

const EASE_OUT = 'cubic-bezier(0.08, 0.82, 0.17, 1)'

interface Phase {
  /** translateX target, px. */
  x: number
  ms: number
  ease: string
  /** Wait this long after arriving before the next phase starts (the 멈칫). */
  holdMs?: number
}

/** The stop choreography, as a list of transitions ending exactly on `end`. */
function phasesFor(stop: ReelStop, end: number): Phase[] {
  switch (stop) {
    case 'long':
      return [{ x: end, ms: 5400, ease: EASE_OUT }]
    case 'overshoot':
      // Past the result by most of a card, rock back a little too far the other way, settle.
      return [
        { x: end - STEP * 0.8, ms: 3200, ease: 'cubic-bezier(0.1, 0.9, 0.25, 1)' },
        { x: end + STEP * 0.3, ms: 750, ease: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { x: end, ms: 650, ease: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      ]
    case 'crawl':
      // One card short, hang there long enough to believe it, then tick over.
      return [
        { x: end + STEP, ms: 3300, ease: EASE_OUT, holdMs: 650 },
        { x: end, ms: 1000, ease: 'cubic-bezier(0.35, 0, 0.15, 1)' },
      ]
    default:
      return [{ x: end, ms: 3600, ease: EASE_OUT }]
  }
}

/**
 * A horizontal roulette of cards. The strip starts at speed and comes to rest
 * with the result under the frame — straight in, after extra laps, sliding
 * past and rocking back, or hanging one card short before ticking over (see
 * lib/scoutReel.ts ReelStop). `fast` (빨리 보기) collapses whatever remains
 * into a third of a second; flipping it mid-spin is fine, the browser retimes
 * from wherever the strip is.
 */
export default function ScoutReel({ plan, fast, onDone }: { plan: ReelPlan; fast: boolean; onDone: () => void }) {
  const cycles = plan.stop === 'long' ? BASE_CYCLES + 2 + (plan.stopIndex % 2) : BASE_CYCLES
  const sequence = useMemo(() => Array.from({ length: cycles }, () => plan.cards).flat(), [plan, cycles])
  const finalIndex = (cycles - 1) * plan.cards.length + plan.stopIndex
  const endX = -(finalIndex * STEP + CARD_W / 2)
  const startX = -(CARD_W / 2)
  const phases = useMemo(() => phasesFor(plan.stop, endX), [plan.stop, endX])

  // -1: parked at the start (painted once before anything moves); 0..n-1: running that phase.
  const [phase, setPhase] = useState(-1)
  const [landed, setLanded] = useState(false)
  const done = useRef(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    done.current = false
    setLanded(false)
    setPhase(-1)
    const frame = requestAnimationFrame(() => setPhase(0))
    return () => {
      cancelAnimationFrame(frame)
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [plan])

  const finish = () => {
    if (done.current) return
    done.current = true
    setLanded(true)
    onDone()
  }

  const lastPhase = phases.length - 1
  // 빨리 보기 jumps to the end regardless of where the choreography stands.
  const active = fast ? phases[lastPhase] : phases[Math.max(0, Math.min(phase, lastPhase))]
  const duration = fast ? FAST_MS : active.ms
  const targetX = phase < 0 && !fast ? startX : active.x
  const isLast = fast || phase >= lastPhase

  const advance = () => {
    if (isLast) {
      finish()
      return
    }
    const hold = active.holdMs ?? 0
    if (hold > 0) {
      holdTimer.current = setTimeout(() => setPhase((current) => current + 1), hold)
    } else {
      setPhase((current) => current + 1)
    }
  }

  // transitionend can be swallowed (tab hidden, reduced motion); a timer backs each phase up.
  useEffect(() => {
    if (phase < 0 && !fast) return
    const timer = setTimeout(advance, duration + 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fast, duration])

  const result = plan.cards[plan.stopIndex]
  // Static class names only — Tailwind has to see them in the source to ship them.
  const landedRing = isHighRarity(result.rarity) ? 'ring-amber-300' : 'ring-emerald-300'

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${plan.special ? 'reel-special border-amber-300/50' : 'reel-plain border-white/10'}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 to-transparent sm:w-28" />
      <div
        className={`pointer-events-none absolute left-1/2 top-3 bottom-3 z-10 w-[140px] -translate-x-1/2 rounded-2xl ring-2 transition-colors ${
          landed ? `${landedRing} reel-landed` : plan.special ? 'ring-amber-300/80' : 'ring-white/60'
        }`}
        title={landed ? `${RARITY_STYLES[result.rarity].label} ${result.name}` : undefined}
      />
      {plan.special && (
        <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black tracking-widest text-slate-900">
          SPECIAL
        </div>
      )}
      <div
        className="flex items-center py-6 will-change-transform"
        style={{
          paddingLeft: '50%',
          gap: GAP,
          transform: `translateX(${targetX}px)`,
          transition: phase < 0 && !fast ? 'none' : `transform ${duration}ms ${fast ? EASE_OUT : active.ease}`,
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform' && event.target === event.currentTarget) advance()
        }}
      >
        {sequence.map((player, index) => {
          const isResult = index === finalIndex
          const high = isHighRarity(player.rarity)
          return (
            <div
              key={`${player.id}-${index}`}
              style={{ width: CARD_W }}
              className={`shrink-0 transition-transform duration-300 ${isResult && landed ? 'scale-110' : ''} ${
                landed && !isResult ? 'opacity-40' : ''
              } ${plan.special && high ? 'reel-high' : ''}`}
            >
              <PlayerCard player={player} size="md" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
