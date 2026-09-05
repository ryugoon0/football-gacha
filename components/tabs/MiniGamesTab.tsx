'use client'

import { useState } from 'react'
import PvpTab from './PvpTab'

/**
 * 미니게임 — small side modes next to the leagues. 데일리 PvP is the first;
 * more take their place in the same picker as they arrive.
 */
const GAMES = [{ key: 'pvp', label: '데일리 PvP', note: '다른 감독의 실제 스쿼드와 하루 몇 판, 시즌에 영향 없음' }] as const

type GameKey = (typeof GAMES)[number]['key']

export default function MiniGamesTab() {
  const [game, setGame] = useState<GameKey>('pvp')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 panel p-3">
        <span className="text-xs font-bold text-slate-300">미니게임</span>
        <div className="flex flex-wrap gap-1">
          {GAMES.map((item) => (
            <button
              key={item.key}
              onClick={() => setGame(item.key)}
              title={item.note}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${game === item.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {item.label}
            </button>
          ))}
          <span className="rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-slate-500">다른 미니게임 준비 중</span>
        </div>
      </div>
      {game === 'pvp' && <PvpTab />}
    </div>
  )
}
