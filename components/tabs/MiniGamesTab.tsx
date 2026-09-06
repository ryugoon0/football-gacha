'use client'

import { useState } from 'react'
import PvpTab from './PvpTab'
import PredictionTab from './PredictionTab'

/**
 * 미니게임 — small side modes next to the leagues. 데일리 PvP came first,
 * 빅매치 예측 second; more take their place in the same picker as they arrive.
 */
const GAMES = [
  { key: 'pvp', label: '데일리 PvP', note: '다른 감독의 실제 스쿼드와 하루 몇 판, 시즌에 영향 없음' },
  { key: 'predict', label: '빅매치 예측', note: '이번 주 빅매치 결과를 전부 맞히면 골드' },
] as const

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
        </div>
      </div>
      {game === 'pvp' && <PvpTab />}
      {game === 'predict' && <PredictionTab />}
    </div>
  )
}
