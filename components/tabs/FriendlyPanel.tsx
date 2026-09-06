'use client'

import { useState } from 'react'
import { applyAutoSubs } from '../../lib/autoSub'
import { MINI_GAME_LIMIT, miniGamesLeft } from '../../lib/daily'
import { friendlyOpponent } from '../../lib/league'
import { MINI_GAME_REWARD, simulateMatch } from '../../lib/match'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import { planForMode } from '../../lib/tactics/mode'
import type { MatchResult } from '../../lib/types'
import { useGame } from '../GameProvider'
import { useTacticsMode } from '../TacticsMode'

/**
 * 데일리 미니게임 — ten quick friendlies a day that pay gold and experience
 * without touching any table, and (since 2026-09-06) without costing legs:
 * the eleven come off exactly as fresh as they went on. Lives in the
 * 미니게임 tab next to 데일리 PvP; played in one go, no live view.
 */
export default function FriendlyPanel() {
  const { state, playMiniGame } = useGame()
  const { mode: tacticsMode } = useTacticsMode()
  const [last, setLast] = useState<MatchResult | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const left = miniGamesLeft(state.daily)
  const division = state.season.division

  const play = () => {
    if (left <= 0) return
    const auto = state.autoSub
      ? applyAutoSubs(state.cards, state.squad, division)
      : { squad: state.squad, subs: [] }
    const lineup = evaluateSquad(state.cards, auto.squad, division)
    const gaps = missingSlots(lineup.evaluations)
    if (gaps.empty.length > 0 || gaps.injured.length > 0) {
      const parts = [
        gaps.empty.length ? `빈 자리 ${gaps.empty.join(' · ')}` : '',
        gaps.injured.length ? `부상 ${gaps.injured.join(' · ')}` : '',
      ].filter(Boolean)
      setProblem(`선발 11명을 채워야 합니다 — ${parts.join(', ')}`)
      return
    }
    setProblem(null)
    const opponent = friendlyOpponent(division, state.daily.miniGames)
    const base = simulateMatch({
      team: lineup,
      teamName: state.club,
      opponent,
      division,
      venue: 'neutral',
      tactic: state.tactic,
      phased: planForMode(state.plan, tacticsMode),
      traits: lineup.traits,
    })
    // Friendlies pay less than a league match.
    const result = { ...base, reward: Math.round(base.reward * MINI_GAME_REWARD) }
    playMiniGame(result, { squad: auto.squad, subs: auto.subs })
    setLast(result)
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">데일리 미니게임</h3>
        <span className={`text-xs font-black ${left > 0 ? 'text-sky-300' : 'text-slate-500'}`}>
          {left} / {MINI_GAME_LIMIT}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        순위에 영향을 주지 않는 친선 경기입니다. 골드와 경험치를 주고, 체력은 쓰지 않으며 부상도 없습니다. 현재 스쿼드와 전술로 바로 칩니다.
      </p>

      <button
        onClick={play}
        disabled={left <= 0}
        className="mt-3 w-full whitespace-nowrap rounded-xl bg-sky-400 py-2.5 text-sm font-black text-slate-900 transition disabled:bg-white/10 disabled:text-slate-500 sm:hover:bg-sky-300"
      >
        {left > 0 ? '친선 경기 한 판' : '오늘 몫을 다 썼습니다'}
      </button>

      {problem && (
        <p className="mt-2 rounded-lg bg-amber-400/15 px-3 py-2 text-[11px] font-bold text-amber-200">
          {problem}
        </p>
      )}

      {last && (
        <div className="mt-3 rounded-xl bg-slate-950/70 p-3 text-center">
          <div className="text-[11px] text-slate-400">{last.opponent}</div>
          <div className="text-xl font-black text-white">
            {last.scoreFor} : {last.scoreAgainst}
          </div>
          <div
            className={`text-xs font-bold ${
              last.result === 'W'
                ? 'text-emerald-300'
                : last.result === 'D'
                  ? 'text-slate-300'
                  : 'text-rose-300'
            }`}
          >
            {last.result === 'W' ? '승리' : last.result === 'D' ? '무승부' : '패배'} · +
            {last.reward.toLocaleString()}G
          </div>
        </div>
      )}
    </section>
  )
}
