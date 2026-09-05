'use client'

import { useEffect, useState } from 'react'
import { FORMATIONS } from '../lib/formations'
import { LINES, PLANS, PRESSINGS, TEMPOS, tacticSummary } from '../lib/tactics'
import { fetchWeeklyClubSheet, type ClubSheet } from '../lib/weeklyLive'

/**
 * A club in my weekly group, tapped from the 순위표: the eleven on a small
 * board, the bench, the four tactic dials and the team colours in force.
 * The same view for my own club, another manager's and an AI club.
 */
export default function ClubSheetModal({
  groupId,
  slot,
  mine,
  onClose,
}: {
  groupId: number
  slot: number
  mine: boolean
  onClose: () => void
}) {
  const [club, setClub] = useState<string>('')
  const [kind, setKind] = useState<'user' | 'ai' | null>(null)
  const [sheet, setSheet] = useState<ClubSheet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchWeeklyClubSheet(groupId, slot).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError('라인업을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setClub(result.club)
      setKind(result.kind)
      setSheet(result.sheet)
    })
    return () => {
      cancelled = true
    }
  }, [groupId, slot])

  const formation = sheet ? FORMATIONS[sheet.formation] ?? FORMATIONS['4-3-3'] : null
  const tactic = sheet?.tactic ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div
        className="panel max-h-[92vh] w-full max-w-md overflow-y-auto p-4"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {kind === 'user' ? '실유저 클럽' : kind === 'ai' ? 'AI 클럽' : '클럽'}
              {mine ? ' · 내 팀' : ''}
            </div>
            <h3 className="mt-0.5 text-base font-black text-white">{club || '불러오는 중…'}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold">
            닫기
          </button>
        </div>

        {loading && <p className="mt-3 text-sm text-slate-400">라인업을 불러오는 중…</p>}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {!loading && !error && !sheet && (
          <p className="mt-3 text-sm text-slate-400">이 감독은 아직 11명을 채운 라인업을 등록하지 않았습니다.</p>
        )}

        {sheet && formation && (
          <>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-white">{sheet.overall}</span>
                <span className="ml-2 text-xs text-slate-400">{sheet.formation}</span>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                공격 <b className="text-slate-200">{sheet.att}</b> · 미드 <b className="text-slate-200">{sheet.mid}</b> · 수비{' '}
                <b className="text-slate-200">{sheet.def}</b>
              </div>
            </div>

            <div className="pitch relative mt-3 aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/15">
              <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/25" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
              <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-36 -translate-x-1/2 border border-white/25" />
              <div className="pointer-events-none absolute top-3 left-1/2 h-12 w-36 -translate-x-1/2 border border-white/25" />
              {formation.slots.map((slotDef) => {
                const player = sheet.starters.find((item) => item.slotId === slotDef.id)
                const ring = player?.fit === 'out' ? 'ring-rose-500' : player?.fit === 'sub' ? 'ring-amber-400' : 'ring-emerald-400/70'
                return (
                  <div
                    key={slotDef.id}
                    style={{ left: `${slotDef.x}%`, bottom: `${slotDef.y}%` }}
                    className={`absolute w-[64px] -translate-x-1/2 translate-y-1/2 rounded-lg bg-slate-950/80 px-1 py-0.5 text-center ring-1 ${
                      player ? ring : 'ring-white/20'
                    }`}
                  >
                    <div className="text-[8px] font-black text-slate-400">
                      {slotDef.position}
                      {player && <span className="ml-1 text-slate-500">Lv.{player.level}</span>}
                    </div>
                    <div className="truncate text-[10px] font-bold text-white">{player ? player.name : '비어 있음'}</div>
                    {player && <div className="text-[9px] font-black tabular-nums text-emerald-300">{player.rating}</div>}
                  </div>
                )
              })}
            </div>

            {tactic && (
              <section className="mt-3 rounded-xl bg-white/5 p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">경기 전술 · 나에게만 보임</h4>
                <>
                  <p className="mt-1 text-sm font-bold text-white">{tacticSummary(tactic)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                    {(
                      [
                        ['기본 전술', PLANS.find((option) => option.key === tactic.plan)?.description],
                        ['압박', PRESSINGS.find((option) => option.key === tactic.pressing)?.description],
                        ['수비 라인', LINES.find((option) => option.key === tactic.line)?.description],
                        ['템포', TEMPOS.find((option) => option.key === tactic.tempo)?.description],
                      ] as const
                    ).map(([label, description]) => (
                      <div key={label} className="rounded-lg bg-black/30 px-2 py-1.5">
                        <div className="text-[10px] font-bold text-slate-500">{label}</div>
                        <div className="text-slate-300">{description ?? '-'}</div>
                      </div>
                    ))}
                  </div>
                </>
              </section>
            )}

            <section className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">벤치 {sheet.bench.length}명</h4>
                {sheet.bench.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">후보가 없습니다.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                    {sheet.bench.map((player, index) => (
                      <li key={`${player.playerId}-${index}`} className="flex justify-between gap-2">
                        <span className="truncate">{player.name}</span>
                        <span className="shrink-0 text-slate-500">Lv.{player.level}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">팀 컬러</h4>
                {sheet.colors.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">발동 중인 팀 컬러가 없습니다.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-200">
                    {sheet.colors.map((color) => (
                      <li key={color}>{color}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
