'use client'

import { useMemo, useState } from 'react'
import { divisionLabel } from '../lib/match'
import { evaluateSquad } from '../lib/squad'
import { GameProvider, useGame } from './GameProvider'
import ClubTab from './tabs/ClubTab'
import GachaTab from './tabs/GachaTab'
import MatchTab from './tabs/MatchTab'
import SquadTab from './tabs/SquadTab'

const TABS = [
  { key: 'gacha', label: '뽑기' },
  { key: 'squad', label: '스쿼드' },
  { key: 'club', label: '선수단' },
  { key: 'match', label: '경기' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function GachaGame() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}

function Shell() {
  const { state, ready, renameClub, reset } = useGame()
  const [tab, setTab] = useState<TabKey>('gacha')
  const [editingClub, setEditingClub] = useState(false)
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-lg font-black text-slate-900">
              FD
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Football Day
              </div>
              {editingClub ? (
                <input
                  autoFocus
                  defaultValue={state.club}
                  onBlur={(event) => {
                    renameClub(event.target.value)
                    setEditingClub(false)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  className="w-40 rounded bg-white/10 px-2 py-0.5 text-sm font-bold text-white outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingClub(true)}
                  className="text-sm font-bold text-white hover:text-emerald-300"
                  title="클럽 이름 변경"
                >
                  {state.club} ✎
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <Stat label="전력" value={rating.overall} />
            <Stat label="리그" value={divisionLabel(state.division)} />
            <div className="rounded-xl bg-amber-400/15 px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase text-amber-300/80">Gold</div>
              <div className="font-black text-amber-300">{state.gold.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
                tab === item.key
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {!ready ? (
          <p className="py-20 text-center text-sm text-slate-500">저장된 클럽을 불러오는 중...</p>
        ) : (
          <>
            {tab === 'gacha' && <GachaTab />}
            {tab === 'squad' && <SquadTab />}
            {tab === 'club' && <ClubTab />}
            {tab === 'match' && <MatchTab />}
          </>
        )}
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span>진행 상황은 이 브라우저에 자동 저장됩니다.</span>
          <button
            onClick={() => {
              if (window.confirm('모든 진행 상황을 지우고 처음부터 시작할까요?')) reset()
            }}
            className="rounded-lg bg-white/5 px-3 py-1.5 font-bold text-slate-400 hover:bg-white/10 hover:text-slate-200"
          >
            게임 초기화
          </button>
        </div>
      </footer>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="hidden rounded-xl bg-white/5 px-3 py-2 text-right sm:block">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="font-black text-white">{value}</div>
    </div>
  )
}
