'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ModeBadge from '../ModeBadge'
import { tune } from '../../lib/tuning'
import { applyAutoSubs, type SubEvent } from '../../lib/autoSub'
import { isInjured, isSidelined } from '../../lib/condition'
import { CUP_ROUND_LABELS, cupTeamOf, myTie, tiesOfRound, type CupTie } from '../../lib/cup'
import { MINI_GAME_LIMIT, casualMatchesLeft, casualModeLocked, miniGamesLeft } from '../../lib/daily'
import type { LeagueTeam } from '../../lib/league'
import {
  MY_TEAM_ID,
  PROMOTION_RANK,
  RELEGATION_RANK,
  ROUNDS_PER_SEASON,
  divisionLabel,
  fixturesOfRound,
  friendlyOpponent,
  myFixture,
  seasonOutcome,
  simulateAiMatch,
  standings,
  teamOf,
} from '../../lib/league'
import {
  ONLINE_MATCH_FAILURE_MESSAGE,
  onlineMatchAvailable,
  playMatchOnServer,
} from '../../lib/onlineMatch'
import { hashString, seededRandom } from '../../lib/random'
import { SEASON_SCHEDULE, TOTAL_MATCHDAYS } from '../../lib/schedule'
import { averageRating, seasonLeaders, type SeasonPlayerStat } from '../../lib/seasonStats'
import { evaluateSquad, missingSlots } from '../../lib/squad'
import type { MatchResult, Squad } from '../../lib/types'
import { MINI_GAME_REWARD, matchReward, matchSeed, simulateMatch } from '../../lib/match'
import {
  averageStamina,
  shapeFromSquad,
  tacticalStates,
  toResult,
  type LiveMatchState,
  type MatchSetup,
} from '../../lib/matchEngine'
import { buildReport } from '../../lib/tactics/report'
import { planForMode } from '../../lib/tactics/mode'
import { useTacticsMode } from '../TacticsMode'
import { getPlayer } from '../../lib/players'
import type { SlotEvaluation } from '../../lib/squad'
import {
  LINES,
  PLANS,
  PRESSINGS,
  TACTIC_HOTKEYS,
  TACTIC_PRESETS,
  TEMPOS,
  presetOf,
  tacticSummary,
  type TacticSetup,
} from '../../lib/tactics'
import type { Card } from '../../lib/types'
import PitchView from '../PitchView'
import { useGame, type RoundResult } from '../GameProvider'
import { TICK_SPEEDS, useLiveEngine } from '../useLiveEngine'

interface PendingSub {
  slotId: string
  outUid: string
  inUid: string
}

/** Swaps a bench player into a slot, returning the new squad and who came off. */
function applySub(squad: Squad, slotId: string, inUid: string): { squad: Squad; outUid: string } | null {
  const outUid = squad.slots[slotId]
  const benchIndex = squad.bench.indexOf(inUid)
  if (!outUid || benchIndex < 0) return null
  const bench = [...squad.bench]
  bench[benchIndex] = outUid
  return { squad: { ...squad, slots: { ...squad.slots, [slotId]: inUid }, bench }, outUid }
}

function subEvent(
  slotId: string,
  outUid: string,
  inUid: string,
  nameOf: (uid: string) => string,
): SubEvent {
  return {
    slotId,
    outUid,
    inUid,
    outName: nameOf(outUid),
    inName: nameOf(inUid),
    reason: 'manual',
  }
}

export default function MatchTab() {
  const { state } = useGame()
  const [side, setSide] = useState<'table' | 'cup'>('table')

  return (
    <div className="space-y-4">
      <ModeBadge mode="casual" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel p-5">
          {state.season.finished ? <SeasonEnd /> : <MatchDay />}
        </section>

      <div className="space-y-4">
        <MiniGamePanel />
        <Schedule />
        <div className="flex gap-2">
          {(['table', 'cup'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSide(key)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                side === key
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {key === 'table' ? '리그 순위' : 'FA컵 대진'}
            </button>
          ))}
        </div>
        {side === 'table' ? (
          <>
            <LeagueTable />
            <SeasonLeaders />
          </>
        ) : (
          <CupBracket />
        )}
        <ClubForm />
      </div>
      </div>
    </div>
  )
}

function MatchDay() {
  const { state, finishMatch, finishCupMatch, skipMatchday, setTactic } = useGame()
  const { mode: tacticsMode } = useTacticsMode()
  const day = SEASON_SCHEDULE[state.matchday] ?? null
  const division = state.season.division

  const [mode, setMode] = useState<'watch' | 'text'>('watch')
  const [liveSquad, setLiveSquad] = useState<Squad | null>(null)
  const [subs, setSubs] = useState<SubEvent[]>([])
  const [others, setOthers] = useState<RoundResult[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [showSubs, setShowSubs] = useState(false)
  // Orders can be given at any time; they only take effect at the next stoppage.
  const [pendingTactic, setPendingTactic] = useState<TacticSetup | null>(null)
  const [pendingSubs, setPendingSubs] = useState<PendingSub[]>([])
  // Set once the server has already decided this match's outcome. While it
  // is set, the live engine only replays that outcome (same seed, same
  // setup) rather than deciding anything — see start() and the comment on
  // useLiveEngine's rng parameter.
  const [serverMatch, setServerMatch] = useState<MatchResult | null>(null)
  const [startingOnline, setStartingOnline] = useState(false)
  // The fixture moves on the moment a match is recorded, so remember who we played.
  const [playedOpponent, setPlayedOpponent] = useState<LeagueTeam | null>(null)

  const fixture = useMemo(() => myFixture(state.season), [state.season])
  const tie = useMemo(() => myTie(state.cup), [state.cup])
  const isCupDay = day?.kind === 'cup'
  const cupOver = state.cup.eliminated || Boolean(state.cup.champion)

  const isHome = isCupDay ? false : fixture?.home === MY_TEAM_ID
  const opponent = isCupDay
    ? tie
      ? cupTeamOf(state.cup, tie.home === MY_TEAM_ID ? tie.away : tie.home)
      : null
    : fixture
      ? teamOf(state.season, isHome ? fixture.away : fixture.home)
      : null

  const squadInPlay = liveSquad ?? state.squad
  const rating = useMemo(
    () => evaluateSquad(state.cards, squadInPlay, division),
    [state.cards, squadInPlay, division],
  )

  // What the squad will look like once the queued substitutions go through —
  // the substitution panel works off this so orders stack sensibly.
  const plannedSquad = useMemo(
    () => pendingSubs.reduce((squad, item) => applySub(squad, item.slotId, item.inUid)?.squad ?? squad, squadInPlay),
    [pendingSubs, squadInPlay],
  )
  const plannedRating = useMemo(
    () => (pendingSubs.length ? evaluateSquad(state.cards, plannedSquad, division) : rating),
    [pendingSubs.length, state.cards, plannedSquad, division, rating],
  )
  const shownTactic = pendingTactic ?? state.tactic
  const pendingCount = (pendingTactic ? 1 : 0) + pendingSubs.length

  // What the eleven looks like once auto substitution has had its say — the
  // lineup that would actually take the field.
  const readiness = useMemo(() => {
    const auto = state.autoSub
      ? applyAutoSubs(state.cards, state.squad, division)
      : { squad: state.squad, subs: [] }
    const projected = evaluateSquad(state.cards, auto.squad, division)
    return { ...missingSlots(projected.evaluations), overCap: projected.overCap }
  }, [state.cards, state.squad, state.autoSub, division])
  const lineupReady =
    readiness.empty.length === 0 && readiness.injured.length === 0 && readiness.duplicated.length === 0
  const casualLeft = casualMatchesLeft(state.daily)
  const casualLocked = casualModeLocked(state.daily)

  const setup: MatchSetup | null = opponent
    ? {
        team: rating,
        teamName: state.club,
        opponent,
        division,
        venue: isCupDay ? 'neutral' : isHome ? 'home' : 'away',
        tactic: state.tactic,
        phased: planForMode(state.plan, tacticsMode),
        traits: rating.traits,
        homeShape:
          mode === 'watch'
            ? shapeFromSquad(squadInPlay.formation, rating.evaluations)
            : undefined,
      }
    : null

  // Built once per match, not on every render: a PRNG carries its position in
  // the sequence in its own closure, so recreating it every tick (as building
  // it inline on the useLiveEngine call would) rewinds it back to the start
  // every time — the same "random" draws land in the same order minute after
  // minute, and the match reads as if nothing but one shot ever happens.
  const seededRng = useMemo(
    () => (serverMatch ? seededRandom(hashString(serverMatch.seed)) : null),
    // Keyed on the seed itself, not the serverMatch object: only a new seed
    // should rewind the sequence, and serverMatch never changes seed in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverMatch?.seed],
  )

  const engine = useLiveEngine(
    setup,
    (final) => {
      if (!setup) return
      const lineup = { squad: squadInPlay, subs }
      if (serverMatch) {
        // The server already decided this one; the ticking the manager just
        // watched was a same-seed replay of it, not a second opinion. Use
        // its numbers, not a freshly derived local result.
        if (isCupDay) finishCupMatch(serverMatch, rating.overall, lineup)
        else if (fixture) finishMatch(serverMatch, fixture, others, lineup)
        return
      }
      // No account configured — nothing server-side to defer to, so this
      // browser is both the only player and the only judge.
      const base = toResult(final, setup, { seed: matchSeed() })
      const result = { ...base, reward: matchReward(base.result, division, base.scoreFor) }
      if (isCupDay) finishCupMatch(result, rating.overall, lineup)
      else if (fixture) finishMatch(result, fixture, others, lineup)
    },
    seededRng ?? Math.random,
  )

  // Only a new season clears the board; the finished match stays on screen
  // until the manager moves on to the next matchday.
  useEffect(() => {
    engine.reset()
    setLiveSquad(null)
    setSubs([])
    setOthers([])
    setNotice(null)
    setShowSubs(false)
    setPendingTactic(null)
    setPendingSubs([])
    setPlayedOpponent(null)
    setServerMatch(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.season.index])

  // Hotkeys: give tactical orders at any time — they land at the next stoppage.
  const onKeyRef = useRef<(event: KeyboardEvent) => void>(() => {})
  onKeyRef.current = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) return
    if (event.code === 'Space') {
      event.preventDefault()
      engine.togglePause()
      return
    }
    const hotkey = TACTIC_HOTKEYS.find(
      (item) => item.key.toLowerCase() === event.key.toLowerCase(),
    )
    if (!hotkey) return
    orderTactic({ ...shownTactic, [hotkey.field]: hotkey.value }, hotkey.label)
  }

  useEffect(() => {
    if (!engine.running) return
    const onKey = (event: KeyboardEvent) => onKeyRef.current(event)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine.running])

  // On a phone the substitution panel sits above the fold, so bring it into view.
  const subPanelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (showSubs) subPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [showSubs])

  const nameOf = (uid: string) => {
    const card = state.cards.find((item) => item.uid === uid)
    return (card && getPlayer(card.playerId)?.name) ?? '선수'
  }

  // Orders are always accepted; only the moment they take effect is restricted.
  // Mid-match, that is — picking a tactic before kickoff (engine not running
  // yet) always applies right away, server-backed match or not.
  const orderTactic = (next: TacticSetup, label: string) => {
    if (engine.running && serverMatch) {
      setNotice('서버가 이미 판정한 경기입니다 — 다음 경기부터 새 전술이 적용됩니다.')
      return
    }
    if (!engine.running || engine.canIntervene) {
      setPendingTactic(null)
      setTactic(next)
      setNotice(`전술 변경 — ${label}`)
      return
    }
    setPendingTactic(next)
    setNotice(`전술 지시 — ${label} · 경기가 멈추면 적용됩니다`)
  }

  // A match allows only so many changes, and an order already queued has spent
  // one — otherwise the manager could line up more than the rules permit.
  const subsUsed = subs.length + pendingSubs.length
  const subsLeft = Math.max(0, tune('subLimit') - subsUsed)

  const orderSub = (slotId: string, inUid: string) => {
    if (serverMatch) {
      setNotice('서버가 이미 판정한 경기입니다 — 지금은 교체할 수 없습니다.')
      return
    }
    const outUid = plannedSquad.slots[slotId]
    if (!outUid || !plannedSquad.bench.includes(inUid)) return
    if (subsLeft <= 0) {
      setNotice(`교체 인원을 모두 썼습니다 (${tune('subLimit')}명).`)
      return
    }
    setShowSubs(false)

    if (engine.canIntervene) {
      const applied = applySub(squadInPlay, slotId, inUid)
      if (!applied) return
      setLiveSquad(applied.squad)
      setSubs((current) => [...current, subEvent(slotId, applied.outUid, inUid, nameOf)])
      setNotice(`교체 — ${nameOf(applied.outUid)} → ${nameOf(inUid)}`)
      return
    }

    setPendingSubs((current) => [...current, { slotId, outUid, inUid }])
    setNotice(`교체 지시 — ${nameOf(outUid)} → ${nameOf(inUid)} · 경기가 멈추면 투입됩니다`)
  }

  // Live legs: the engine's stamina if the match is running, else the stored
  // condition. Substitutes come on with whatever they had in the tank.
  const conditionOf = (card: Card) => engine.state?.stamina[card.uid] ?? card.condition

  const orderTiredSubs = () => {
    if (serverMatch) {
      setNotice('서버가 이미 판정한 경기입니다 — 지금은 교체할 수 없습니다.')
      return
    }
    if (subsLeft <= 0) {
      setNotice(`교체 인원을 모두 썼습니다 (${tune('subLimit')}명).`)
      return
    }
    const auto = applyAutoSubs(state.cards, plannedSquad, division, conditionOf, tune('liveTired'), subsLeft)
    if (auto.subs.length === 0) {
      setNotice('지금 빼야 할 만큼 지친 선수가 없습니다.')
      return
    }
    setShowSubs(false)

    if (engine.canIntervene) {
      const applied = applyAutoSubs(state.cards, squadInPlay, division, conditionOf, tune('liveTired'), subsLeft)
      setLiveSquad(applied.squad)
      setSubs((current) => [...current, ...applied.subs])
      setNotice(`지친 선수 ${applied.subs.length}명 교체 — ${applied.subs.map((sub) => `${sub.outName} → ${sub.inName}`).join(', ')}`)
      return
    }

    setPendingSubs((current) => [
      ...current,
      ...auto.subs.map((sub) => ({ slotId: sub.slotId, outUid: sub.outUid, inUid: sub.inUid })),
    ])
    setNotice(`지친 선수 ${auto.subs.length}명 교체 지시 · 경기가 멈추면 투입됩니다`)
  }

  // Legs go during a match, not only before it. When automatic substitution is
  // on, a starter who drops below the tired mark is queued the same way an
  // order from the manager is — nothing changes mid-move, it goes in at the
  // next stoppage. Reading from plannedSquad means a player already queued to
  // come off is not queued again.
  useEffect(() => {
    if (serverMatch) return
    if (!state.autoSub || !engine.state || engine.state.finished) return
    if (engine.state.phase === 'kickoff') return

    if (subsLeft <= 0) return
    const auto = applyAutoSubs(state.cards, plannedSquad, division, conditionOf, tune('liveTired'), subsLeft)
    if (auto.subs.length === 0) return

    setPendingSubs((current) => [
      ...current,
      ...auto.subs.map((sub) => ({ slotId: sub.slotId, outUid: sub.outUid, inUid: sub.inUid })),
    ])
    setNotice(
      `자동 교체 — ${auto.subs.map((sub) => `${sub.outName} → ${sub.inName}`).join(', ')} · 경기가 멈추면 투입됩니다`,
    )
    // Runs as the clock moves; everything else it reads is derived from state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.state?.minute, state.autoSub, subsLeft])

  // The whistle goes: everything the manager queued up goes in now.
  useEffect(() => {
    if (!engine.canIntervene) return
    if (!pendingTactic && pendingSubs.length === 0) return

    if (pendingTactic) {
      setTactic(pendingTactic)
      setPendingTactic(null)
    }
    if (pendingSubs.length) {
      let squad = squadInPlay
      const applied: SubEvent[] = []
      for (const item of pendingSubs) {
        const result = applySub(squad, item.slotId, item.inUid)
        if (!result) continue
        squad = result.squad
        applied.push(subEvent(item.slotId, result.outUid, item.inUid, nameOf))
      }
      if (applied.length) {
        setLiveSquad(squad)
        setSubs((current) => [...current, ...applied])
      }
      setPendingSubs([])
    }
    setNotice('휘슬 — 대기 중이던 지시를 적용했습니다.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.canIntervene, pendingTactic, pendingSubs])

  if (!day) {
    return <p className="py-10 text-center text-sm text-slate-500">시즌 일정이 끝났습니다.</p>
  }

  if (isCupDay && cupOver) {
    const champion = state.cup.champion ? cupTeamOf(state.cup, state.cup.champion) : null
    return (
      <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {state.matchday + 1}번째 경기일 · FA컵
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          {state.cup.champion === MY_TEAM_ID ? '컵 우승 🏆' : '컵 탈락'}
        </div>
        <p className="mt-2 text-sm text-slate-400">
          {state.cup.champion === MY_TEAM_ID
            ? '트로피를 들어올렸습니다.'
            : `우승팀: ${champion?.name ?? '진행 중'}`}
        </p>
        <button
          onClick={skipMatchday}
          className="mt-5 rounded-xl bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
        >
          이 경기일 건너뛰기
        </button>
      </div>
    )
  }

  const start = async () => {
    if (!opponent || engine.running || startingOnline) return
    if (casualLocked) {
      setNotice(
        state.daily.seasonEndedToday
          ? '오늘 시즌을 이미 끝냈습니다 — 다음 시즌은 내일부터 진행할 수 있습니다.'
          : '오늘 캐주얼 모드 경기를 다 썼습니다 — 내일 다시 진행할 수 있습니다.',
      )
      return
    }
    if (!lineupReady) {
      const parts = [
        readiness.empty.length ? `빈 자리 ${readiness.empty.join(' · ')}` : '',
        readiness.injured.length ? `부상 ${readiness.injured.join(' · ')}` : '',
        readiness.duplicated.length ? `같은 선수 중복 ${readiness.duplicated.join(' · ')}` : '',
      ].filter(Boolean)
      setNotice(`선발 11명을 채워야 경기를 시작할 수 있습니다 — ${parts.join(', ')}`)
      return
    }
    if (rating.overCap) {
      setNotice(
        `선발 레벨 합계가 ${rating.levelTotal}로 상한 ${rating.levelCap}을 넘었습니다. 스쿼드를 조정하세요.`,
      )
      return
    }

    const auto = state.autoSub
      ? applyAutoSubs(state.cards, state.squad, division)
      : { squad: state.squad, subs: [] }
    const venue = isCupDay ? 'neutral' : isHome ? 'home' : 'away'

    // Server-authoritative when there is an account to protect: the result
    // is decided before a single tick runs locally, and the live view below
    // only replays it. See SECURITY_ARCHITECTURE.md 3단계 and lib/onlineMatch.ts.
    if (onlineMatchAvailable()) {
      setNotice(null)
      setStartingOnline(true)
      const outcome = await playMatchOnServer({
        competition: isCupDay ? 'cup' : 'league',
        squad: auto.squad,
        tactic: state.tactic,
        phased: planForMode(state.plan, tacticsMode),
        opponent: { name: opponent.name, rating: opponent.rating },
        venue,
      })
      setStartingOnline(false)
      if (!outcome.ok) {
        const parts = [
          outcome.empty?.length ? `빈 자리 ${outcome.empty.join(' · ')}` : '',
          outcome.injured?.length ? `부상 ${outcome.injured.join(' · ')}` : '',
        ].filter(Boolean)
        setNotice(
          parts.length
            ? `${ONLINE_MATCH_FAILURE_MESSAGE[outcome.reason]} (${parts.join(', ')})`
            : ONLINE_MATCH_FAILURE_MESSAGE[outcome.reason],
        )
        return
      }
      setServerMatch(outcome.result)
    } else {
      setNotice(null)
      setServerMatch(null)
    }

    setPlayedOpponent(opponent)
    setLiveSquad(auto.squad)
    setSubs(auto.subs)

    setOthers(
      isCupDay
        ? []
        : fixturesOfRound(state.season, state.season.round)
            .filter((item) => item !== fixture)
            .map((item) => {
              const [homeGoals, awayGoals] = simulateAiMatch(
                teamOf(state.season, item.home),
                teamOf(state.season, item.away),
              )
              return { home: item.home, away: item.away, homeGoals, awayGoals }
            }),
    )

    // The engine reads the setup fresh each tick, so it picks up the new
    // squad — and, when serverMatch was just set above, the next render's
    // seeded rng too (useLiveEngine reads rngRef.current on every tick).
    window.setTimeout(() => engine.start(), 0)
  }

  const live = engine.state
  const squadStamina = live ? averageStamina(live, rating.evaluations) : 100
  const injured = state.cards.filter(isInjured).length
  const tired = state.cards.filter(
    (card) => !isSidelined(card) && card.condition < tune('tiredCondition'),
  ).length
  const events = live ? [...live.events].reverse() : []

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div
            className={`text-xs font-bold uppercase tracking-widest ${
              isCupDay ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {state.matchday + 1} / {TOTAL_MATCHDAYS} 경기일 ·{' '}
            {isCupDay ? `FA컵 ${CUP_ROUND_LABELS[state.cup.round]}` : divisionLabel(division)}
          </div>
          <h2 className="text-lg font-bold text-white">
            {engine.finished
              ? '경기 종료 — 결과를 확인하고 다음 경기일로 넘어가세요'
              : isCupDay
                ? `FA컵 ${CUP_ROUND_LABELS[state.cup.round]}`
                : `리그 ${state.season.round + 1} / ${ROUNDS_PER_SEASON} 라운드`}
          </h2>
        </div>
        <div className="flex gap-1.5">
          {(['watch', 'text'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                mode === key
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {key === 'watch' ? '관전 모드' : '텍스트 모드'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/70 p-4">
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold text-white">{state.club}</div>
          <div className="text-xs text-slate-400">
            전력 {rating.overall} · {isCupDay ? '중립' : isHome ? '홈' : '원정'}
          </div>
          {live && !engine.finished && (
            <div className={`text-[11px] font-bold ${squadStamina < tune('liveTired') ? 'text-amber-300' : 'text-slate-500'}`}>
              평균 체력 {Math.round(squadStamina)}
            </div>
          )}
        </div>
        <div className="shrink-0 text-center">
          <div className="text-3xl font-black text-white">
            {live ? `${live.scoreFor} : ${live.scoreAgainst}` : '- : -'}
          </div>
          <div className="text-xs font-semibold text-emerald-300">
            {live ? `${live.minute}분` : '킥오프 대기'}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold text-white">
            {(engine.finished ? playedOpponent : opponent)?.name ?? '상대 미정'}
          </div>
          <div className="text-xs text-slate-400">
            전력 {(engine.finished ? playedOpponent : opponent)?.rating ?? '-'}
          </div>
        </div>
      </div>

      {mode === 'watch' && live && (
        <div className="mx-auto mt-4 w-full max-w-sm">
          <PitchView
            state={live}
            homeName={state.club}
            awayName={(engine.finished ? playedOpponent : opponent)?.name ?? '상대'}
          />
        </div>
      )}

      {engine.running && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2">
          <button
            onClick={engine.togglePause}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
          >
            {engine.paused ? '재개 (Space)' : '일시정지 (Space)'}
          </button>
          {TICK_SPEEDS.map((item, index) => (
            <button
              key={item.label}
              onClick={() => engine.setSpeed(index)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                engine.speed === index
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => engine.setAutoPause(!engine.autoPause)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
              engine.autoPause
                ? 'bg-amber-400/20 text-amber-200'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title="파울 · 골 · 아웃 · 하프타임에 자동으로 시계를 멈춥니다"
          >
            중단 시 자동 정지 {engine.autoPause ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={orderTiredSubs}
            className="ml-auto hidden whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 sm:block"
            title="체력이 떨어진 선발을 벤치 최적 선수와 바꿉니다"
          >
            지친 선수 교체
          </button>
          <button
            onClick={() => setShowSubs((value) => !value)}
            className={`hidden whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition sm:block ${
              engine.canIntervene
                ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            선수 교체{engine.canIntervene ? '' : ' 지시'}
          </button>
        </div>
      )}

      {engine.running && (
        <InMatchTactics
          tactic={shownTactic}
          live={engine.canIntervene}
          queued={Boolean(pendingTactic)}
          onChange={(next, label) => orderTactic(next, label)}
        />
      )}

      <div ref={subPanelRef} />
      {showSubs && engine.running && (
        <SubPanel
          squad={plannedSquad}
          cards={state.cards}
          evaluations={plannedRating.evaluations}
          conditionOf={conditionOf}
          immediate={engine.canIntervene}
          onSubstitute={orderSub}
          onClose={() => setShowSubs(false)}
        />
      )}

      {engine.running && (pendingTactic || pendingSubs.length > 0) && (
        <div className="mt-2 rounded-xl bg-amber-400/10 p-3 ring-1 ring-amber-400/30">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-200">
              대기 중인 지시 · 다음 중단에 적용
            </span>
            <button
              onClick={() => {
                setPendingTactic(null)
                setPendingSubs([])
                setNotice('대기 중인 지시를 취소했습니다.')
              }}
              className="shrink-0 whitespace-nowrap text-[11px] font-bold text-slate-400 active:text-slate-200 sm:hover:text-slate-200"
            >
              전체 취소
            </button>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-200">
            {pendingTactic && <li>· 전술 {tacticSummary(pendingTactic)}</li>}
            {pendingSubs.map((item, index) => (
              <li key={`${item.slotId}-${item.inUid}-${index}`}>
                · 교체 {nameOf(item.outUid)} → {nameOf(item.inUid)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice && (
        <p className="mt-2 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200">
          {notice}
        </p>
      )}

      {/* Phone controls: everything you need mid match, within thumb reach. */}
      {engine.running && (
        <>
          <div className="h-36 sm:hidden" />
          <div
            data-testid="mobile-bar"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden"
          >
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-bold">
              <span className={engine.canIntervene ? 'text-amber-300' : 'text-slate-500'}>
                {engine.canIntervene ? '경기 중단 — 지금 바로 적용' : '지시하면 중단될 때 적용'}
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-slate-900">
                  대기 {pendingCount}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TACTIC_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => orderTactic(preset.setup, preset.label)}
                  className={`min-h-[44px] rounded-xl text-xs font-black transition ${
                    presetOf(shownTactic) === preset.key
                      ? pendingTactic
                        ? 'bg-amber-300 text-slate-900'
                        : 'btn-primary'
                      : 'bg-white/10 text-slate-200 active:bg-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <button
                onClick={orderTiredSubs}
                className="min-h-[44px] flex-1 whitespace-nowrap rounded-xl bg-sky-400 text-xs font-black text-slate-900 active:bg-sky-300"
              >
                지친 선수 교체
              </button>
              <button
                onClick={() => setShowSubs((value) => !value)}
                className="min-h-[44px] flex-1 whitespace-nowrap rounded-xl bg-amber-400 text-xs font-black text-slate-900 active:bg-amber-300"
              >
                직접 교체
              </button>
              <button
                onClick={engine.togglePause}
                className="min-h-[44px] w-20 whitespace-nowrap rounded-xl bg-white/10 text-xs font-bold text-white active:bg-white/20"
              >
                {engine.paused ? '재개' : '정지'}
              </button>
            </div>
          </div>
        </>
      )}

      {!engine.running && (
        <button
          onClick={() => {
            if (engine.finished) {
              // Clear the finished match and line the next one up.
              engine.reset()
              setLiveSquad(null)
              setSubs([])
              setOthers([])
              setPlayedOpponent(null)
              setNotice(null)
              setServerMatch(null)
              return
            }
            void start()
          }}
          disabled={
            (!opponent && !engine.finished) ||
            (!engine.finished && !lineupReady) ||
            (!engine.finished && casualLocked) ||
            startingOnline
          }
          className={`mt-4 w-full rounded-xl px-4 py-3 font-bold text-slate-900 transition disabled:opacity-40 ${
            isCupDay ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
          }`}
        >
          {startingOnline ? '서버 판정 확인 중...' : engine.finished ? '다음 경기일로' : '경기 시작'}
        </button>
      )}

      {!lineupReady && !engine.finished && (
        <p className="mt-2 text-xs font-semibold text-rose-400">
          선발 11명이 채워지지 않았습니다 —{' '}
          {readiness.empty.length > 0 && `빈 자리 ${readiness.empty.join(' · ')}`}
          {readiness.empty.length > 0 && (readiness.injured.length > 0 || readiness.duplicated.length > 0) && ', '}
          {readiness.injured.length > 0 && `부상 ${readiness.injured.join(' · ')}`}
          {readiness.injured.length > 0 && readiness.duplicated.length > 0 && ', '}
          {readiness.duplicated.length > 0 && `같은 선수 중복 ${readiness.duplicated.join(' · ')}`}. 스쿼드
          탭에서 채운 뒤 경기를 시작하세요.
        </p>
      )}
      {rating.overCap && (
        <p className="mt-2 text-xs font-semibold text-rose-400">
          선발 레벨 합계 {rating.levelTotal} / 상한 {rating.levelCap} — 라인업을 등록할 수 없습니다.
        </p>
      )}
      {!engine.finished && lineupReady && casualLocked && (
        <p className="mt-2 text-xs font-semibold text-rose-400">
          {state.daily.seasonEndedToday
            ? '오늘 시즌을 이미 끝냈습니다 — 다음 시즌은 내일부터 진행할 수 있습니다.'
            : '오늘 캐주얼 모드 경기를 다 썼습니다 — 내일 다시 진행할 수 있습니다.'}
        </p>
      )}
      {!engine.finished && !casualLocked && casualLeft <= 5 && (
        <p className="mt-2 text-[11px] text-amber-400">오늘 남은 캐주얼 모드 경기 {casualLeft}판</p>
      )}
      {(injured > 0 || tired > 0) && !engine.running && (
        <p className="mt-2 text-xs font-semibold text-amber-400">
          부상 {injured}명 · 체력 저하 {tired}명
          {state.autoSub && ' — 자동 교체가 벤치에서 대체 선수를 투입합니다.'}
        </p>
      )}

      {subs.length > 0 && (
        <div className="mt-4 rounded-xl bg-sky-500/10 p-3">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-sky-300">교체 기록</h3>
          {subs.map((sub, index) => (
            <div key={`${sub.slotId}-${index}`} className="text-xs text-slate-300">
              {sub.outName} → <span className="font-bold text-white">{sub.inName}</span>{' '}
              <span className="text-slate-500">
                (
                {sub.reason === 'injury' ? '부상' : sub.reason === 'fatigue' ? '체력 저하' : '감독 교체'}
                )
              </span>
            </div>
          ))}
        </div>
      )}

      {engine.finished && live && <TacticalReport state={live} setup={setup} />}

      {engine.finished && <MatchRatings />}

      <div className="scrollbar-thin mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            경기를 시작하면 중계가 표시됩니다.
          </p>
        )}
        {events.map((event, index) => (
          <div
            key={`${event.minute}-${index}`}
            className={`rise-in flex gap-3 rounded-lg px-3 py-2 text-sm ${
              event.type !== 'goal'
                ? 'bg-white/5 text-slate-300'
                : event.side === 'home'
                  ? 'bg-emerald-500/10 font-bold text-emerald-200'
                  : 'bg-rose-500/10 font-bold text-rose-200'
            }`}
          >
            <span className="w-10 shrink-0 text-xs font-bold text-slate-500">
              {event.minute}분
            </span>
            <span className="min-w-0 flex-1">{event.text}</span>
          </div>
        ))}
      </div>

      {engine.finished && others.length > 0 && (
        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            같은 라운드 다른 경기
          </h3>
          <div className="grid gap-1 sm:grid-cols-2">
            {others.map((item, index) => (
              <div key={index} className="text-xs text-slate-300">
                {teamOf(state.season, item.home).name}{' '}
                <span className="font-bold text-white">
                  {item.homeGoals}:{item.awayGoals}
                </span>{' '}
                {teamOf(state.season, item.away).name}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function InMatchTactics({
  tactic,
  live,
  queued,
  onChange,
}: {
  tactic: TacticSetup
  /** True while play is halted, so a change lands immediately. */
  live: boolean
  queued: boolean
  onChange: (next: TacticSetup, label: string) => void
}) {
  // The dials are fine tuning; presets are what a thumb reaches for.
  const [showDials, setShowDials] = useState(false)
  const groups = [
    { field: 'plan' as const, options: PLANS },
    { field: 'pressing' as const, options: PRESSINGS },
    { field: 'line' as const, options: LINES },
    { field: 'tempo' as const, options: TEMPOS },
  ]
  const active = presetOf(tactic)

  return (
    <div
      className={`mt-3 rounded-xl p-3 transition ${
        live ? 'bg-amber-400/10 ring-1 ring-amber-400/40' : 'bg-white/5'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">
          경기 중 전술{' '}
          {live ? '— 지금 바로 적용됩니다' : queued ? '— 지시 대기 중' : '— 언제든 지시, 중단 시 적용'}
        </span>
        <span className="truncate text-[10px] text-slate-500">{tacticSummary(tactic)}</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {TACTIC_PRESETS.map((preset) => (
          <button
            key={preset.key}
            data-testid="tactic-preset"
            onClick={() => onChange(preset.setup, preset.label)}
            title={preset.hint}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-xs font-black transition ${
              active === preset.key
                ? queued
                  ? 'bg-amber-300 text-slate-900'
                  : 'btn-primary'
                : 'bg-white/10 text-slate-200 active:bg-white/20 sm:hover:bg-white/20'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowDials((value) => !value)}
        className="mt-2 w-full rounded-lg bg-white/5 py-2 text-[11px] font-bold text-slate-400 active:bg-white/10 sm:hover:bg-white/10"
      >
        세부 조정 {showDials ? '닫기' : '열기'} · 플랜 · 압박 · 라인 · 템포
      </button>

      {showDials && (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {groups.map(({ field, options }) => (
            <div key={field} className="flex gap-1">
              {options.map((option) => (
                <button
                  key={option.key}
                  onClick={() => onChange({ ...tactic, [field]: option.key }, option.label)}
                  title={option.description}
                  className={`min-h-[40px] flex-1 rounded-lg px-1 py-1 text-[10px] font-bold transition ${
                    tactic[field] === option.key
                      ? queued
                        ? 'bg-amber-300 text-slate-900'
                        : 'btn-primary'
                      : 'bg-white/10 text-slate-300 active:bg-white/20 sm:hover:bg-white/20'
                  }`}
                >
                  {option.label.replace(/^(압박|수비 라인|템포) /, '')}
                  {/* Shortcuts are a desktop convenience; phones never see them. */}
                  <span className="ml-0.5 hidden opacity-60 sm:inline">{option.hotkey}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Amber once a player is worth pulling off. */
function tiredClass(condition: number): string {
  return condition < tune('liveTired') ? 'text-amber-300' : 'text-slate-400'
}

function SubPanel({
  squad,
  cards,
  evaluations,
  conditionOf,
  immediate,
  onSubstitute,
  onClose,
}: {
  squad: Squad
  cards: Card[]
  evaluations: SlotEvaluation[]
  /** Live match stamina, so the numbers match what the pitch shows. */
  conditionOf: (card: Card) => number
  /** True while play is halted — the change goes in at once instead of queuing. */
  immediate: boolean
  onSubstitute: (slotId: string, inUid: string) => void
  onClose: () => void
}) {
  const [slotId, setSlotId] = useState<string | null>(null)
  const benchCards = squad.bench
    .filter(Boolean)
    .map((uid) => cards.find((card) => card.uid === uid))
    .filter((card): card is Card => Boolean(card) && !isSidelined(card!))

  return (
    <div className="mt-3 rounded-xl bg-slate-950/70 p-3" data-testid="sub-panel">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">
          {slotId ? '투입할 벤치 선수를 고르세요' : '빼낼 선발을 고르세요'}
          <span className="ml-1 font-semibold text-slate-500">
            {immediate ? '(지금 투입)' : '(중단 시 투입)'}
          </span>
        </span>
        <button onClick={onClose} className="text-[11px] font-bold text-slate-500 hover:text-slate-300">
          닫기
        </button>
      </div>

      {!slotId ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {evaluations
            .filter((item) => item.card)
            .map((item) => (
              <button
                key={item.slotId}
                onClick={() => setSlotId(item.slotId)}
                data-testid="sub-out"
                className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] hover:bg-white/10"
              >
                <span className="block truncate font-bold text-white">{item.player?.name}</span>
                <span className={tiredClass(item.card ? conditionOf(item.card) : item.condition)}>
                  {item.slotPosition} · 체력 {Math.round(item.card ? conditionOf(item.card) : item.condition)}
                </span>
              </button>
            ))}
        </div>
      ) : benchCards.length === 0 ? (
        <p className="text-xs text-slate-500">투입할 수 있는 벤치 선수가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {benchCards.map((card) => {
            const player = getPlayer(card.playerId)
            if (!player) return null
            return (
              <button
                key={card.uid}
                onClick={() => onSubstitute(slotId, card.uid)}
                data-testid="sub-in"
                className="rounded-lg bg-emerald-400/15 px-2 py-1.5 text-left text-[11px] hover:bg-emerald-400/25"
              >
                <span className="block truncate font-bold text-white">{player.name}</span>
                <span className={tiredClass(conditionOf(card))}>
                  {player.position} · Lv.{card.level} · 체력 {Math.round(conditionOf(card))}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeasonEnd() {
  const { state, startNewSeason } = useGame()
  const outcome = seasonOutcome(state.season)

  return (
    <div className="rise-in rounded-xl bg-slate-950/70 p-6 text-center">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
        시즌 {state.season.index} 종료 · {divisionLabel(state.season.division)}
      </div>
      <div className="mt-2 text-4xl font-black text-white">{outcome.rank}위</div>
      <div
        className={`mt-2 text-sm font-bold ${
          outcome.promoted
            ? 'text-emerald-300'
            : outcome.relegated
              ? 'text-rose-300'
              : 'text-slate-300'
        }`}
      >
        {outcome.promoted
          ? `승격! 다음 시즌은 ${divisionLabel(outcome.nextDivision)}입니다`
          : outcome.relegated
            ? `강등... 다음 시즌은 ${divisionLabel(outcome.nextDivision)}입니다`
            : '리그 잔류'}
      </div>
      <div className="mt-3 text-sm text-slate-400">
        시즌 보상 <span className="font-bold text-amber-300">+{outcome.reward}G</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        새 시즌에는 모든 선수의 체력이 회복되고 부상도 낫습니다.
      </p>
      <button
        onClick={startNewSeason}
        className="mt-5 rounded-xl btn-primary px-6 py-3 font-bold transition"
      >
        새 시즌 시작
      </button>
    </div>
  )
}


/**
 * Friendlies: ten quick matches a day that pay gold and experience without
 * touching the league table. Played in one go, no live view.
 */
function MiniGamePanel() {
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
        순위에 영향을 주지 않는 친선 경기입니다. 골드와 경험치를 주고 체력을 씁니다.
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

function Schedule() {
  const { state } = useGame()
  const upcoming = SEASON_SCHEDULE.slice(state.matchday, state.matchday + 6)

  return (
    <section className="panel p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">다음 일정</h3>
      <div className="space-y-1">
        {upcoming.map((day, index) => (
          <div
            key={day.index}
            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
              index === 0 ? 'bg-emerald-400/10 font-bold text-white' : 'text-slate-400'
            }`}
          >
            <span>{day.index + 1}경기일</span>
            <span
              className={
                day.kind === 'cup' ? 'font-bold text-amber-300' : 'text-slate-300'
              }
            >
              {day.kind === 'cup'
                ? `FA컵 ${CUP_ROUND_LABELS[day.round] ?? ''}`
                : `리그 ${day.round + 1}R`}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        리그와 컵 일정이 섞여 있습니다. 체력 관리를 못 하면 두 대회를 함께 치를 수 없습니다.
      </p>
    </section>
  )
}

/** Why the match looked the way it did, read off the tactical metrics. */
function TacticalReport({ state, setup }: { state: LiveMatchState; setup: MatchSetup | null }) {
  const report = useMemo(() => {
    if (!setup) return null
    const { ours, theirs } = tacticalStates(setup, 0.3)
    return buildReport(state.metrics, ours, theirs)
  }, [state.metrics, setup])

  if (!report) return null

  const stats: [label: string, value: string][] = [
    ['점유율', `${Math.round(report.possession * 100)}%`],
    ['패스 성공률', `${Math.round(report.passAccuracy * 100)}%`],
    ['슈팅', `${report.shots} : ${report.shotsAgainst}`],
    ['기대 득점', `${report.xg.toFixed(1)} : ${report.xgAgainst.toFixed(1)}`],
    ['최종 3분의 1 진입', `${report.finalThirdEntries}`],
    ['높은 위치 탈취', `${report.highTurnovers}`],
    ['역습', `${report.counterAttacks}`],
    ['압박 지표(PPDA)', report.ppda.toFixed(1)],
  ]

  return (
    <section className="mt-4 rounded-xl bg-slate-950/70 p-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-300">전술 리포트</h3>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label}>
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className="text-sm font-black text-white">{value}</div>
          </div>
        ))}
      </div>
      {report.story.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-white/5 pt-2">
          {report.story.map((line) => (
            <li key={line} className="text-[11px] leading-relaxed text-slate-300">
              · {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MatchRatings() {
  const { state } = useGame()
  const ratings = [...state.lastRatings].sort((a, b) => b.rating - a.rating)
  if (ratings.length === 0) return null

  return (
    <div className="mt-4 rounded-xl bg-white/5 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">경기 평점</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        {ratings.map((item) => (
          <div key={item.uid} className="flex items-center gap-2 text-xs">
            <span
              className={`w-9 shrink-0 rounded px-1 py-0.5 text-center font-bold ${
                item.rating >= 8
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : item.rating >= 6.5
                    ? 'bg-white/10 text-slate-200'
                    : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {item.rating.toFixed(1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-300">{item.name}</span>
            {item.goals > 0 && <span className="shrink-0 text-[10px]">⚽{item.goals}</span>}
            <span className="shrink-0 text-[10px] text-sky-300">+{item.exp}exp</span>
            {item.levelUp && (
              <span className="shrink-0 rounded bg-amber-400 px-1 text-[10px] font-black text-slate-900">
                LV UP
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 득점왕·도움왕·MVP for the running season — the club's own players, no gold attached. */
function SeasonLeaders() {
  const { state } = useGame()
  const leaders = useMemo(() => seasonLeaders(state.seasonStats), [state.seasonStats])
  const boards: [string, string, SeasonPlayerStat[], (row: SeasonPlayerStat) => string][] = [
    ['득점왕', 'text-emerald-300', leaders.scorers, (row) => `${row.goals}골`],
    ['도움왕', 'text-sky-300', leaders.assisters, (row) => `${row.assists}도움`],
    ['MVP', 'text-amber-300', leaders.mvps, (row) => `${row.mvps}회 · 평점 ${averageRating(row).toFixed(1)}`],
  ]
  const empty = boards.every(([, , rows]) => rows.length === 0)
  return (
    <section className="mt-4 panel p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">시즌 개인 기록</h3>
      {empty ? (
        <p className="text-xs text-slate-500">리그·컵 경기를 치르면 우리 선수들의 골·도움·MVP가 여기 쌓입니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {boards.map(([title, accent, rows, label]) => (
            <div key={title}>
              <div className={`text-[11px] font-black ${accent}`}>{title}</div>
              {rows.length === 0 ? (
                <p className="mt-1 text-[11px] text-slate-600">아직 없음</p>
              ) : (
                <ol className="mt-1 space-y-0.5 text-[11px]">
                  {rows.map((row, index) => (
                    <li key={row.uid} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1">
                      <span className="truncate text-slate-200">
                        <span className="mr-1 tabular-nums text-slate-500">{index + 1}</span>
                        {row.name}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-slate-300">{label(row)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-slate-600">기록은 명예입니다 — 골드 보너스는 없습니다. 새 시즌에 초기화됩니다.</p>
    </section>
  )
}

function LeagueTable() {
  const { state } = useGame()
  const table = useMemo(() => standings(state.season), [state.season])

  return (
    <section className="panel p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        {divisionLabel(state.season.division)} 순위표
      </h3>
      <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="text-slate-500">
              <th className="py-1 text-left font-semibold">순위</th>
              <th className="py-1 text-left font-semibold">팀</th>
              <th className="py-1 text-center font-semibold">경기</th>
              <th className="py-1 text-center font-semibold">득실</th>
              <th className="py-1 text-right font-semibold">승점</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr
                key={row.team.id}
                className={`border-t border-white/5 ${
                  row.team.id === MY_TEAM_ID
                    ? 'bg-emerald-400/10 font-bold text-white'
                    : 'text-slate-300'
                }`}
              >
                <td className="py-1.5">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                      row.rank <= PROMOTION_RANK
                        ? 'bg-emerald-500/25 text-emerald-300'
                        : row.rank >= RELEGATION_RANK
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-slate-500'
                    }`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="max-w-[110px] truncate py-1.5">{row.team.name}</td>
                <td className="py-1.5 text-center">{row.played}</td>
                <td className="py-1.5 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="py-1.5 text-right">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {PROMOTION_RANK}위 안에 들면 승격, {RELEGATION_RANK}위 아래면 강등됩니다.
      </p>
    </section>
  )
}

function CupBracket() {
  const { state } = useGame()
  const cup = state.cup

  const line = (tie: CupTie) => {
    const home = cupTeamOf(cup, tie.home)
    const away = cupTeamOf(cup, tie.away)
    const played = tie.homeGoals !== null && tie.awayGoals !== null
    const mine = tie.home === MY_TEAM_ID || tie.away === MY_TEAM_ID
    return (
      <div
        key={`${tie.round}-${tie.home}-${tie.away}`}
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${
          mine ? 'bg-emerald-400/10 font-bold text-white' : 'text-slate-300'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{home.name}</span>
        <span className="shrink-0 font-bold text-slate-200">
          {played ? `${tie.homeGoals} : ${tie.awayGoals}` : 'vs'}
          {tie.shootout && (
            <span className="ml-1 text-[10px] text-amber-300">
              (승부차기 {tie.shootout[0]}:{tie.shootout[1]})
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-right">{away.name}</span>
      </div>
    )
  }

  return (
    <section className="panel p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        FA컵 {cup.index}회 대진
      </h3>
      <div className="scrollbar-thin max-h-[420px] space-y-3 overflow-y-auto">
        {CUP_ROUND_LABELS.map((label, round) => {
          const ties = tiesOfRound(cup, round)
          if (ties.length === 0) return null
          return (
            <div key={label}>
              <div className="mb-1 text-[11px] font-bold text-slate-500">{label}</div>
              <div className="space-y-1">{ties.map(line)}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        통산 컵 우승 {state.trophies.cup}회 · 승격 {state.trophies.promotions}회
      </div>
    </section>
  )
}

function ClubForm() {
  const { state } = useGame()
  return (
    <section className="panel p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">통산 전적</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['승', state.record.w],
          ['무', state.record.d],
          ['패', state.record.l],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg bg-white/5 py-2">
            <div className="text-[10px] text-slate-400">{label as string}</div>
            <div className="text-lg font-bold text-white">{value as number}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">
        득점 {state.gf} · 실점 {state.ga}
      </div>
      {state.history.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {state.history.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                item.result === 'W'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : item.result === 'D'
                    ? 'bg-slate-600/25 text-slate-300'
                    : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              <div className="font-bold">
                {item.scoreFor} : {item.scoreAgainst}
                {item.competition === 'cup' && (
                  <span className="ml-1 text-[10px] text-amber-300">컵</span>
                )}
                {item.competition === 'friendly' && (
                  <span className="ml-1 text-[10px] text-sky-300">친선</span>
                )}
                {item.competition === 'pvp' && (
                  <span className="ml-1 text-[10px] text-fuchsia-300">PvP</span>
                )}
              </div>
              <div className="max-w-[80px] truncate opacity-70">{item.opponent}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
