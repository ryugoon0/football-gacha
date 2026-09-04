'use client'

import { useEffect, useState } from 'react'
import {
  loadAssistantMode,
  loadAssistantQuiet,
  saveAssistantMode,
  saveAssistantQuiet,
  type AssistantMode,
} from '../lib/assistant'
import { useAssistantHints } from '../lib/assistantHints'

/**
 * The assistant switches in the account panel — the same two choices the card
 * offers, reachable even when the card has been sent away with 「조용히」.
 */
export default function AssistantSettings() {
  const hints = useAssistantHints()
  const [mode, setMode] = useState<AssistantMode>('open')
  const [quiet, setQuiet] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setMode(loadAssistantMode())
    setQuiet(loadAssistantQuiet())
    setReady(true)
  }, [hints.settingsVersion])

  if (!ready) return null

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <h3 className="text-sm font-black text-white">AI 비서</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
        홈·스쿼드·경쟁 리그 화면에서 비서가 상황을 알려 줍니다. 이 브라우저에만 저장됩니다.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ['open', '기본'],
            ['safe', '건전'],
          ] as [AssistantMode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key)
              saveAssistantMode(key)
            }}
            className={`rounded-lg py-2 text-xs font-black transition ${
              mode === key ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            {label} 그림
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setQuiet(!quiet)
          saveAssistantQuiet(!quiet)
        }}
        className="mt-2 w-full rounded-lg btn-ghost py-2 text-xs font-bold"
      >
        {quiet ? '비서 다시 보기' : '비서 숨기기'}
      </button>
    </section>
  )
}
