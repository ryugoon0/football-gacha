'use client'

import { useMemo, useState } from 'react'
import { ARCHETYPES, archetypeParams } from '../lib/tactics/archetypes'
import { comparePlans, pointsPerMatch, type PlanSummary } from '../lib/tactics/compare'
import { planForMode } from '../lib/tactics/mode'
import { DEFAULT_PARAMS } from '../lib/tactics/params'
import { phasedFrom, type PhasedTactics } from '../lib/tactics/phases'
import { EXAMPLE_PLANS } from '../lib/tactics/plans'
import { profileFrom } from '../lib/tactics/profile'
import type { MatchSetup } from '../lib/matchEngine'
import { evaluateSquad, lineupDivisionOf } from '../lib/squad'
import { DEFAULT_TACTIC } from '../lib/tactics'
import { useGame } from './GameProvider'

interface Choice {
  key: string
  label: string
  plan: (current: PhasedTactics) => PhasedTactics
}

/** Everything a manager might want to weigh against something else. */
function choices(): Choice[] {
  return [
    { key: 'now-phased', label: '내 계획 · 국면 분리', plan: (p) => planForMode(p, 'phased') },
    { key: 'now-sliders', label: '내 계획 · 슬라이더', plan: (p) => planForMode(p, 'sliders') },
    ...EXAMPLE_PLANS.map((item) => ({
      key: `plan-${item.key}`,
      label: item.label,
      plan: () => item.plan,
    })),
    ...ARCHETYPES.map((item) => ({
      key: `arch-${item.key}`,
      label: item.label,
      plan: () => phasedFrom(archetypeParams(item.key)),
    })),
  ]
}

const MATCH_COUNTS = [30, 60, 120]

/** One row of the results table. */
function Row({
  label,
  a,
  b,
  format,
  /** true when the bigger number is the better one. */
  higherIsBetter = true,
}: {
  label: string
  a: number
  b: number
  format: (value: number) => string
  higherIsBetter?: boolean
}) {
  const gap = a - b
  const aWins = higherIsBetter ? gap > 0 : gap < 0
  const level = Math.abs(gap) < 1e-9 ? 'tie' : aWins ? 'a' : 'b'
  const tone = (side: 'a' | 'b') =>
    level === side ? 'text-emerald-300 font-black' : 'text-slate-300 font-bold'

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-white/5 py-1.5">
      <div className={`text-right text-xs tabular-nums ${tone('a')}`}>{format(a)}</div>
      <div className="whitespace-nowrap text-center text-[10px] font-bold text-slate-500">
        {label}
      </div>
      <div className={`text-left text-xs tabular-nums ${tone('b')}`}>{format(b)}</div>
    </div>
  )
}

const one = (value: number) => value.toFixed(1)
const two = (value: number) => value.toFixed(2)
const pct = (value: number) => `${(value * 100).toFixed(0)}%`
const record = (s: PlanSummary) => `${s.wins}-${s.draws}-${s.losses}`

export default function TacticsCompare() {
  const { state } = useGame()
  const capDivision = lineupDivisionOf(state)
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState('now-phased')
  const [right, setRight] = useState('now-sliders')
  const [matches, setMatches] = useState(60)
  const [result, setResult] = useState<ReturnType<typeof comparePlans> | null>(null)
  const [running, setRunning] = useState(false)

  const options = useMemo(() => choices(), [])
  const nameOf = (key: string) => options.find((item) => item.key === key)?.label ?? key

  const rating = useMemo(
    () => evaluateSquad(state.cards, state.squad, capDivision),
    [state.cards, state.squad, capDivision],
  )

  const run = () => {
    const a = options.find((item) => item.key === left)
    const b = options.find((item) => item.key === right)
    if (!a || !b) return

    setRunning(true)
    // Let the button paint its busy state before the simulation blocks the thread.
    setTimeout(() => {
      // A neutral, mid-table opponent: the point is the gap between the two
      // plans, not how they do against one particular side.
      const setup: MatchSetup = {
        team: rating,
        teamName: state.club,
        opponent: { id: 'sim', name: '연습 상대', badge: 'SIM', rating: rating.overall },
        division: state.season.division,
        venue: 'neutral',
        tactic: state.tactic,
        traits: rating.traits,
        opponentTactics: {
          params: DEFAULT_PARAMS,
          profile: profileFrom({ overall: rating.overall }),
        },
      }
      setResult(
        comparePlans({
          setup,
          a: a.plan(state.plan),
          b: b.plan(state.plan),
          nameA: a.label,
          nameB: b.label,
          matches,
        }),
      )
      setRunning(false)
    }, 20)
  }

  const picker = (value: string, onChange: (next: string) => void, label: string) => (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full truncate rounded-lg bg-white/5 px-2 py-1.5 text-[11px] font-bold text-slate-100 outline-none"
      >
        {options.map((item) => (
          <option key={item.key} value={item.key} className="bg-slate-900">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="panel p-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">전술 비교</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            두 전술로 같은 상대를 같은 운으로 여러 번 상대해 봅니다.
          </p>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
          {open ? '접기' : '열기'}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex gap-2">
            {picker(left, setLeft, 'A')}
            {picker(right, setRight, 'B')}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              경기 수
            </span>
            {MATCH_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => setMatches(count)}
                className={`whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                  matches === count ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                {count}
              </button>
            ))}
            <button
              onClick={run}
              disabled={running || left === right}
              className="ml-auto shrink-0 whitespace-nowrap rounded-lg btn-primary px-3 py-1.5 text-[11px] font-black disabled:opacity-40"
            >
              {running ? '치르는 중...' : '비교하기'}
            </button>
          </div>

          {left === right && (
            <p className="mt-2 text-[11px] text-amber-300">서로 다른 두 전술을 골라 주세요.</p>
          )}

          {result && (
            <div className="mt-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 pb-1">
                <div className="truncate text-right text-[11px] font-black text-emerald-300">
                  {nameOf(left)}
                </div>
                <div className="text-center text-[10px] font-bold text-slate-600">
                  {matches}경기
                </div>
                <div className="truncate text-left text-[11px] font-black text-emerald-300">
                  {nameOf(right)}
                </div>
              </div>

              <Row
                label="경기당 승점"
                a={pointsPerMatch(result.a)}
                b={pointsPerMatch(result.b)}
                format={two}
              />
              <Row
                label="승-무-패"
                a={result.a.wins}
                b={result.b.wins}
                format={(value) => (value === result.a.wins ? record(result.a) : record(result.b))}
              />
              <Row label="득점" a={result.a.goalsFor} b={result.b.goalsFor} format={two} />
              <Row
                label="실점"
                a={result.a.goalsAgainst}
                b={result.b.goalsAgainst}
                format={two}
                higherIsBetter={false}
              />
              <Row label="기대 득점" a={result.a.xgFor} b={result.b.xgFor} format={two} />
              <Row
                label="기대 실점"
                a={result.a.xgAgainst}
                b={result.b.xgAgainst}
                format={two}
                higherIsBetter={false}
              />
              <Row label="슈팅" a={result.a.shots} b={result.b.shots} format={one} />
              <Row label="점유율" a={result.a.possession} b={result.b.possession} format={pct} />
              <Row
                label="패스 성공률"
                a={result.a.passAccuracy}
                b={result.b.passAccuracy}
                format={pct}
              />
              <Row
                label="PPDA (낮을수록 압박)"
                a={result.a.ppda}
                b={result.b.ppda}
                format={one}
                higherIsBetter={false}
              />
              <Row
                label="상대 진영 탈취"
                a={result.a.highTurnovers}
                b={result.b.highTurnovers}
                format={one}
              />
              <Row
                label="역습"
                a={result.a.counterAttacks}
                b={result.b.counterAttacks}
                format={one}
              />

              <ul className="mt-3 space-y-1 rounded-xl bg-white/5 p-3">
                {result.notes.map((note) => (
                  <li key={note} className="text-[11px] leading-relaxed text-slate-300">
                    · {note}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                두 전술은 같은 상대를 같은 난수로 상대했습니다. 표의 차이는 운이 아니라 전술이
                만든 것입니다. 다만 표본이 적으면 우연이 섞이니, 아깝게 갈리면 경기 수를 늘려
                보세요.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
