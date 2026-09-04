'use client'

import { useRef, useState } from 'react'
import { clearFacepack, facepackCount, facepackTemplateCsv, importFacepack, useFace, type ImportReport } from '../lib/facepack'

/**
 * 「페이스팩」 — pictures the manager keeps for cards, on this device only.
 * Import loose images or a zip; file names decide which card each one is for.
 */
export default function FacepackSettings() {
  // Subscribing to any card keeps the count fresh after an import.
  useFace('__count__')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const count = facepackCount()

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      setReport(await importFacepack(Array.from(files)))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([facepackTemplateCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'facepack-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white">페이스팩</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            내가 고른 사진을 선수 카드에 씁니다. 이 기기에만 저장되고 서버에는 올라가지 않으며, 다른
            감독에게는 보이지 않습니다. 파일명은 카드 id·선수명·초상 키 중 하나로 맞춥니다(예:{' '}
            <code className="text-slate-300">lg457.png</code>, <code className="text-slate-300">세네 라멘츠.jpg</code>).
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-slate-400">{count}장</span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,.zip"
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
          {busy ? '불러오는 중…' : '이미지·zip 불러오기'}
        </button>
        <button type="button" onClick={downloadTemplate} className="rounded-lg btn-ghost py-2 text-xs font-bold">
          이름표 CSV 내려받기
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('페이스팩을 모두 지울까요? 이 기기에서만 지워집니다.')) void clearFacepack().then(() => setReport(null))
          }}
          disabled={busy || count === 0}
          className="rounded-lg btn-ghost py-2 text-xs font-bold disabled:opacity-40"
        >
          모두 지우기
        </button>
      </div>
      {report && (
        <div className="mt-2 space-y-1 text-[11px]">
          {report.applied.length > 0 && (
            <p className="text-emerald-300">
              적용 {report.applied.length}장: {report.applied.slice(0, 8).map((a) => a.name).join(', ')}
              {report.applied.length > 8 ? ' …' : ''}
            </p>
          )}
          {report.unmatched.length > 0 && (
            <p className="text-amber-300">
              카드를 못 찾음 {report.unmatched.length}개: {report.unmatched.slice(0, 5).join(', ')}
              {report.unmatched.length > 5 ? ' …' : ''}
            </p>
          )}
          {report.failed.length > 0 && <p className="text-rose-300">읽지 못함 {report.failed.length}개</p>}
        </div>
      )}
    </section>
  )
}
