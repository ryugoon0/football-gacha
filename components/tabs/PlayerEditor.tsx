'use client'

import { useMemo, useState } from 'react'
import {
  HIDDEN_KEYS,
  HIDDEN_LABELS,
  HIDDEN_RANGE,
  POSITION_CHOICES,
  STAT_KEYS,
  STAT_LABELS,
  STAT_RANGE,
} from '../../lib/cardMaker'
import {
  basePlayer,
  editFromOverrides,
  emptyEdit,
  isEmpty,
  overridesBlock,
  pasteInstructions,
  previewEdit,
  searchPlayers,
  tighten,
  validateEdit,
  type EditMap,
  type PlayerEdit,
} from '../../lib/rosterEditor'
import { RARITIES, RARITY_STYLES } from '../../lib/rarity'
import type { HiddenStats, Position, Stats } from '../../lib/types'
import PlayerCard from '../PlayerCard'
import { useIsAdmin } from '../useAdmin'

const field = 'w-full rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-slate-100 outline-none'
const label = 'text-[10px] font-bold uppercase tracking-wide text-slate-500'

export default function PlayerEditor() {
  const { isAdmin, checked } = useIsAdmin()
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('all')
  const [position, setPosition] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [edits, setEdits] = useState<EditMap>({})
  const [copied, setCopied] = useState(false)

  const results = useMemo(
    () => searchPlayers({ query, rarity, position }),
    [query, rarity, position],
  )
  const edit = (selected && edits[selected]) || emptyEdit()
  const base = useMemo(() => (selected ? basePlayer(selected) : null), [selected])
  const preview = useMemo(
    () => (selected ? previewEdit(selected, edit) : null),
    [selected, edit],
  )
  const problem = validateEdit(edit)
  const block = useMemo(() => overridesBlock(edits), [edits])
  const touched = useMemo(
    () => Object.entries(edits).filter(([id, item]) => !isEmpty(tighten(id, item))).length,
    [edits],
  )

  const pick = (id: string) => {
    setSelected(id)
    // Start from whatever correction is already committed for this card, so an
    // operator revisiting a player sees their earlier work instead of a blank.
    setEdits((current) => (current[id] ? current : { ...current, [id]: editFromOverrides(id) }))
    setCopied(false)
  }

  const change = (next: (item: PlayerEdit) => PlayerEdit) => {
    if (!selected) return
    setEdits((current) => ({ ...current, [selected]: next(current[selected] ?? emptyEdit()) }))
    setCopied(false)
  }

  const setStat = (key: keyof Stats, value: number | undefined) =>
    change((item) => {
      const stats = { ...item.stats }
      if (value === undefined) delete stats[key]
      else stats[key] = value
      return { ...item, stats }
    })

  const setHidden = (key: keyof HiddenStats, value: number | undefined) =>
    change((item) => {
      const hidden = { ...item.hidden }
      if (value === undefined) delete hidden[key]
      else hidden[key] = value
      return { ...item, hidden }
    })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block)
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
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">선수 찾기</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          이름, 소속팀, 카드 번호 중 아무거나로 찾을 수 있습니다.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className={label}>검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 박지승, 레알, lg42"
              className={`${field} mt-0.5 placeholder:font-normal placeholder:text-slate-600`}
            />
          </label>
          <label className="block">
            <span className={label}>등급</span>
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
              className={`${field} mt-0.5`}
            >
              <option value="all" className="bg-slate-900">전체</option>
              {RARITIES.map((item) => (
                <option key={item} value={item} className="bg-slate-900">
                  {RARITY_STYLES[item].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>포지션</span>
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className={`${field} mt-0.5`}
            >
              <option value="all" className="bg-slate-900">전체</option>
              {POSITION_CHOICES.map((item) => (
                <option key={item} value={item} className="bg-slate-900">
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {results.length === 0 && (
            <p className="px-1 py-3 text-[11px] text-slate-500">찾는 선수가 없습니다.</p>
          )}
          {results.map((player) => {
            const changed = edits[player.id] && !isEmpty(tighten(player.id, edits[player.id]))
            return (
              <button
                key={player.id}
                onClick={() => pick(player.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                  selected === player.id ? 'bg-emerald-400/15' : 'bg-white/5'
                }`}
              >
                <span className="w-9 shrink-0 text-[10px] font-black tabular-nums text-slate-500">
                  {player.id}
                </span>
                <span className="w-9 shrink-0 text-[10px] font-bold text-slate-400">
                  {player.position}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-100">
                  {player.name}
                  <span className="ml-1 font-normal text-slate-500">{player.club}</span>
                </span>
                {changed && (
                  <span className="shrink-0 rounded bg-amber-400/20 px-1 text-[9px] font-bold text-amber-200">
                    수정
                  </span>
                )}
                <span className="shrink-0 text-[11px] font-black tabular-nums text-emerald-300">
                  {player.ovr}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {selected && base && preview && (
        <>
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <PlayerCard player={preview} level={1} size="lg" />
              <div className="min-w-0 flex-1 space-y-1 text-[11px] text-slate-500">
                <p className="text-sm font-bold text-slate-100">{preview.name}</p>
                <p>
                  {preview.club} · {preview.nation} · {RARITY_STYLES[preview.rarity].label}
                </p>
                <p>
                  종합 <span className="font-bold text-emerald-300">{preview.ovr}</span>
                  {preview.ovr !== base.ovr && (
                    <span className="ml-1 text-slate-400">(원래 {base.ovr})</span>
                  )}
                </p>
                <p className="text-slate-600">소화 가능 {preview.positions.join(' · ')}</p>
                {problem && <p className="font-semibold text-rose-400">{problem}</p>}
              </div>
            </div>

            <label className="mt-3 block">
              <span className={label}>포지션</span>
              <select
                value={edit.position ?? base.position}
                onChange={(event) =>
                  change((item) => ({ ...item, position: event.target.value as Position }))
                }
                className={`${field} mt-0.5`}
              >
                {POSITION_CHOICES.map((item) => (
                  <option key={item} value={item} className="bg-slate-900">
                    {item}
                    {item === base.position ? ' (원래)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3">
              <span className={label}>소화 가능 포지션 (멀티 포지션)</span>
              <p className="mt-0.5 text-[11px] text-slate-500">
                손대지 않으면 등급·주 포지션에 따라 자동으로 정해집니다. 위 포지션을 바꾸면 자동
                범위도 함께 바뀝니다.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {POSITION_CHOICES.map((item) => {
                  const on = preview.positions.includes(item)
                  return (
                    <button
                      key={item}
                      onClick={() =>
                        change((current) => {
                          const base = current.positions ?? preview.positions
                          const next = on ? base.filter((p) => p !== item) : [...base, item]
                          return { ...current, positions: next }
                        })
                      }
                      disabled={on && preview.positions.length === 1}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        on ? 'bg-emerald-400 text-slate-900' : 'bg-white/10 text-slate-300'
                      } disabled:opacity-40`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => change((item) => ({ ...item, positions: undefined }))}
                disabled={edit.positions === undefined}
                className="mt-1.5 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
              >
                자동으로 되돌리기
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">세부 능력치</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              손대지 않은 항목은 지금처럼 자동으로 정해집니다. 포지션을 바꾸면 자동 값도 함께
              바뀝니다.
            </p>
            <div className="mt-2 space-y-2">
              {STAT_KEYS.map((key) => {
                const pinned = edit.stats[key]
                const value = pinned ?? preview.stats[key]
                return (
                  <div key={key} className="rounded-xl bg-white/5 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100">{STAT_LABELS[key]}</span>
                      <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-emerald-300">
                        {value}
                        {pinned === undefined ? (
                          <span className="ml-1 font-normal text-slate-500">자동</span>
                        ) : (
                          <span className="ml-1 font-normal text-slate-500">
                            원래 {base.stats[key]}
                          </span>
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
                        disabled={pinned === undefined}
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
            <div className="mt-2 space-y-2">
              {HIDDEN_KEYS.map((key) => {
                const pinned = edit.hidden[key]
                const value = pinned ?? preview.hidden[key]
                return (
                  <div key={key} className="rounded-xl bg-white/5 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-bold text-slate-100">
                        {HIDDEN_LABELS[key].label}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[11px] font-black tabular-nums text-sky-300">
                        {value}
                        {pinned === undefined && (
                          <span className="ml-1 font-normal text-slate-500">자동</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{HIDDEN_LABELS[key].note}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="range"
                        min={HIDDEN_RANGE.min}
                        max={HIDDEN_RANGE.max}
                        value={value}
                        onChange={(event) => setHidden(key, Number(event.target.value))}
                        aria-label={HIDDEN_LABELS[key].label}
                        className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-sky-400"
                      />
                      <button
                        onClick={() => setHidden(key, undefined)}
                        disabled={pinned === undefined}
                        className="shrink-0 whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-30"
                      >
                        자동
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => change(() => emptyEdit())}
              className="mt-3 w-full rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-slate-300"
            >
              이 선수 수정 되돌리기
            </button>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          붙여넣을 내용 {touched > 0 && <span className="text-emerald-300">{touched}명</span>}
        </h3>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950/70 p-3 text-[11px] leading-relaxed text-emerald-200">
          {block}
        </pre>
        <button
          onClick={() => void copy()}
          disabled={Boolean(problem)}
          className="mt-2 w-full rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-900 disabled:opacity-40"
        >
          {copied ? '복사했습니다' : '전체 복사'}
        </button>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
          {pasteInstructions()}
        </pre>
        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
          여기서 고친 값은 아직 게임에 반영되지 않습니다. 뽑기를 서버가 하기 때문에 선수 정보는
          앱과 서버가 같은 파일을 봐야 하고, 그래서 코드로 커밋해야 합니다.
        </p>
      </section>
    </div>
  )
}
