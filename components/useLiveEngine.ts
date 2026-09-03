'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { advance, createMatch, type LiveMatchState, type MatchSetup } from '../lib/matchEngine'

export const TICK_SPEEDS = [
  { label: '보통', ms: 90 },
  { label: '빠르게', ms: 40 },
  { label: '아주 빠르게', ms: 12 },
]

export interface LiveEngine {
  state: LiveMatchState | null
  running: boolean
  finished: boolean
  paused: boolean
  /** Stop the clock automatically whenever play is halted. */
  autoPause: boolean
  setAutoPause: (value: boolean) => void
  /** True only while play is halted — the moment a manager may step in. */
  canIntervene: boolean
  speed: number
  setSpeed: (index: number) => void
  togglePause: () => void
  start: () => void
  reset: () => void
}

/**
 * Drives the match engine in real time. The setup is read fresh on every tick,
 * so substitutions and tactical changes take effect from that minute on.
 *
 * rng defaults to Math.random for a purely local match. A server-backed match
 * passes a seeded rng derived from the seed the server already committed a
 * result under — same setup, same seed, same engine version reproduces that
 * exact result tick for tick, so this stays a faithful *replay* rather than a
 * second, possibly different, simulation. See lib/onlineMatch.ts.
 */
export function useLiveEngine(
  setup: MatchSetup | null,
  onFinish: (state: LiveMatchState) => void,
  rng: () => number = Math.random,
): LiveEngine {
  const [state, setState] = useState<LiveMatchState | null>(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeedIndex] = useState(0)
  // Orders can be queued while play runs, so the clock only stops on request.
  const [autoPause, setAutoPause] = useState(false)
  // Remembers which stoppage already paused the clock, so resuming works.
  const pausedFor = useRef<string | null>(null)

  const setupRef = useRef(setup)
  setupRef.current = setup
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish
  const rngRef = useRef(rng)
  rngRef.current = rng
  const settled = useRef(false)

  useEffect(() => {
    if (!state || state.finished || paused) return
    const timer = setTimeout(() => {
      const current = setupRef.current
      if (!current) return
      setState((previous) => (previous ? advance(previous, current, rngRef.current) : previous))
    }, TICK_SPEEDS[speed].ms)
    return () => clearTimeout(timer)
  }, [state, paused, speed])

  // A stoppage is only a few ticks long, so hold the clock there to give the
  // manager a real chance to step in.
  useEffect(() => {
    if (!autoPause || !state || state.finished || !state.stoppage) return
    const signature = `${state.minute}-${state.stoppage.kind}`
    if (pausedFor.current === signature) return
    pausedFor.current = signature
    setPaused(true)
  }, [state, autoPause])

  useEffect(() => {
    if (state?.finished && !settled.current) {
      settled.current = true
      finishRef.current(state)
    }
  }, [state])

  const start = useCallback(() => {
    const current = setupRef.current
    if (!current) return
    settled.current = false
    pausedFor.current = null
    setPaused(false)
    setState(createMatch(current))
  }, [])

  const reset = useCallback(() => {
    settled.current = false
    pausedFor.current = null
    setState(null)
    setPaused(false)
  }, [])

  return {
    state,
    running: Boolean(state) && !state!.finished,
    finished: Boolean(state?.finished),
    paused,
    autoPause,
    setAutoPause,
    canIntervene: Boolean(state && !state.finished && state.stoppage !== null),
    speed,
    setSpeed: setSpeedIndex,
    togglePause: () => setPaused((value) => !value),
    start,
    reset,
  }
}
