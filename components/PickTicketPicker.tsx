'use client'

import { useMemo, useState } from 'react'
import { ITEMS, type ItemId } from '../lib/items'
import { pickCandidates } from '../lib/pickTicket'
import PlayerCard from './PlayerCard'

/**
 * The list a 스카우트 지정권 chooses from: every eligible card, narrowed by a
 * name or club search, one tap to pick and a confirm before the ticket goes.
 */
export default function PickTicketPicker({ id, onPick }: { id: ItemId; onPick: (playerId: string) => void }) {
  const [query, setQuery] = useState('')
  const candidates = useMemo(() => pickCandidates(id), [id])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? candidates.filter((p) => p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)) : candidates
    return [...list].sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name, 'ko'))
  }, [candidates, query])

  if (candidates.length === 0) {
    return <p className="mt-3 text-[11px] font-semibold text-amber-300">지금 고를 수 있는 카드가 없습니다. 첫 리미티드가 열리면 쓸 수 있습니다.</p>
  }
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="선수·클럽 이름으로 찾기"
          className="min-w-0 flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-100 outline-none"
        />
        <span className="text-[11px] text-slate-500">{shown.length} / {candidates.length}장</span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">카드를 누르면 확인 뒤 {ITEMS[id].name} 1장을 쓰고 그 선수를 받습니다.</p>
      <div className="mt-2 flex max-h-[420px] flex-wrap gap-1.5 overflow-y-auto pr-1">
        {shown.map((player) => (
          <button
            key={player.id}
            onClick={() => {
              if (window.confirm(`${player.name}(${player.club}, ${player.position} ${player.ovr})을(를) 받을까요? ${ITEMS[id].name} 1장을 씁니다.`)) onPick(player.id)
            }}
            title={`${player.club} · ${player.position} ${player.ovr}`}
          >
            <PlayerCard player={player} size="sm" />
          </button>
        ))}
      </div>
    </div>
  )
}
