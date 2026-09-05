'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RARITY_STYLES } from '../lib/rarity'
import { isHighRarity, type ReelPlan } from '../lib/scoutReel'
import PlayerCard from './PlayerCard'

/** PlayerCard size "md" is w-32; the gap is what keeps the strip readable at speed. */
const CARD_W = 128
const GAP = 12
const STEP = CARD_W + GAP
/** The seven-card strip repeats so the run-up is long enough to feel like a spin. */
const CYCLES = 5
const SPIN_MS = 3600
const FAST_MS = 350

/**
 * A horizontal roulette of cards. The strip starts at speed, eases out over
 * about three and a half seconds and lands with the result under the frame.
 * `fast` (빨리 보기) collapses the remaining travel into a third of a second —
 * flipping it mid-spin is fine, the browser retimes from wherever the strip is.
 */
export default function ScoutReel({ plan, fast, onDone }: { plan: ReelPlan; fast: boolean; onDone: () => void }) {
  const sequence = useMemo(() => Array.from({ length: CYCLES }, () => plan.cards).flat(), [plan])
  const finalIndex = (CYCLES - 1) * plan.cards.length + plan.stopIndex
  const [go, setGo] = useState(false)
  const [landed, setLanded] = useState(false)
  const done = useRef(false)

  // Start on the next frame so the initial position is painted before the
  // transition begins; otherwise the strip just appears at the end.
  useEffect(() => {
    done.current = false
    setLanded(false)
    setGo(false)
    const frame = requestAnimationFrame(() => setGo(true))
    return () => cancelAnimationFrame(frame)
  }, [plan])

  const finish = () => {
    if (done.current) return
    done.current = true
    setLanded(true)
    onDone()
  }

  // transitionend can be swallowed (tab hidden, reduced motion); a timer backs it up.
  const duration = fast ? FAST_MS : SPIN_MS
  useEffect(() => {
    if (!go) return
    const timer = setTimeout(finish, duration + 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, duration])

  const startX = -(CARD_W / 2)
  const endX = -(finalIndex * STEP + CARD_W / 2)
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
          transform: `translateX(${go ? endX : startX}px)`,
          transition: go ? `transform ${duration}ms cubic-bezier(0.08, 0.82, 0.17, 1)` : 'none',
        }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform') finish()
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
