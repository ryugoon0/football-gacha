'use client'

import { useState } from 'react'
import { TIERS, TIER_COUNT } from '../../lib/weeklyLeague/config'
import { generatePlacementLeague, type PlacementRealUserInput } from '../../lib/weeklyLeagueAdmin'

/**
 * 개막 배치 리그를 실제로 만드는 버튼. 실유저 자동 매칭이 아직 없어서
 * ("admin은 직접 입력으로 충분" — ROADMAP.md) 운영자가 참가시킬 실유저를
 * 직접 적어 넣는다. 나머지 자리는 서버가 AI로 채운다.
 *
 * 등급이 낮을수록 실유저 상한이 좁고 AI가 약하다(config.ts의 TIERS) —
 * 아래쪽 리그는 실유저가 쉽게 이기고 쉽게 승격하도록, 위로 갈수록 실유저
 * 비중과 상대 강도가 함께 오르도록 설계돼 있다. 서버가 이 상한을 강제로
 * 검사하므로, 여기 UI는 넘기지 못하게 미리 막아 헛수고를 줄인다.
 *
 * 등급(tier)마다 한 번씩 눌러야 그 등급의 리그가 생긴다. 같은 등급을
 * 다시 눌러도 이미 만들어져 있으면 그 그룹을 그대로 재사용한다(멱등).
 */

interface Row {
  userId: string
  clubName: string
  rating: string
}

const emptyRow = (): Row => ({ userId: '', clubName: '', rating: '60' })

export default function WeeklyLeaguePanel() {
  const [tier, setTier] = useState(0)
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const cap = TIERS[tier].maxRealUsers

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const addRow = () => setRows((current) => (current.length >= cap ? current : [...current, emptyRow()]))
  const removeRow = (index: number) => setRows((current) => current.filter((_, i) => i !== index))

  const submit = async () => {
    setError(null)
    setResult(null)

    const tierNumber = tier
    const filled = rows.filter((row) => row.userId.trim() || row.clubName.trim())
    if (filled.length > cap) {
      setError(`이 등급은 실유저를 최대 ${cap}명까지만 받습니다.`)
      return
    }
    const realUsers: PlacementRealUserInput[] = []
    for (const row of filled) {
      const rating = Number(row.rating)
      if (!row.userId.trim() || !row.clubName.trim() || !Number.isFinite(rating)) {
        setError('유저 ID·클럽명·평점을 모두 채워 주세요.')
        return
      }
      realUsers.push({ userId: row.userId.trim(), clubName: row.clubName.trim(), rating })
    }

    setBusy(true)
    const outcome = await generatePlacementLeague({ tier: tierNumber, realUsers })
    setBusy(false)

    if (!outcome.ok) {
      setError(
        outcome.reason === 'offline'
          ? '서버에 연결되지 않았습니다.'
          : outcome.reason === 'not admin'
            ? '운영자 계정이 아닙니다.'
            : outcome.detail ?? outcome.reason,
      )
      return
    }
    setResult(
      `${tierNumber}등급 그룹 #${outcome.groupId} — 실유저 ${realUsers.length}명 + AI ${
        outcome.members - realUsers.length
      }팀, 경기 ${outcome.fixturesInserted}개 ${outcome.alreadySeeded ? '(이미 있어 그대로 둠)' : '생성'}.`,
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">개막 배치 리그 생성</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
        정규 주간 시스템이 시작되기 전, 금·토·일 사흘짜리 배치 리그를 등급별로 한 번씩 만듭니다.
        실유저를 아래에 직접 적고, 나머지 16자리는 AI로 채웁니다.
      </p>

      <label className="mt-3 block text-[11px] font-bold text-slate-400">
        등급 (0이 최상위)
        <select
          value={tier}
          onChange={(event) => setTier(Number(event.target.value))}
          className="mt-1 block w-full rounded-lg bg-white/5 px-3 py-1.5 text-sm font-bold text-white outline-none"
        >
          {TIERS.map((t, index) => (
            <option key={index} value={index}>
              {index}등급 — 실유저 최대 {t.maxRealUsers}명 · AI 평점 {t.aiBaseRating}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-[11px] text-slate-500">
        {tier}등급: 실유저 최대 {cap}명, 나머지 {16 - cap}자리 이상은 평점 {TIERS[tier].aiBaseRating}의 AI로
        채웁니다. {tier === 0 ? '최상위라 AI가 가장 강합니다.' : tier === TIER_COUNT - 1 ? '최하위라 AI가 가장 약해 승격이 쉽습니다.' : ''}
      </p>

      <div className="mt-3 space-y-1.5">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1.5">
            <input
              value={row.userId}
              onChange={(event) => updateRow(index, { userId: event.target.value })}
              placeholder="유저 ID (uuid)"
              className="w-40 min-w-0 flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600"
            />
            <input
              value={row.clubName}
              onChange={(event) => updateRow(index, { clubName: event.target.value })}
              placeholder="클럽명"
              maxLength={30}
              className="w-28 min-w-0 flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600"
            />
            <input
              value={row.rating}
              onChange={(event) => updateRow(index, { rating: event.target.value })}
              placeholder="평점"
              inputMode="numeric"
              className="w-16 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600"
            />
            <button
              onClick={() => removeRow(index)}
              className="shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-bold text-rose-300"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        disabled={rows.length >= cap}
        className="mt-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 disabled:opacity-40"
      >
        + 실유저 추가 ({rows.length}/{cap})
      </button>

      {error && <p className="mt-2 text-[11px] font-semibold text-rose-400">{error}</p>}
      {result && <p className="mt-2 text-[11px] font-semibold text-emerald-300">{result}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-900 disabled:opacity-40"
      >
        {busy ? '생성하는 중...' : '이 등급 배치 리그 생성'}
      </button>
    </section>
  )
}
