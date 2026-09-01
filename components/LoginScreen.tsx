'use client'

import { useState } from 'react'
import { BUILD_REF, configStatus } from '../lib/supabase'
import LockerRoomScene from './LockerRoomScene'
import { useGame } from './GameProvider'

/**
 * The only thing an unauthenticated visitor sees. The game itself stays behind
 * it, so a save always belongs to an account.
 */
export default function LoginScreen() {
  const { account } = useGame()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    account.clearMessages()
    if (mode === 'signIn') await account.signIn(email.trim(), password)
    else await account.signUp(email.trim(), password)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <LockerRoomScene className="h-48 w-full sm:h-56" />
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
            Football Day
          </div>
          <h1 className="mt-1 text-2xl font-black leading-snug">
            감독님, 라커룸에 오신 걸 환영합니다
          </h1>
          <p className="mt-1 text-xs text-slate-400">로그인하면 팀이 기다리고 있습니다.</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="flex gap-1.5">
            {(['signIn', 'signUp'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  account.clearMessages()
                }}
                className={`flex-1 whitespace-nowrap rounded-lg py-2.5 text-sm font-bold transition ${
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
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </label>

          <button
            type="submit"
            disabled={account.syncing}
            className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-black text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {mode === 'signIn' ? '로그인하고 시작' : '가입하고 시작'}
          </button>
        </form>

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

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          진행 상황은 계정에 저장되어 어느 기기에서든 이어서 할 수 있습니다. 가입 확인 메일이 오면
          링크를 누른 뒤 로그인해 주세요.
        </p>
        <p className="mt-2 text-[11px] text-slate-700">
          빌드 {BUILD_REF} · 주소 {configStatus().url ? '있음' : '없음'} · 키{' '}
          {configStatus().key ? '있음' : '없음'}
        </p>
      </div>
    </main>
  )
}
