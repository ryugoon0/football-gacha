'use client'

import { useState } from 'react'
import { summarize } from '../lib/cloudSave'
import { checkConnection, configStatus } from '../lib/supabase'
import { useGame } from './GameProvider'

/**
 * Sign up, sign in, and the one question worth asking: which save wins when a
 * browser and an account both hold real progress.
 */
export default function AccountPanel({ onClose }: { onClose: () => void }) {
  const { state, account } = useGame()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    account.clearMessages()
    if (mode === 'signIn') await account.signIn(email.trim(), password)
    else await account.signUp(email.trim(), password)
  }

  const local = summarize(state)
  const cloud = account.conflict ? summarize(account.conflict.state) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="rise-in w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            계정
          </span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-300"
          >
            닫기
          </button>
        </div>

        {!account.configured ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-white">아직 서버가 연결되지 않았습니다</h2>
            <p className="text-sm text-slate-400">
              지금은 진행 상황이 이 브라우저에만 저장됩니다. 계정과 게시판은 서버 설정(Supabase
              키 두 개)을 마치면 자동으로 켜집니다. 설정 방법은 README의 &ldquo;계정과 게시판
              켜기&rdquo;에 적어 두었습니다.
            </p>
            {configStatus().message && (
              <p className="rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">
                {configStatus().message}
              </p>
            )}
          </div>
        ) : cloud ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-white">어느 진행 상황을 쓸까요?</h2>
            <p className="text-xs text-slate-400">
              이 브라우저와 계정 양쪽에 진행 상황이 있습니다. 고르지 않은 쪽은 사라집니다.
            </p>
            <div className="grid gap-2">
              <SaveChoice
                title="이 브라우저"
                summary={local}
                onPick={() => account.resolveConflict('useLocal')}
              />
              <SaveChoice
                title="계정에 저장된 것"
                summary={cloud}
                stamp={account.conflict?.updatedAt}
                onPick={() => account.resolveConflict('useCloud')}
              />
            </div>
          </div>
        ) : account.status === 'signedIn' && account.user ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-white">{account.user.email}</h2>
              <p className="mt-1 text-xs text-slate-400">
                진행 상황이 계정에 자동 저장됩니다{account.syncing ? ' · 저장 중...' : ''}. 다른
                기기에서 같은 계정으로 로그인하면 이어서 할 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => account.signOut()}
              className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-1.5">
              {(['signIn', 'signUp'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key)
                    account.clearMessages()
                  }}
                  className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-bold transition ${
                    mode === key
                      ? 'bg-emerald-400 text-slate-900'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {key === 'signIn' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-400">
              이메일
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>

            <label className="block text-xs font-bold text-slate-400">
              비밀번호 (6자 이상)
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>

            <button
              type="submit"
              disabled={account.syncing}
              className="w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-black text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {mode === 'signIn' ? '로그인' : '가입하고 시작'}
            </button>

            <p className="text-[11px] text-slate-500">
              로그인하면 지금 이 브라우저의 진행 상황이 계정으로 올라갑니다. 로그인 없이도 게임은
              그대로 즐길 수 있습니다.
            </p>
          </form>
        )}

        {account.configured && (
          <div className="mt-4 border-t border-white/5 pt-3">
            <button
              onClick={async () => setHealth(await checkConnection())}
              className="whitespace-nowrap text-[11px] font-bold text-slate-500 hover:text-slate-300"
            >
              서버 연결 확인
            </button>
            {health && (
              <p
                className={`mt-1 break-all text-[11px] font-semibold ${
                  health.ok ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {health.ok ? '✓ ' : '! '}
                {health.message}
              </p>
            )}
          </div>
        )}

        {account.error && (
          <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            {account.error}
          </p>
        )}
        {account.notice && (
          <p className="mt-3 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-200">
            {account.notice}
          </p>
        )}
      </div>
    </div>
  )
}

function SaveChoice({
  title,
  summary,
  stamp,
  onPick,
}: {
  title: string
  summary: ReturnType<typeof summarize>
  stamp?: string
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      className="rounded-xl bg-white/5 p-3 text-left transition hover:bg-white/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-white">{title}</span>
        <span className="text-[10px] text-slate-500">
          {stamp ? new Date(stamp).toLocaleString('ko-KR') : '지금'}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        {summary.club} · {summary.division}부 · 시즌 {summary.season} · 카드 {summary.cards}장 ·{' '}
        {summary.gold.toLocaleString()}G · {summary.record}
      </div>
    </button>
  )
}
