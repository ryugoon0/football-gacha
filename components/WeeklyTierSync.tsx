'use client'

import { useEffect } from 'react'
import { useGame } from './GameProvider'
import { fetchMyWeeklyTier } from '../lib/weeklyLive'

/**
 * Keeps GameState.weeklyTier in step with the server — the 경쟁 리그 tier
 * sets the squad level budget (lib/squad.ts lineupDivisionOf), so it has to
 * be right before the manager opens the squad screen, not only after they
 * visit the league tab. Runs on sign-in and every ten minutes; the league tab
 * updates it too whenever it loads a membership.
 */
export default function WeeklyTierSync({ enabled }: { enabled: boolean }) {
  const { state, setWeeklyTier } = useGame()
  const current = state.weeklyTier ?? null
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    const sync = async () => {
      const tier = await fetchMyWeeklyTier()
      if (!stopped && tier !== current) setWeeklyTier(tier)
    }
    void sync()
    const timer = setInterval(() => void sync(), 10 * 60 * 1000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [enabled, current, setWeeklyTier])
  return null
}
