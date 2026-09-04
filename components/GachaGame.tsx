'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { divisionLabel } from '../lib/league'
import { evaluateSquad } from '../lib/squad'
import { GameProvider, useGame } from './GameProvider'
import AccountPanel from './AccountPanel'
import AssistantCard from './AssistantCard'
import { buildLabel } from '../lib/build'
import { CardStyleProvider, CardStyleToggle } from './CardStyle'
import { TacticsModeProvider } from './TacticsMode'
import { AdminProvider, useAdmin } from './useAdmin'
import GuideOverlay from './GuideOverlay'
import LoginScreen from './LoginScreen'
import BoardTab from './tabs/BoardTab'
import ClubTab from './tabs/ClubTab'
import HomeTab from './tabs/HomeTab'
import GachaTab from './tabs/GachaTab'
import ItemsTab from './tabs/ItemsTab'
import MarketTab from './tabs/MarketTab'
import MatchTab from './tabs/MatchTab'
import PvpTab from './tabs/PvpTab'
import SquadTab from './tabs/SquadTab'
import WeeklyTab from './tabs/WeeklyTab'
import { BRAND_MARK, BRAND_NAME } from '../lib/brand'

const TABS = [
  { key: 'home', label: '홈' },
  { key: 'gacha', label: '뽑기' },
  { key: 'market', label: '이적시장' },
  { key: 'items', label: '상점' },
  { key: 'squad', label: '스쿼드' },
  { key: 'club', label: '선수단' },
  { key: 'match', label: '캐주얼 모드' },
  { key: 'pvp', label: '데일리 PvP' },
  { key: 'weekly', label: '경쟁 리그' },
  { key: 'board', label: '게시판' },
] as const

type TabKey = (typeof TABS)[number]['key']

/**
 * Shown in the footer so a tester can say which build they were looking at.
 * Vercel fills the commit in at build time; local runs just say "local".
 */


export default function GachaGame() {
  return (
    <GameProvider>
      <CardStyleProvider>
        <TacticsModeProvider>
          <AdminGate>
            <Shell />
          </AdminGate>
        </TacticsModeProvider>
      </CardStyleProvider>
    </GameProvider>
  )
}

/**
 * Asks once whether this account is an operator and hands the answer down.
 * Operator-only content reads it from context rather than each screen checking
 * for itself — a screen that forgets to check is a screen that leaks.
 */
function AdminGate({ children }: { children: ReactNode }) {
  const { account } = useGame()
  return <AdminProvider value={useAdmin(account)}>{children}</AdminProvider>
}

function Shell() {
  const { state, ready, account, renameClub, reset, finishGuide } = useGame()
  const [tab, setTab] = useState<TabKey>('home')
  const [editingClub, setEditingClub] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const rating = useMemo(() => evaluateSquad(state.cards, state.squad), [state.cards, state.squad])

  const showGuide = helpOpen || (ready && !state.guideDone)

  // With a server configured, the game lives behind a login. Without one there
  // are no accounts to check, so the game runs locally as before.
  // A reset link signs the person in, so the plain status check would drop them
  // straight into the game with a password they cannot repeat. Hold them at the
  // login screen until a new one is set.
  if (account.configured && (account.status !== 'signedIn' || account.recovering)) {
    if (account.status === 'loading') {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">
          불러오는 중...
        </main>
      )
    }
    return <LoginScreen />
  }

  return (
    <main className="min-h-screen text-slate-100">
      <header className="app-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black" aria-label="리그센터로 이동">
              {BRAND_MARK}
            </Link>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                {BRAND_NAME}
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
                  className="block max-w-[45vw] truncate whitespace-nowrap text-sm font-bold text-white hover:text-emerald-300 sm:max-w-xs"
                  title="클럽 이름 변경"
                >
                  {state.club} ✎
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <Stat label="전력" value={rating.overall} />
            <Stat label="리그" value={divisionLabel(state.season.division)} />
            <Stat
              label="시즌"
              value={state.season.finished ? '종료' : `${state.season.round + 1}R`}
            />
            <div className="gold-plate whitespace-nowrap rounded-xl px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">Gold</div>
              <div className="font-black tabular-nums text-amber-200">{state.gold.toLocaleString()}</div>
            </div>
            <button
              onClick={() => setAccountOpen(true)}
              className="whitespace-nowrap rounded-xl btn-ghost px-3 py-2 text-xs font-bold"
              title={account.user ? account.user.email : '로그인하면 진행 상황이 계정에 저장됩니다'}
            >
              {account.status === 'signedIn' ? '내 계정' : '로그인'}
            </button>
            <CardStyleToggle />
            <button
              onClick={() => setHelpOpen(true)}
              className="whitespace-nowrap rounded-xl btn-ghost px-3 py-2 text-xs font-bold"
              title="게임 방법"
            >
              도움말
            </button>
          </div>
        </div>

        {/* Tab labels never wrap — the type shrinks on narrow phones instead. */}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 py-2 text-[11px] font-bold transition min-[400px]:px-2 min-[400px]:text-xs sm:px-3 sm:text-sm ${
                tab === item.key
                  ? 'tab-active border-emerald-400'
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
            <AssistantCard tab={tab} />
            {tab === 'home' && <HomeTab onJump={(key) => setTab(key as TabKey)} />}
            {tab === 'gacha' && <GachaTab />}
            {tab === 'market' && <MarketTab />}
            {tab === 'items' && <ItemsTab />}
            {tab === 'squad' && <SquadTab />}
            {tab === 'club' && <ClubTab />}
            {tab === 'match' && <MatchTab />}
            {tab === 'pvp' && <PvpTab />}
            {tab === 'weekly' && <WeeklyTab />}
            {tab === 'board' && <BoardTab />}
          </>
        )}
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span>
            진행 상황은 이 브라우저에 자동 저장됩니다.
            <span className="ml-2 whitespace-nowrap text-slate-700">빌드 {buildLabel()}</span>
          </span>
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

      {(accountOpen || account.conflict) && (
        <AccountPanel onClose={() => setAccountOpen(false)} />
      )}

      {showGuide && (
        <GuideOverlay
          onClose={() => {
            setHelpOpen(false)
            finishGuide()
          }}
          onJump={(key) => setTab(key as TabKey)}
        />
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-plate hidden rounded-xl px-3 py-2 text-right sm:block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-black tabular-nums text-white">{value}</div>
    </div>
  )
}
