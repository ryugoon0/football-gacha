'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchResult } from '../lib/types'

const MINUTE_MS = 40

export interface LiveMatch {
  result: MatchResult | null
  clock: number
  finished: boolean
  playing: boolean
  /** Events revealed so far, oldest first. */
  events: MatchResult['events']
  scoreFor: number
  scoreAgainst: number
  start: (result: MatchResult) => void
  reset: () => void
}

/**
 * Plays a simulated match back minute by minute and calls `onFinish` once, at
 * the final whistle.
 */
export function useLiveMatch(onFinish: (result: MatchResult) => void): LiveMatch {
  const [result, setResult] = useState<MatchResult | null>(null)
  const [clock, setClock] = useState(0)
  const [finished, setFinished] = useState(false)
  const settled = useRef(false)
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  useEffect(() => {
    if (!result || finished) return
    if (clock >= 90) {
      setFinished(true)
      if (!settled.current) {
        settled.current = true
        finishRef.current(result)
      }
      return
    }
    const timer = setTimeout(() => setClock((minute) => Math.min(90, minute + 1)), MINUTE_MS)
    return () => clearTimeout(timer)
  }, [result, clock, finished])

  const start = useCallback((next: MatchResult) => {
    settled.current = false
    setFinished(false)
    setClock(0)
    setResult(next)
  }, [])

  const reset = useCallback(() => {
    settled.current = false
    setResult(null)
    setClock(0)
    setFinished(false)
  }, [])

  const events = result ? result.events.filter((event) => event.minute <= clock) : []

  return {
    result,
    clock,
    finished,
    playing: Boolean(result) && !finished,
    events,
    scoreFor: events.filter((event) => event.type === 'goal' && event.side === 'home').length,
    scoreAgainst: events.filter((event) => event.type === 'goal' && event.side === 'away').length,
    start,
    reset,
  }
}
