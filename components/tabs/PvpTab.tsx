'use client'

import { useState } from 'react'
import { useGame } from '../GameProvider'
import { applyAutoSubs } from '../../lib/autoSub'
import { divisionLabel } from '../../lib/league'
import { pvpMatchesLeft } from '../../lib/daily'
import { getPlayer } from '../../lib/players'
import { isPublicSquadMember } from '../../lib/publicClub'
import {
  PVP_MATCH_FAILURE_MESSAGE,
  fetchPvpOpponentSquad,
  playPvpMatchOnServer,
  pvpMatchAvailable,
  searchPvpOpponents,
  type PvpOpponentSquad,
  type PvpOpponentSummary,
} from '../../lib/pvpMatch'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import type { MatchResult } from '../../lib/types'
import { planForMode } from '../../lib/tactics/mode'
import { useTacticsMode } from '../TacticsMode'
import PlayerCard from '../PlayerCard'

export default function PvpTab() {
  const { state, playPvpMatch } = useGame()
  const { mode: tacticsMode } = useTacticsMode()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PvpOpponentSummary[]>([])
  const [opponent, setOpponent] = useState<PvpOpponentSquad | null>(null)
  const [loadingOpponent, setLoadingOpponent] = useState(false)
  const [challenging, setChallenging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ result: MatchResult; opponentClubName: string } | null>(null)

  const daily = state.daily
  const left = pvpMatchesLeft(daily)
  const division = state.season.division

  const runSearch = async (term: string) => {
    setQuery(term)
    setOpponent(null)
    setNotice(null)
    if (!term.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const found = await searchPvpOpponents(term)
    setResults(found)
    setSearching(false)
  }

  const openOpponent = async (userId: string) => {
    setLoadingOpponent(true)
    setNotice(null)
    setLastResult(null)
    const outcome = await fetchPvpOpponentSquad(userId)
    setLoadingOpponent(false)
    if (!outcome.ok) {
      setNotice(
        outcome.reason === 'not found'
          ? '상대를 찾을 수 없습니다.'
          : '상대 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      setOpponent(null)
      return
    }
    setOpponent(outcome.squad)
  }

  const challenge = async () => {
    if (!opponent) return
    if (left <= 0) {
      setNotice('오늘의 PvP 도전 횟수를 모두 썼습니다.')
      return
    }
    const auto = state.autoSub
      ? applyAutoSubs(state.cards, state.squad, division)
      : { squad: state.squad, subs: [] }
    const rating = evaluateSquad(state.cards, auto.squad, division)
    const gaps = missingSlots(rating.evaluations)
    if (gaps.empty.length || gaps.injured.length || gaps.duplicated.length) {
      setNotice('내 선발 명단이 준비되지 않았습니다 — 스쿼드 탭에서 확인해 주세요.')
      return
    }

    setChallenging(true)
    setNotice(null)
    const outcome = await playPvpMatchOnServer({
      opponentUserId: opponent.userId,
      squad: auto.squad,
      tactic: state.tactic,
      phased: planForMode(state.plan, tacticsMode),
    })
    setChallenging(false)

    if (!outcome.ok) {
      setNotice(PVP_MATCH_FAILURE_MESSAGE[outcome.reason])
      return
    }

    playPvpMatch(outcome.result, { squad: auto.squad, subs: auto.subs })
    setLastResult({ result: outcome.result, opponentClubName: outcome.opponentClubName })
  }

  if (!pvpMatchAvailable()) {
    return (
      <section className="border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-400">
        데일리 PvP는 로그인한 계정에서만 이용할 수 있습니다.
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="border border-white/10 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white">데일리 PvP</h2>
            <p className="mt-1 text-xs text-slate-400">
              실제 유저를 검색해 지금 라인업 그대로 즉시 붙습니다. 도전한 쪽만 하루 한도를 씁니다.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-emerald-300">
            오늘 남은 도전 {left}회
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-slate-900/70 p-4">
        <label className="block">
          <span className="sr-only">상대 클럽명 검색</span>
          <input
            value={query}
            onChange={(event) => void runSearch(event.target.value)}
            placeholder="상대 클럽명으로 찾기"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
          />
        </label>

        {searching && <p className="mt-3 text-xs text-slate-500">찾는 중...</p>}
        {!searching && query.trim() && results.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">일치하는 클럽이 없습니다.</p>
        )}
        {results.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {results.map((row) => (
              <button
                key={row.userId}
                onClick={() => void openOpponent(row.userId)}
                className="flex items-center justify-between border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:border-emerald-400/60 hover:bg-white/10"
              >
                <span className="truncate">{row.clubName}</span>
                {row.division != null && (
                  <span className="ml-2 shrink-0 text-xs text-slate-500">{divisionLabel(row.division)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {notice && (
        <div className="border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</div>
      )}

      {loadingOpponent && <p className="text-sm text-slate-500">상대 라인업을 불러오는 중...</p>}

      {opponent && (
        <section className="border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white">{opponent.clubName}</h3>
              <p className="text-xs text-slate-500">
                {opponent.division != null ? divisionLabel(opponent.division) : '리그 미상'} · {opponent.formation}
              </p>
            </div>
            <button
              onClick={() => void challenge()}
              disabled={challenging || left <= 0}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {challenging ? '경기 중...' : '도전'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {opponent.lineup
              .filter(isPublicSquadMember)
              .filter((member) => member.role === 'starter')
              .flatMap((member) => {
                const player = getPlayer(member.playerId)
                if (!player) return []
                return (
                  <div key={`${member.role}-${member.slot}`} className="flex justify-center">
                    <PlayerCard player={player} level={member.level} size="sm" />
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {lastResult && (
        <section className="border border-emerald-400/30 bg-emerald-500/10 p-4">
          <h3 className="text-base font-black text-white">
            {lastResult.result.result === 'W' ? '승리' : lastResult.result.result === 'D' ? '무승부' : '패배'} ·{' '}
            {lastResult.result.scoreFor} : {lastResult.result.scoreAgainst}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {lastResult.opponentClubName}과의 경기 · 보상 {lastResult.result.reward.toLocaleString('ko-KR')}G
          </p>
        </section>
      )}
    </div>
  )
}
