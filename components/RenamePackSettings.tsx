'use client'

import { useRef, useState } from 'react'
import {
  clearRenamePack,
  importRenamePack,
  renamePackCounts,
  renamePackTemplateCsv,
  useRenamePackVersion,
  type RenameParseReport,
} from '../lib/renamePack'

/**
 * 「리네임팩」 — the manager's own names for players and clubs, on this
 * device only. A CSV/TSV/JSON file decides the names; a template with every
 * current name can be downloaded and filled in.
 */
export default function RenamePackSettings() {
  useRenamePackVersion()
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<RenameParseReport | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const counts = renamePackCounts()

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      let last: RenameParseReport | null = null
      for (const file of Array.from(files)) last = await importRenamePack(file)
      setReport(last)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([renamePackTemplateCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'renamepack-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white">리네임팩</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            선수 이름과 클럽 이름을 내가 정한 대로 바꿔 보입니다. 이 기기에만 저장되고 서버에는 올라가지 않으며, 다른
            감독에게는 보이지 않습니다. 「이름표 CSV」를 내려받아 <code className="text-slate-300">new</code> 칸만
            채워 다시 불러오면 됩니다. 한 줄씩 <code className="text-slate-300">카드id,새 이름</code> 또는{' '}
            <code className="text-slate-300">원래 클럽명,새 클럭명</code>으로 써도 읽힙니다. 경쟁 리그 기록처럼 서버가
            적어 둔 이름은 바뀌지 않습니다.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-slate-400">
          선수 {counts.players} · 클럽 {counts.clubs}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,.json,text/csv,text/plain,application/json"
        multiple
        hidden
        onChange={(event) => void onFiles(event.target.files)}
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="rounded-lg btn-primary py-2 text-xs font-black disabled:opacity-40"
        >
          {busy ? '불러오는 중…' : 'CSV·JSON 불러오기'}
        </button>
        <button type="button" onClick={downloadTemplate} className="rounded-lg btn-ghost py-2 text-xs font-bold">
          이름표 CSV 내려받기
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('리네임팩을 모두 지우고 원래 이름으로 돌릴까요? 이 기기에서만 지워집니다.')) {
              clearRenamePack()
              setReport(null)
            }
          }}
          disabled={busy || counts.players + counts.clubs === 0}
          className="rounded-lg btn-ghost py-2 text-xs font-bold disabled:opacity-40"
        >
          모두 지우기
        </button>
      </div>
      {report && (
        <div className="mt-2 space-y-1 text-[11px]">
          <p className="text-emerald-300">
            적용: 선수 {report.players}명 · 클럽 {report.clubs}개
          </p>
          {report.unmatched.length > 0 && (
            <p className="text-amber-300">
              찾지 못함 {report.unmatched.length}줄: {report.unmatched.slice(0, 5).join(', ')}
              {report.unmatched.length > 5 ? ' …' : ''}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
