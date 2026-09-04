'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Two card looks, kept side by side so both can be tried on the same save.
 *
 * - `card1` is the current design: dark FIFA-style frame, drawn portrait,
 *   OVR and the six stats.
 * - `card2` is the look the project shipped with before the football game
 *   replaced it: a white face, a flat rarity colour block, and a rarity
 *   animation on reveal. It only ever showed name, rarity and position.
 *
 * This is a testing switch, not game state, so it lives in its own key and
 * never touches the save file.
 */
export type CardStyle = 'card1' | 'card2'

export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  card1: '카드1',
  card2: '카드2',
}

const KEY = 'football-day-card-style'

function read(): CardStyle {
  if (typeof window === 'undefined') return 'card1'
  try {
    return window.localStorage.getItem(KEY) === 'card2' ? 'card2' : 'card1'
  } catch {
    return 'card1'
  }
}

const CardStyleContext = createContext<{ style: CardStyle; setStyle: (next: CardStyle) => void }>({
  style: 'card1',
  setStyle: () => {},
})

export function CardStyleProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render must agree, so the stored choice is only
  // applied after mount.
  const [style, setStyleState] = useState<CardStyle>('card1')

  useEffect(() => {
    setStyleState(read())
  }, [])

  const setStyle = useCallback((next: CardStyle) => {
    setStyleState(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // A browser with storage blocked still gets the switch for this session.
    }
  }, [])

  return (
    <CardStyleContext.Provider value={{ style, setStyle }}>{children}</CardStyleContext.Provider>
  )
}

export function useCardStyle() {
  return useContext(CardStyleContext)
}

/** Header switch. Small enough to sit beside 로그인 and 도움말. */
export function CardStyleToggle() {
  const { style, setStyle } = useCardStyle()
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/5 p-0.5"
      title="카드 디자인을 바꿔 봅니다. 게임 진행에는 영향이 없습니다."
    >
      {(['card1', 'card2'] as const).map((key) => (
        <button
          key={key}
          onClick={() => setStyle(key)}
          className={`whitespace-nowrap rounded-[10px] px-2 py-1.5 text-[11px] font-bold transition ${
            style === key ? 'btn-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          {CARD_STYLE_LABELS[key]}
        </button>
      ))}
    </div>
  )
}
