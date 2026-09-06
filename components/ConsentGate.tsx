'use client'

import { useEffect, useState } from 'react'
import { PRIVACY_VERSION, TERMS_VERSION, agreeToTerms, consentCurrent, fetchMyConsent } from '../lib/legal'

/**
 * Asks a signed-in player to agree to the current 이용약관 and
 * 개인정보처리방침 once — on first sign-in, and again whenever a version
 * changes. Until they do, the game stays behind this sheet. The agreement is
 * recorded on the server with the versions agreed to.
 */
export default function ConsentGate({ signedIn }: { signedIn: boolean }) {
  const [needed, setNeeded] = useState(false)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signedIn) {
      setNeeded(false)
      return
    }
    let live = true
    void fetchMyConsent().then((consent) => {
      if (live) setNeeded(!consentCurrent(consent))
    })
    return () => {
      live = false
    }
  }, [signedIn])

  if (!needed) return null

  const agree = async () => {
    if (!terms || !privacy) return
    setBusy(true)
    const ok = await agreeToTerms()
    setBusy(false)
    if (!ok) {
      setError('동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    setNeeded(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <div className="rise-in w-full max-w-md panel-strong p-5 shadow-2xl" role="dialog" aria-modal="true">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">서비스 이용 동의</div>
        <h2 className="mt-1 text-lg font-black text-white">이용약관과 개인정보처리방침에 동의해 주세요</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          계속하려면 두 문서에 동의해야 합니다. 문서는 새 창에서 열리며, 동의한 버전과 시각이 계정에 기록됩니다. 내용이 바뀌면 다시 안내합니다.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} className="mt-1" />
          <span>
            <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-emerald-300 underline-offset-2 hover:underline">이용약관</a>에 동의합니다 (필수) <span className="text-[10px] text-slate-500">v{TERMS_VERSION}</span>
          </span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} className="mt-1" />
          <span>
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-emerald-300 underline-offset-2 hover:underline">개인정보처리방침</a>에 동의합니다 (필수) <span className="text-[10px] text-slate-500">v{PRIVACY_VERSION}</span>
          </span>
        </label>
        {error && <p className="mt-2 text-xs font-bold text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={() => void agree()}
          disabled={!terms || !privacy || busy}
          className="mt-4 w-full rounded-xl btn-primary py-2.5 text-sm font-black disabled:opacity-40"
        >
          {busy ? '저장 중…' : '동의하고 계속하기'}
        </button>
        <p className="mt-2 text-[11px] text-slate-500">동의하지 않으면 서비스를 이용할 수 없습니다. 계정을 지우려면 계정 창의 「계정 삭제」를 이용해 주세요.</p>
      </div>
    </div>
  )
}
