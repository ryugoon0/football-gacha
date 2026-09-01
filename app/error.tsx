'use client'

import { useEffect } from 'react'
import { SAVE_KEY } from '../lib/storage'

/**
 * Last line of defence. If anything throws while rendering — a save this build
 * cannot read, a browser quirk — the player still gets a screen with a way out
 * instead of a blank page they cannot recover from.
 */
export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('football-day render error', error)
  }, [error])

  const clearSave = () => {
    try {
      window.localStorage.removeItem(SAVE_KEY)
    } catch {
      // Storage may be blocked; reloading is still worth a try.
    }
    window.location.reload()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
        <h1 className="text-lg font-black text-white">화면을 그리다 문제가 생겼습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          먼저 다시 시도해 보세요. 그래도 같은 화면이 나오면 저장된 진행 상황이 손상된 것이라,
          아래 버튼으로 이 브라우저의 세이브를 지우면 다시 시작할 수 있습니다.
        </p>
        <button
          onClick={reset}
          className="mt-4 w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-black text-slate-900 transition hover:bg-emerald-300"
        >
          다시 시도
        </button>
        <button
          onClick={clearSave}
          className="mt-2 w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
        >
          세이브 지우고 새로 시작
        </button>
        {error.digest && <p className="mt-3 text-[11px] text-slate-600">오류 코드 {error.digest}</p>}
      </div>
    </main>
  )
}
