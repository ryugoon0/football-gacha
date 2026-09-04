'use client'

import { useEffect, useState } from 'react'
import { ASSISTANTS, WELCOME_LINES, assistantImage, assistantOfTheDay, loadAssistantMode, type AssistantId, type AssistantMode } from '../lib/assistant'
import { BRAND_NAME } from '../lib/brand'
import { checkConnection, configStatus } from '../lib/supabase'
import { buildLabel } from '../lib/build'
import LockerRoomScene from './LockerRoomScene'
import { useGame } from './GameProvider'

/**
 * The only thing an unauthenticated visitor sees. The game itself stays behind
 * it, so a save always belongs to an account.
 */
export default function LoginScreen() {
  const { account } = useGame()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [fresh, setFresh] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [probe, setProbe] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)
  // The greeter at the door: one of the three, by the day, in the art mode
  // this browser last chose. Read after mount so the server render matches.
  const [greeter, setGreeter] = useState<{ id: AssistantId; mode: AssistantMode } | null>(null)
  const [greeterMissing, setGreeterMissing] = useState(false)
  useEffect(() => {
    setGreeter({ id: assistantOfTheDay(), mode: loadAssistantMode() })
  }, [])

  const runProbe = async () => {
    setProbing(true)
    const result = await checkConnection()
    setProbing(false)
    setProbe(`${result.ok ? '정상' : '문제'} — ${result.message}`)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    account.clearMessages()
    if (mode === 'signIn') await account.signIn(email.trim(), password)
    else await account.signUp(email.trim(), password)
  }

  // Someone who followed a reset link is signed in, but only far enough to
  // choose a new password. Nothing else is worth showing until they have.
  if (account.recovering) {
    return (
      <main className="min-h-screen text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
          <h1 className="text-2xl font-black leading-snug">새 비밀번호를 정해 주세요</h1>
          <p className="mt-1 text-xs text-slate-400">
            정하고 나면 바로 이어서 하실 수 있습니다.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void account.setNewPassword(fresh)
            }}
            className="mt-5 space-y-3"
          >
            <label className="block text-xs font-bold text-slate-400">
              새 비밀번호 (6자 이상)
              <input
                type="password"
                required
                minLength={6}
                value={fresh}
                onChange={(event) => setFresh(event.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg input px-3 py-2.5 text-sm font-semibold"
              />
            </label>
            <button
              type="submit"
              disabled={account.syncing || fresh.length < 6}
              className="w-full rounded-xl btn-primary py-3 text-sm font-black disabled:opacity-50"
            >
              비밀번호 바꾸기
            </button>
          </form>
          {account.error && (
            <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
              {account.error}
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1728]">
          <LockerRoomScene className={`w-full ${greeter && !greeterMissing ? 'h-72 sm:h-80' : 'h-48 sm:h-56'}`} />
          {greeter && !greeterMissing && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assistantImage(greeter.id, greeter.mode, 'body')}
                alt={ASSISTANTS[greeter.id].name}
                onError={() => setGreeterMissing(true)}
                // The masters sit on a dark studio ground; a soft mask on the
                // left and top edges melts that ground into the locker room.
                className="pointer-events-none absolute bottom-0 right-0 h-full w-auto object-contain object-bottom [mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,transparent,black_20%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
              />
              <div className="absolute left-3 top-3 max-w-[58%] rounded-2xl rounded-tl-sm bg-slate-950/80 px-3 py-2 text-[11px] leading-relaxed text-slate-100 backdrop-blur">
                <div className="text-[10px] font-bold text-emerald-300">
                  {ASSISTANTS[greeter.id].name} · {ASSISTANTS[greeter.id].role}
                </div>
                {WELCOME_LINES[greeter.id]}
              </div>
            </>
          )}
        </div>
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
            {BRAND_NAME}
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
                    ? 'btn-primary'
                    : 'btn-ghost'
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
              className="mt-1 w-full rounded-lg input px-3 py-2.5 text-sm font-semibold"
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
              className="mt-1 w-full rounded-lg input px-3 py-2.5 text-sm font-semibold"
            />
          </label>

          <button
            type="submit"
            disabled={account.syncing}
            className="w-full rounded-xl btn-primary py-3 text-sm font-black transition disabled:opacity-50"
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

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void account.resetPassword(email.trim())}
            disabled={!email.trim() || account.syncing}
            className="flex-1 whitespace-nowrap rounded-lg btn-ghost px-2.5 py-2 text-[11px] font-bold disabled:opacity-40"
          >
            비밀번호 재설정
          </button>
          <button
            type="button"
            onClick={() => void account.resendConfirmation(email.trim())}
            disabled={!email.trim() || account.syncing}
            className="flex-1 whitespace-nowrap rounded-lg btn-ghost px-2.5 py-2 text-[11px] font-bold disabled:opacity-40"
          >
            확인 메일 다시 보내기
          </button>
          <button
            type="button"
            onClick={() => void runProbe()}
            disabled={probing}
            className="flex-1 whitespace-nowrap rounded-lg btn-ghost px-2.5 py-2 text-[11px] font-bold disabled:opacity-40"
          >
            {probing ? '확인 중...' : '서버 연결 확인'}
          </button>
        </div>

        {probe && (
          <p className="mt-2 break-words rounded-lg bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
            {probe}
          </p>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          진행 상황은 계정에 저장되어 어느 기기에서든 이어서 할 수 있습니다. 가입 확인 메일이 오면
          링크를 누른 뒤 로그인해 주세요.
        </p>
        <p className="mt-2 text-[11px] text-slate-700">
          빌드 {buildLabel()} · 주소 {configStatus().url ? '있음' : '없음'} · 키{' '}
          {configStatus().key ? '있음' : '없음'}
        </p>
      </div>
    </main>
  )
}
