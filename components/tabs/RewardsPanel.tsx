'use client'

import { useCallback, useMemo, useState } from 'react'
import KnobEditor from '../KnobEditor'
import { BOTTOM_DIVISION, TOP_DIVISION, divisionLabel } from '../../lib/league'
import { rawMatchReward } from '../../lib/match'
import { KNOBS, currentTuning, type KnobKey } from '../../lib/tuning'
import { TIERS } from '../../lib/weeklyLeague/config'
import {
  bestElevenReward,
  cupReward,
  individualAwardReward,
  mastersReward,
  seasonRankReward,
  weeklyMatchReward,
} from '../../lib/weeklyLeague/rewards'

const SEASON_ROWS: { label: string; amount: (tier: number, rates: Partial<Record<KnobKey, number>>) => number }[] = [
  { label: '리그 1위', amount: (tier, rates) => seasonRankReward(1, tier, rates) },
  { label: '리그 2위', amount: (tier, rates) => seasonRankReward(2, tier, rates) },
  { label: '리그 3위', amount: (tier, rates) => seasonRankReward(3, tier, rates) },
  { label: '리그 4~8위', amount: (tier, rates) => seasonRankReward(4, tier, rates) },
  { label: '리그 9~13위', amount: (tier, rates) => seasonRankReward(9, tier, rates) },
  { label: '리그 14~16위', amount: (tier, rates) => seasonRankReward(14, tier, rates) },
  { label: '컵 우승 (컵마다)', amount: (tier, rates) => cupReward('winner', tier, rates) },
  { label: '컵 준우승', amount: (tier, rates) => cupReward('runnerUp', tier, rates) },
  { label: '마스터스 우승', amount: (tier, rates) => mastersReward(tier, rates) },
  { label: '베스트 일레븐 선수 1명당', amount: (tier, rates) => bestElevenReward(tier, rates) },
  { label: '득점왕·도움왕·MVP왕 (각)', amount: (tier, rates) => individualAwardReward(tier, rates) },
]

const GROUPS = ['보상'] as const
const OUTCOMES = ['W', 'D', 'L'] as const
const OUTCOME_LABEL = { W: '승', D: '무', L: '패' } as const

/**
 * What every kind of match pays, at the slider positions shown — moving a
 * slider updates the table before saving, so the operator sees the effect
 * of a rate on the whole board, not one number. Same formulas the game
 * runs (lib/match.ts, lib/weeklyLeague/rewards.ts), fed the live values.
 */
export default function RewardsPanel() {
  const [values, setValues] = useState<Record<string, number>>(currentTuning())
  const onValues = useCallback((next: Record<string, number>) => setValues(next), [])
  const read = useCallback((key: KnobKey) => values[key] ?? KNOBS[key].default, [values])

  const divisions = useMemo(
    () => Array.from({ length: BOTTOM_DIVISION - TOP_DIVISION + 1 }, (_, i) => TOP_DIVISION + i),
    [],
  )
  const rates = useMemo(() => values as Partial<Record<KnobKey, number>>, [values])

  const casual = (outcome: 'W' | 'D' | 'L', division: number, goals: number) =>
    Math.round(rawMatchReward(outcome, division, goals) * read('casualGoldMultiplier'))
  const friendly = (outcome: 'W' | 'D' | 'L', division: number, goals: number) =>
    Math.round(casual(outcome, division, goals) * read('miniGameReward'))
  const pvp = (outcome: 'W' | 'D' | 'L', division: number, goals: number) =>
    Math.round(rawMatchReward(outcome, division, goals) * read('pvpGoldMultiplier'))

  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const cell = 'px-2 py-1 text-right tabular-nums'
  const head = 'px-2 py-1 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500'

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">경기별 골드 지급표</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          아래 슬라이더를 움직이면 표가 바로 바뀝니다(저장 전 미리보기). 금액은 <b>1골 기준</b>이고, 골 하나마다
          30G×배율이 더 붙습니다. 무·패는 등급 보너스의 1/3만 받습니다.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px] text-slate-200">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">경기</th>
                {OUTCOMES.map((o) => (
                  <th key={o} className={head}>
                    {OUTCOME_LABEL[o]}
                  </th>
                ))}
                <th className={head}>배율</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white/5">
                <td colSpan={5} className="px-2 py-1 text-[11px] font-bold text-emerald-300">
                  캐주얼 모드 — 리그·컵 (디비전별)
                </td>
              </tr>
              {divisions.map((division) => (
                <tr key={`casual-${division}`} className="border-b border-white/5">
                  <td className="px-2 py-1">{divisionLabel(division)}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o} className={cell}>
                      {fmt(casual(o, division, 1))}
                    </td>
                  ))}
                  <td className={`${cell} text-slate-500`}>×{read('casualGoldMultiplier')}</td>
                </tr>
              ))}

              <tr className="bg-white/5">
                <td colSpan={5} className="px-2 py-1 text-[11px] font-bold text-sky-300">
                  미니게임 — 데일리 미니게임(친선, 하루 {read('miniGameLimit')}판)
                </td>
              </tr>
              {divisions.map((division) => (
                <tr key={`friendly-${division}`} className="border-b border-white/5">
                  <td className="px-2 py-1">{divisionLabel(division)}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o} className={cell}>
                      {fmt(friendly(o, division, 1))}
                    </td>
                  ))}
                  <td className={`${cell} text-slate-500`}>
                    ×{read('casualGoldMultiplier')}×{read('miniGameReward')}
                  </td>
                </tr>
              ))}

              <tr className="bg-white/5">
                <td colSpan={5} className="px-2 py-1 text-[11px] font-bold text-fuchsia-300">
                  데일리 PvP (하루 {read('pvpDailyLimit')}회, 내 디비전 기준)
                </td>
              </tr>
              {divisions.map((division) => (
                <tr key={`pvp-${division}`} className="border-b border-white/5">
                  <td className="px-2 py-1">{divisionLabel(division)}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o} className={cell}>
                      {fmt(pvp(o, division, 1))}
                    </td>
                  ))}
                  <td className={`${cell} text-slate-500`}>×{read('pvpGoldMultiplier')}</td>
                </tr>
              ))}

              <tr className="bg-white/5">
                <td colSpan={5} className="px-2 py-1 text-[11px] font-bold text-amber-300">
                  경쟁 리그 (등급별 · 리그·컵 경기 공통)
                </td>
              </tr>
              {TIERS.map((_, tier) => (
                <tr key={`weekly-${tier}`} className="border-b border-white/5">
                  <td className="px-2 py-1">{tier}등급{tier === 0 ? ' (최상위)' : tier === TIERS.length - 1 ? ' (최하위)' : ''}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o} className={cell}>
                      {fmt(weeklyMatchReward(o, tier, 1, rates))}
                    </td>
                  ))}
                  <td className={`${cell} text-slate-500`}>
                    ×{read('competitiveGoldMultiplier')}×{read(`weeklyTierMultiplier${tier}` as KnobKey)}
                  </td>
                </tr>
              ))}

              <tr className="bg-white/5">
                <td colSpan={5} className="px-2 py-1 text-[11px] font-bold text-rose-300">
                  보너스
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-2 py-1">🔥 핫타임 (15시·21시 킥오프 경기에 지시 1개 이상)</td>
                <td colSpan={3} className={cell}>
                  +{fmt(read('hotTimeBonus'))}
                </td>
                <td className={`${cell} text-slate-500`}>고정</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          하루 기준 감각: 캐주얼 한 시즌(리그 19 + 컵 최대 4)과 경쟁 리그 하루(리그 13 + 컵)는 경기 수가 비슷합니다.
          경쟁 리그 배율 1.5는 『캐주얼 하루 1시즌 제한 뒤 경쟁 리그가 그 자리를 대신한다』는 뜻입니다.
        </p>
      </section>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">경쟁 리그 주간 시즌 보상표</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          일요일 23시 마스터스 결승이 정산된 뒤 서버가 그룹을 마감하며 한 번에 지급합니다(0등급 기준 노브 × 등급 배율 × 경쟁 리그 배율).
          감각: 0등급 감독이 한 주 105경기를 반쯤 이기면 경기 보상으로 약 7만G를 모으므로, 우승 보상은 그 절반쯤입니다.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px] text-slate-200">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">항목</th>
                {TIERS.map((_, tier) => (
                  <th key={tier} className={head}>
                    {tier}등급
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEASON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-white/5">
                  <td className="px-2 py-1">{row.label}</td>
                  {TIERS.map((_, tier) => (
                    <td key={tier} className={cell}>
                      {fmt(row.amount(tier, rates))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          베스트 일레븐은 출전 3경기 이상 선수의 평점을 출전 수로 보정해 골키퍼 1·수비 4·미드필더 3·공격 3을 뽑습니다. AI 클럽
          선수도 명단에는 오르지만 골드는 실유저 보유 선수에게만 나갑니다.
        </p>
      </section>

      <section className="panel p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">보상 배율 조절</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          슬라이더를 놓으면 저장되고 모두에게 곧바로 적용됩니다. 서버 정산도 같은 값을 읽습니다.
        </p>
        <KnobEditor groups={GROUPS} onValues={onValues} />
      </section>
    </div>
  )
}
