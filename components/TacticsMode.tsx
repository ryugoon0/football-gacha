'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  TACTICS_MODE_LABELS,
  TACTICS_MODE_NOTES,
  TACTICS_MODES,
  type TacticsMode,
} from '../lib/tactics/mode'

/**
 * Which tactics system the manager is playing with. Kept out of the save file
 * so trying the other one never risks a game in progress.
 */
const KEY = 'football-day-tactics-mode'

function read(): TacticsMode {
  if (typeof window === 'undefined') return 'sliders'
  try {
    return window.localStorage.getItem(KEY) === 'phased' ? 'phased' : 'sliders'
  } catch {
    return 'sliders'
  }
}

const TacticsModeContext = createContext<{ mode: TacticsMode; setMode: (next: TacticsMode) => void }>(
  { mode: 'sliders', setMode: () => {} },
)

export function TacticsModeProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render must agree, so the stored choice is applied
  // only after mount.
  const [mode, setModeState] = useState<TacticsMode>('sliders')

  useEffect(() => {
    setModeState(read())
  }, [])

  const setMode = useCallback((next: TacticsMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked: the switch still works for this session.
    }
  }, [])

  return (
    <TacticsModeContext.Provider value={{ mode, setMode }}>{children}</TacticsModeContext.Provider>
  )
}

export function useTacticsMode() {
  return useContext(TacticsModeContext)
}

/** The chooser itself, shown at the top of 전술 상세. */
export function TacticsModePicker() {
  const { mode, setMode } = useTacticsMode()
  return (
    <div className="mb-3 rounded-xl bg-white/5 p-2">
      <div className="mb-1.5 text-[11px] font-bold text-slate-400">전술 방식</div>
      <div className="flex gap-1.5">
        {TACTICS_MODES.map((key) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
              mode === key ? 'bg-emerald-400 text-slate-900' : 'bg-white/5 text-slate-300'
            }`}
          >
            {TACTICS_MODE_LABELS[key]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {TACTICS_MODE_NOTES[mode]}
      </p>
    </div>
  )
}
