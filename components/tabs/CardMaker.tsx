'use client'

import { useMemo, useState } from 'react'
import {
  HIDDEN_KEYS,
  HIDDEN_LABELS,
  HIDDEN_RANGE,
  OVR_RANGE,
  POSITION_CHOICES,
  STAT_KEYS,
  STAT_LABELS,
  STAT_RANGE,
  emptyDraft,
  generatedStats,
  nextId,
  pasteInstructions,
  previewCard,
  rosterLine,
  validateDraft,
  type CardDraft,
} from '../../lib/cardMaker'
import { CLUBS, NATIONS } from '../../lib/players'
import { RARITIES, RARITY_STYLES } from '../../lib/rarity'
import type { HiddenStats, Position, Rarity, Stats } from '../../lib/types'
import PlayerCard from '../PlayerCard'
import { useIsAdmin } from '../useAdmin'

const field = 'w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-slate-100 outline-none'
const label = 'text-[10px] font-bold uppercase tracking-wide text-slate-500'

export default function CardMaker() {
  const { isAdmin, checked } = useIsAdmin()
  const [draft, setDraft] = useState<CardDraft>(emptyDraft())
  const [copied, setCopied] = useState(false)

  const problem = validateDraft(draft)
  const preview = useMemo(() => previewCard(draft), [draft])
  const auto = useMemo(() => generatedStats(draft), [draft])
  const line = rosterLine(draft)

  const set = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setCopied(false)
  }

  const setStat = (key: keyof Stats, value: number | undefined) => {
    setDraft((current) => {
      const stats = { ...current.stats }
      if (value === undefined) delete stats[key]
      else stats[key] = value
      return { ...current, stats }
    })
    setCopied(false)
  }

  const setHidden = (key: keyof HiddenStats, value: number | undefined) => {
    setDraft((current) => {
      const hidden = { ...current.hidden }
      if (value === undefined) delete hidden[key]
      else hidden[key] = value
      return { ...current, hidden }
    })
    setCopied(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (!checked) return <p className="p-6 text-sm text-slate-500">확인하는 중...</p>
  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-sm font-bold text-slate-300">운영자 전용</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          이 화면은 운영자 계정에서만 열립니다.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">기본</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className={label}>이름</span>
            <input
              value={draft.name}
              onChange={(event) => set('name', event.target.value)}
              maxLength={12}
              placeholder="예: 손차범"
              className={`${field} mt-0.5 placeholder:font-normal placeholder:text-slate-600`}
            />
          </label>
          <label className="block">
            <span className={label}>등급</span>
            <select
              value={draft.rarity}
              onChange={(event) => set('rarity', event.target.value as Rarity)}
              className={`${field} mt-0.5`}
            >
              {RARITIES.map((rarity) => (
                <option key={rarity} value={rarity} className="bg-slate-900">
                  {RARITY_STYLES[rarity].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>포지션</span>
            <select
              value={draft.position}
              onChange={(event) => set('position', event.target.value as Position)}
              className={`${field} mt-0.5`}
            >
              {POSITION_CHOICES.map((position) => (
                <option key={position} value={position} className="bg-slate-900">
                  {position}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>목표 종합 {draft.ovr}</span>
            <input
              type="range"
              min={OVR_RANGE.min}
              max={OVR_RANGE.max}
              value={draft.ovr}
              onChange={(event) => set('ovr', Number(event.target.value))}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
            />
          </label>
          <label className="block">
            <span className={label}>클럽</span>
            <select
              value={draft.club}
              onChange={(event) => set('club', event.target.value)}
              className={`${field} mt-0.5`}
            >
              {CLUBS.map((club) => (
                <option key={club.name} value={club.name} className="bg-slate-900">
                  {club.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>국가</span>
            <select
              value={draft.nation}
              onChange={(event) => set('nation', event.target.value)}
              className={`${field} mt-0.5`}
            >
              {NATIONS.map((nation) => (
                <option key={nation} value={nation} className="bg-slate-900">
                  {nation}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">세부 능력치</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          비워 두면 목표 종합과 포지션에 맞춰 자동으로 정해집니다. 직접 적은 값만 그대로 갑니다.
        </p>
        <div className="mt-2 space-y-2">
          {STAT_KEYS.map((key) => {
            const pinnedValue = draft.stats[key]
            const value = pinnedValue ?? auto[key]
            return (
              <div key={key} className="rounded-xl bg-white/5 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-slate-100">{STAT_LABELS[key]}</span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-emerald-300">
                    {value}
                    {pinnedValue === undefined && (
                      <span className="ml-1 font-normal text-slate-500">자동</span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={STAT_RANGE.min}
                    max={STAT_RANGE.max}
                    value={value}
                    onChange={(event) => setStat(key, Number(event.target.value))}
                    aria-label={STAT_LABELS[key]}
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
                  />
                  <button
                    onClick={() => setStat(key, undefined)}
                    disabled={pinnedValue === undefined}
                    className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                  >
                    자동
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">히든 능력치</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          카드에는 숫자로 나오지 않지만 경기 결과를 바꿉니다. 0~{HIDDEN_RANGE.max} 사이이며, 비워
          두면 등급에 맞는 범위에서 정해집니다.
        </p>
        <div className="mt-2 space-y-2">
          {HIDDEN_KEYS.map((key) => {
            const pinnedValue = draft.hidden[key]
            return (
              <div key={key} className="rounded-xl bg-white/5 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-100">
                    {HIDDEN_LABELS[key].label}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-sky-300">
                    {pinnedValue ?? '자동'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{HIDDEN_LABELS[key].note}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={HIDDEN_RANGE.min}
                    max={HIDDEN_RANGE.max}
                    value={pinnedValue ?? 0}
                    onChange={(event) => setHidden(key, Number(event.target.value))}
                    aria-label={HIDDEN_LABELS[key].label}
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-sky-400"
                  />
                  <button
                    onClick={() => setHidden(key, undefined)}
                    disabled={pinnedValue === undefined}
                    className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                  >
                    자동
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">미리보기</h3>
        <div className="mt-2 flex flex-wrap items-start gap-3">
          <PlayerCard player={preview} level={1} size="lg" />
          <div className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-500">
            <p>
              받게 될 번호 <span className="font-bold text-slate-300">{nextId(draft.rarity)}</span>
            </p>
            <p>
              실제 종합 <span className="font-bold text-emerald-300">{preview.ovr}</span>
              {preview.ovr !== draft.ovr && (
                <span className="ml-1">(목표 {draft.ovr} — 능력치를 고정하면 달라집니다)</span>
              )}
            </p>
            <p className="text-slate-600">
              {HIDDEN_KEYS.map((key) => `${HIDDEN_LABELS[key].label} ${preview.hidden[key]}`).join(' · ')}
            </p>
            {problem && <p className="font-semibold text-rose-400">{problem}</p>}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            붙여넣을 줄
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950/70 p-3 text-[11px] leading-relaxed text-emerald-200">
            {line}
          </pre>
          <button
            onClick={() => void copy()}
            disabled={Boolean(problem)}
            className="mt-2 w-full rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-900 disabled:opacity-40"
          >
            {copied ? '복사했습니다' : '이 줄 복사'}
          </button>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
            {pasteInstructions(draft)}
          </pre>
        </div>

        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
          카드는 앱에서 바로 만들 수 없습니다. 뽑기를 서버가 하므로 선수 목록이 서버 함수 안에도
          있어야 하고, 데이터베이스로만 추가하면 서버와 게임이 서로 다른 목록을 갖게 됩니다.
        </p>
      </section>
    </div>
  )
}
