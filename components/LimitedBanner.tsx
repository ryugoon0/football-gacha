'use client'

import { useEffect, useState } from 'react'
import { formatKst, formatRemaining, limitedPhase, type LimitedPhase } from '../lib/limited'
import type { PlayerDef } from '../lib/types'
import PlayerCard from './PlayerCard'

/** Re-evaluates the window once a minute so the countdown and the phase change move on their own. */
export function useLimitedPhase(): LimitedPhase {
  const [phase, setPhase] = useState<LimitedPhase>(() => limitedPhase())
  useEffect(() => {
    const timer = setInterval(() => setPhase(limitedPhase()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return phase
}

/**
 * The 리미티드 strip on the scout screen: before the window it is a teaser
 * (what is coming and when), during the window it shows the cards with the
 * time left. Tapping a card opens its numbers.
 */
export default function LimitedBanner({ phase, onInspect }: { phase: LimitedPhase; onInspect: (player: PlayerDef) => void }) {
  if (phase.phase === 'none') return null
  const { batch } = phase
  return (
    <section className="rounded-2xl border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 via-slate-950/60 to-amber-400/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">
            리미티드 · {phase.phase === 'teaser' ? '출시 예고' : '지금 진행 중'}
          </div>
          <h3 className="mt-0.5 text-base font-black text-white">{batch.label} 리미티드 카드</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-300">{batch.note}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-black/40 px-3 py-2 text-right">
          {phase.phase === 'teaser' ? (
            <>
              <div className="text-[10px] font-bold text-slate-400">출시까지</div>
              <div className="text-lg font-black tabular-nums text-fuchsia-200">{formatRemaining(phase.opensInMs)}</div>
              <div className="text-[10px] text-slate-500">{formatKst(batch.from)} 시작</div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold text-slate-400">종료까지</div>
              <div className="text-lg font-black tabular-nums text-amber-200">{formatRemaining(phase.closesInMs)}</div>
              <div className="text-[10px] text-slate-500">{formatKst(batch.to)} 종료</div>
            </>
          )}
        </div>
      </div>

      {phase.phase === 'teaser' && (
        <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-[11px] text-slate-300">
          기간 중에는 프리미엄 스카우트에서만 나오고, 「이번 주 픽업」 자리에 올라 같은 등급이 나올 때 절반이 리미티드 카드가 됩니다. 기간이 끝나면
          더는 나오지 않지만 받은 카드는 그대로 남습니다.
        </p>
      )}

      {phase.phase === 'active' && (
        <div className="mt-3 flex flex-wrap gap-3">
          {phase.cards.length === 0 ? (
            <p className="text-[11px] text-slate-400">카드가 곧 공개됩니다.</p>
          ) : (
            phase.cards.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onInspect(player)}
                className="rounded-xl text-left transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-fuchsia-300"
                title={player.limited?.story ?? '선수 정보 보기'}
              >
                <PlayerCard player={player} size="md" />
                {player.limited?.story && <div className="mt-1 w-32 truncate text-center text-[10px] text-slate-400">{player.limited.story}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </section>
  )
}

const SEEN_KEY = 'football-gacha:limited-teaser-seen'

/**
 * A one-time popup per batch and phase ("coming Monday" once, "open now" once)
 * so the whole player base hears about the window — the announcement matters
 * as much as the cards.
 */
export function LimitedTeaserPopup({ phase, onOpenScout }: { phase: LimitedPhase; onOpenScout: () => void }) {
  const [open, setOpen] = useState(false)
  const key = phase.phase === 'none' ? null : `${phase.batch.id}:${phase.phase}`
  useEffect(() => {
    if (!key) return
    try {
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
      if (!seen.has(key)) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [key])
  const dismiss = () => {
    setOpen(false)
    if (!key) return
    try {
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
      seen.add(key)
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-20)))
    } catch {
      // Without storage the popup simply shows again next time.
    }
  }
  if (!open || phase.phase === 'none') return null
  const { batch } = phase
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={dismiss}>
      <div className="panel rise-in w-full max-w-sm overflow-hidden p-0" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="bg-gradient-to-br from-fuchsia-500/30 via-slate-900 to-amber-400/20 p-5 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-200">LIMITED</div>
          <h3 className="mt-2 text-lg font-black text-white">
            {phase.phase === 'teaser' ? `${batch.label} 리미티드 카드 출시 예고` : `${batch.label} 리미티드 카드 등장`}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-200">{batch.note}</p>
          <p className="mt-3 text-sm font-black text-amber-200">
            {phase.phase === 'teaser' ? `${formatKst(batch.from)} 시작 · ${formatKst(batch.to)}까지` : `${formatKst(batch.to)}까지 · 남은 시간 ${formatRemaining(phase.closesInMs)}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          <button onClick={dismiss} className="rounded-lg btn-ghost py-2 text-xs font-bold">
            확인
          </button>
          <button
            onClick={() => {
              dismiss()
              onOpenScout()
            }}
            className="rounded-lg btn-gold py-2 text-xs font-black"
          >
            스카우트 보기
          </button>
        </div>
      </div>
    </div>
  )
}
