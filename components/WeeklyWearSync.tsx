'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from './GameProvider'
import { syncWeeklyWear, wearRates, type WearSummary } from '../lib/weeklyWear'

/**
 * Pulls the 경쟁 리그 fitness ledger into the save: on sign-in, every few
 * minutes, and whenever the tab comes back to the foreground — a manager who
 * opens the game after a day of fixtures sees the drained legs right away,
 * then a short toast says how many matches did it. Save follows at once so
 * the acknowledged lines are never lost with an unsaved collection.
 */
export default function WeeklyWearSync({ enabled }: { enabled: boolean }) {
  const { applyWeeklyWear, account } = useGame()
  const [toast, setToast] = useState<WearSummary | null>(null)
  const busy = useRef(false)

  const sync = useCallback(async () => {
    if (!enabled || busy.current) return
    busy.current = true
    try {
      const summary = await syncWeeklyWear(applyWeeklyWear)
      if (summary) {
        setTimeout(() => void account.saveNow(), 50)
        setToast(summary)
      }
    } finally {
      busy.current = false
    }
  }, [enabled, applyWeeklyWear, account])

  useEffect(() => {
    if (!enabled) return
    void sync()
    const timer = setInterval(() => void sync(), 5 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, sync])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  const rates = wearRates()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="pointer-events-auto rounded-xl border border-sky-400/30 bg-slate-900/95 px-4 py-2.5 text-xs text-slate-100 shadow-lg">
        <span className="font-bold text-sky-200">경쟁 리그 체력 반영</span> · 내 경기 {toast.fixtures}경기 — 선발 −{rates.starter}, 교체 −{rates.sub}, 휴식 +{rates.rest}
      </div>
    </div>
  )
}
