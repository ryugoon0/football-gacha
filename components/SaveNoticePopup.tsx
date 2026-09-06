'use client'

import { useGame } from './GameProvider'

/**
 * A note the save itself carries (GameState.notice) — set when a load had to
 * change the collection (level caps after the 2026-09-07 regrade) and shown
 * once, on top of everything, until the manager closes it.
 */
export default function SaveNoticePopup() {
  const { state, dismissNotice } = useGame()
  const notice = state.notice
  if (!notice) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={dismissNotice}>
      <div
        className="panel max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">안내</div>
        <h3 className="mt-1 text-base font-black text-white">{notice.title}</h3>
        {typeof notice.gold === 'number' && notice.gold > 0 && (
          <div className="mt-2 text-sm text-slate-200">
            보상 <b className="text-amber-200">+{notice.gold.toLocaleString('ko-KR')}G</b> — 이미 지갑에 들어 있습니다.
          </div>
        )}
        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
          {notice.lines.map((line, index) => (
            <li key={index} className={index === 0 ? 'leading-relaxed text-slate-200' : 'rounded bg-white/5 px-2 py-1'}>
              {line}
            </li>
          ))}
        </ul>
        <button onClick={dismissNotice} className="mt-4 w-full rounded-lg btn-primary py-2 text-sm font-black">
          확인
        </button>
      </div>
    </div>
  )
}
