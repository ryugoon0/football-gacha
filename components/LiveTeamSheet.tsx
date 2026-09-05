'use client'

import type { LiveSheetSlot, LiveSheetView, LiveSheets, LiveSide } from '../lib/weeklyLive'

/**
 * Both elevens side by side as the match stands: bookings, legs, goals and
 * assists, and each player's running mark. The same sheet is shown to both
 * managers and to anyone watching — nothing on it is private.
 */
export default function LiveTeamSheet({
  sheets,
  home,
  away,
  mySide,
}: {
  sheets: LiveSheets
  home: string
  away: string
  mySide: LiveSide | null
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className="grid grid-cols-2 gap-2">
        <SheetColumn title={home} sheet={sheets.home} mine={mySide === 'home'} accent="text-emerald-300" />
        <SheetColumn title={away} sheet={sheets.away} mine={mySide === 'away'} accent="text-slate-200" />
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        ⚽ 골 · <span className="font-black text-sky-300">A</span> 도움 ·{' '}
        <span className="inline-block h-2.5 w-1.5 translate-y-[1px] rounded-[2px] bg-amber-400" /> 경고 ·{' '}
        <span className="inline-block h-2.5 w-1.5 translate-y-[1px] rounded-[2px] bg-rose-500" /> 퇴장 · 막대 체력 · 숫자 평점
      </p>
    </div>
  )
}

function SheetColumn({ title, sheet, mine, accent }: { title: string; sheet: LiveSheetView; mine: boolean; accent: string }) {
  return (
    <div className="min-w-0">
      <div className={`flex items-center gap-1 truncate text-[11px] font-black ${accent}`}>
        <span className="truncate">{title}</span>
        {mine && <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] font-bold text-slate-300">내 팀</span>}
      </div>
      <div className="mt-1 space-y-0.5">
        {sheet.slots.map((slot) => (
          <SheetRow key={slot.slotId} slot={slot} />
        ))}
      </div>
      {sheet.bench.length > 0 && (
        <p className="mt-1 truncate text-[10px] text-slate-500" title={sheet.bench.map((player) => player.name).join(', ')}>
          후보 {sheet.bench.map((player) => player.name).join(' · ')}
        </p>
      )}
    </div>
  )
}

function SheetRow({ slot }: { slot: LiveSheetSlot }) {
  const stamina = slot.stamina
  const staminaTone = stamina === null ? '' : stamina >= 60 ? 'bg-emerald-400' : stamina >= 35 ? 'bg-amber-400' : 'bg-rose-500'
  const rating = slot.rating
  const ratingTone = rating === null ? '' : rating >= 8 ? 'text-emerald-300' : rating >= 6.5 ? 'text-slate-200' : 'text-rose-300'
  return (
    <div className="flex items-center gap-1 text-[11px] leading-5">
      <span className="w-6 shrink-0 text-[9px] font-black text-slate-500">{slot.position}</span>
      <span className={`min-w-0 flex-1 truncate ${slot.red ? 'text-slate-500 line-through' : 'text-slate-200'}`} title={slot.name}>
        {slot.name}
      </span>
      {slot.goals > 0 && (
        <span className="shrink-0 text-[10px] text-emerald-300" title={`${slot.goals}골`}>
          ⚽{slot.goals > 1 ? slot.goals : ''}
        </span>
      )}
      {slot.assists > 0 && (
        <span className="shrink-0 text-[10px] font-black text-sky-300" title={`도움 ${slot.assists}`}>
          A{slot.assists > 1 ? slot.assists : ''}
        </span>
      )}
      {Array.from({ length: Math.min(2, slot.yellows) }).map((_, index) => (
        <span key={index} className="h-3 w-1.5 shrink-0 rounded-[2px] bg-amber-400" title="경고" />
      ))}
      {slot.red && <span className="h-3 w-1.5 shrink-0 rounded-[2px] bg-rose-500" title="퇴장" />}
      {stamina !== null && (
        <span className="h-1.5 w-7 shrink-0 overflow-hidden rounded-full bg-white/10" title={`체력 ${Math.round(stamina)}`}>
          <span className={`block h-full ${staminaTone}`} style={{ width: `${Math.max(4, Math.min(100, stamina))}%` }} />
        </span>
      )}
      {rating !== null && (
        <span className={`w-6 shrink-0 text-right text-[10px] font-black tabular-nums ${ratingTone}`} title="현재 평점">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
