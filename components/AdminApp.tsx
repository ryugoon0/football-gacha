'use client'

import { useState, type ReactNode } from 'react'
import { GameProvider, useGame } from './GameProvider'
import { AdminProvider, useAdmin, useIsAdmin } from './useAdmin'
import { checkConnection, configStatus } from '../lib/supabase'
import { buildLabel } from '../lib/build'
import AccountPanel from './AccountPanel'
import MonitoringTab from './tabs/MonitoringTab'
import BalancePanel from './tabs/BalancePanel'
import RewardsPanel from './tabs/RewardsPanel'
import ShopPanel from './tabs/ShopPanel'
import WeeklyLeagueTab from './tabs/WeeklyLeagueTab'
import NoticePanel from './tabs/NoticePanel'
import CardMaker from './tabs/CardMaker'
import PlayerEditor from './tabs/PlayerEditor'
import LaunchReadinessTab from './tabs/LaunchReadinessTab'
import WeeklyTestMatchTab from './tabs/WeeklyTestMatchTab'
import GiftPanel from './tabs/GiftPanel'
import PredictionPanel from './tabs/PredictionPanel'
import AlbumPanel from './tabs/AlbumPanel'
import ReportsPanel from './tabs/ReportsPanel'
import SaveHistoryPanel from './tabs/SaveHistoryPanel'

const TABS = [
  { key: 'monitor', label: '모니터링' },
  { key: 'balance', label: '밸런스' },
  { key: 'rewards', label: '보상' },
  { key: 'gifts', label: '선물' },
  { key: 'predict', label: '예측' },
  { key: 'album', label: '앨범' },
  { key: 'reports', label: '신고' },
  { key: 'saves', label: '저장본' },
  { key: 'shop', label: '상점' },
  { key: 'league', label: '주간리그' },
  { key: 'launch', label: '내일 오픈' },
  { key: 'testmatch', label: '테스트 경기' },
  { key: 'notice', label: '공지' },
  { key: 'cards', label: '카드생성' },
  { key: 'editor', label: '선수편집' },
] as const

type TabKey = (typeof TABS)[number]['key']

/**
 * The operator console, at its own route (/admin) instead of a tab inside
 * the game. It shares the account/auth plumbing with the game (GameProvider,
 * useAdmin) because isAdmin is checked against the same `admins` table
 * either way, but nothing else about the game screen — no game tab bar, no
 * club header, no locker room art. A player who is also an operator signs
 * in the same way on both, but the two never render in the same tree, so
 * neither ships the other's code to someone who only uses one.
 */
export default function AdminApp() {
  return (
    <GameProvider>
      <AdminGate>
        <Shell />
      </AdminGate>
    </GameProvider>
  )
}

function AdminGate({ children }: { children: ReactNode }) {
  const { account } = useGame()
  return <AdminProvider value={useAdmin(account)}>{children}</AdminProvider>
}

function Shell() {
  const { account } = useGame()
  const { isAdmin, checked } = useIsAdmin()
  const [tab, setTab] = useState<TabKey>('monitor')

  if (!account.configured) {
    return (
      <Frame>
        <Message
          title="계정 기능이 꺼져 있습니다"
          body="이 화면은 Supabase 계정 설정이 있어야 열립니다. .env.example을 참고해 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY를 설정해 주세요."
        />
      </Frame>
    )
  }

  if (account.status === 'loading') {
    return (
      <Frame>
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </Frame>
    )
  }

  if (account.status !== 'signedIn') {
    return (
      <Frame>
        <SignInForm />
      </Frame>
    )
  }

  // A password-reset link signs someone in only far enough to set a new
  // password — it is not a real session. The game screen holds this at a
  // password form; the admin console has none, so it must refuse outright
  // rather than let a reset link double as a way into operator tools.
  if (account.recovering) {
    return (
      <Frame>
        <Message
          title="비밀번호 재설정 중입니다"
          body="이 링크는 새 비밀번호를 설정하는 용도입니다. 게임 화면에서 비밀번호를 바꾼 뒤 다시 로그인해 주세요."
        />
        <button
          onClick={() => void account.signOut()}
          className="mt-4 rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold"
        >
          로그아웃
        </button>
      </Frame>
    )
  }

  if (!checked) {
    return (
      <Frame>
        <p className="text-sm text-slate-500">운영자 계정인지 확인하는 중...</p>
      </Frame>
    )
  }

  if (!isAdmin) {
    return (
      <Frame>
        <Message
          title="운영자 계정이 아닙니다"
          body={`${account.user?.email ?? '이 계정'}은(는) admins 테이블에 없습니다. 화면을 감추는 것과 별개로, 모든 운영자 동작은 서버에서 다시 확인합니다.`}
        />
        <button
          onClick={() => void account.signOut()}
          className="mt-4 rounded-lg btn-ghost px-3 py-1.5 text-xs font-bold"
        >
          다른 계정으로
        </button>
      </Frame>
    )
  }

  // Only reachable by a confirmed operator, so this is real cloud-save
  // reconciliation, not noise: GameProvider syncs this account's own game
  // save in the background, and a clash needs the same resolution UI the
  // game shell would show. AccountPanel is its own fixed-position overlay,
  // so it does not need a Frame around it — and, as in the game shell,
  // clicking away does not make an unresolved conflict disappear.
  if (account.conflict) {
    return <AccountPanel onClose={() => {}} />
  }

  return (
    <main className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-slate-900">
              OP
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                운영자 콘솔
              </div>
              <div className="truncate text-sm font-bold text-white">{account.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => void account.signOut()}
            className="ml-auto whitespace-nowrap rounded-xl btn-ghost px-3 py-2 text-xs font-bold"
          >
            로그아웃
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition sm:text-sm ${
                tab === item.key
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'monitor' && <MonitoringTab />}
        {tab === 'balance' && <BalancePanel />}
        {tab === 'rewards' && <RewardsPanel />}
        {tab === 'gifts' && <GiftPanel />}
        {tab === 'predict' && <PredictionPanel />}
        {tab === 'album' && <AlbumPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'saves' && <SaveHistoryPanel />}
        {tab === 'shop' && <ShopPanel />}
        {tab === 'league' && <WeeklyLeagueTab />}
        {tab === 'launch' && <LaunchReadinessTab />}
        {tab === 'testmatch' && <WeeklyTestMatchTab />}
        {tab === 'notice' && <NoticePanel />}
        {tab === 'cards' && <CardMaker />}
        {tab === 'editor' && <PlayerEditor />}
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-600">
        <div className="border-t border-white/10 pt-4">빌드 {buildLabel()}</div>
      </footer>
    </main>
  )
}

function SignInForm() {
  const { account } = useGame()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [probe, setProbe] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)

  const status = configStatus()

  const runProbe = async () => {
    setProbing(true)
    const result = await checkConnection()
    setProbing(false)
    setProbe(`${result.ok ? '정상' : '문제'} — ${result.message}`)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    account.clearMessages()
    await account.signIn(email.trim(), password)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-slate-900">
          OP
        </span>
        <h1 className="mt-3 text-lg font-black text-white">운영자 로그인</h1>
        <p className="mt-1 text-xs text-slate-500">
          운영자 계정으로만 다음 화면이 열립니다. 게임 화면과는 별개의 로그인입니다.
        </p>
      </div>

      {status.message && (
        <p className="mb-4 rounded-lg bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300">
          {status.message}
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
        {account.error && <p className="text-[11px] font-semibold text-rose-400">{account.error}</p>}
        <button
          type="submit"
          disabled={account.syncing}
          className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 disabled:opacity-40"
        >
          {account.syncing ? '확인하는 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={runProbe}
          disabled={probing}
          className="text-[11px] font-bold text-slate-500 underline decoration-dotted hover:text-slate-300"
        >
          {probing ? '연결 확인하는 중...' : '연결 확인'}
        </button>
        {probe && <p className="mt-1 text-[11px] text-slate-500">{probe}</p>}
      </div>
    </div>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      {children}
    </main>
  )
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-sm text-center">
      <h1 className="text-base font-black text-white">{title}</h1>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  )
}
