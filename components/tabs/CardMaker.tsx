'use client'

import { useMemo, useState } from 'react'
import {
  OVR_RANGE,
  POSITION_CHOICES,
  emptyDraft,
  nextId,
  pasteInstructions,
  previewCard,
  rosterLine,
  validateDraft,
  type CardDraft,
} from '../../lib/cardMaker'
import { CLUBS, NATIONS } from '../../lib/players'
import { RARITIES, RARITY_STYLES } from '../../lib/rarity'
import type { Position, Rarity } from '../../lib/types'
import PlayerCard from '../PlayerCard'

export default function CardMaker() {
  const [draft, setDraft] = useState<CardDraft>(emptyDraft())
  const [copied, setCopied] = useState(false)

  const problem = validateDraft(draft)
  const preview = useMemo(() => previewCard(draft), [draft])
  const line = rosterLine(draft)

  const set = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
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

  const field = 'w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-slate-100 outline-none'

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">신규 카드 만들기</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        게임이 실제로 만들 카드를 그대로 미리 봅니다. 능력치는 포지션에 맞게 모양이 잡히고 종합에
        맞춰 다시 맞춰지므로, 입력한 숫자와 조금 다르게 나옵니다.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">이름</span>
          <input
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            maxLength={12}
            placeholder="예: 손차범"
            className={`${field} mt-0.5 placeholder:font-normal placeholder:text-slate-600`}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">등급</span>
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">포지션</span>
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            종합 {draft.ovr}
          </span>
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">클럽</span>
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">국가</span>
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

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <PlayerCard player={preview} level={1} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-500">
            받게 될 번호: <span className="font-bold text-slate-300">{nextId(draft.rarity)}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            실제 종합: <span className="font-bold text-emerald-300">{preview.ovr}</span>
          </p>
          {problem && (
            <p className="mt-2 text-[11px] font-semibold text-rose-400">{problem}</p>
          )}
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
  )
}
