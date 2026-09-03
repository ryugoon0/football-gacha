'use client'

import { useMemo, useState } from 'react'
import { CLUBS, LEAGUES, PLAYERS } from '../lib/players'
import { RARITIES, RARITY_STYLES } from '../lib/rarity'
import type { PlayerDef, Position, Rarity } from '../lib/types'
import PlayerCard from './PlayerCard'

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST']
const PAGE_SIZE = 48

type SelectValue<T extends string> = T | 'all'

export default function CardDirectory() {
  const [query, setQuery] = useState('')
  const [club, setClub] = useState<SelectValue<string>>('all')
  const [league, setLeague] = useState<SelectValue<string>>('all')
  const [nation, setNation] = useState<SelectValue<string>>('all')
  const [rarity, setRarity] = useState<SelectValue<Rarity>>('all')
  const [position, setPosition] = useState<SelectValue<Position>>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const nations = useMemo(
    () => Array.from(new Set(PLAYERS.map((player) => player.nation))).sort((a, b) => a.localeCompare(b, 'ko')),
    [],
  )
  const clubs = useMemo(() => CLUBS.map((item) => item.name).sort((a, b) => a.localeCompare(b, 'ko')), [])

  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ko-KR')
    return PLAYERS.filter((player) => {
      if (term && !`${player.name} ${player.club} ${player.nation}`.toLocaleLowerCase('ko-KR').includes(term)) return false
      if (club !== 'all' && player.club !== club) return false
      if (league !== 'all' && player.league !== league) return false
      if (nation !== 'all' && player.nation !== nation) return false
      if (rarity !== 'all' && player.rarity !== rarity) return false
      if (position !== 'all' && !player.positions.includes(position)) return false
      return true
    }).sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name, 'ko'))
  }, [club, league, nation, position, query, rarity])

  const reset = () => {
    setQuery('')
    setClub('all')
    setLeague('all')
    setNation('all')
    setRarity('all')
    setPosition('all')
    setLimit(PAGE_SIZE)
  }

  const update = <T extends string>(setter: (value: SelectValue<T>) => void, value: string) => {
    setter(value as SelectValue<T>)
    setLimit(PAGE_SIZE)
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">PLAYER ARCHIVE</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">선수 도감</h1>
            <p className="mt-2 text-sm text-slate-400">팀, 포지션, 등급, 리그, 국가로 전체 로스터를 탐색합니다.</p>
          </div>
          <p className="text-right text-sm font-bold text-emerald-300">{matches.length.toLocaleString()}명</p>
        </div>
      </section>

      <section className="border border-white/10 bg-slate-900/65 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="md:col-span-3">
            <span className="sr-only">선수, 팀, 국가 검색</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setLimit(PAGE_SIZE)
              }}
              placeholder="선수명 · 소속 팀 · 국가 검색"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            />
          </label>
          <Filter label="등급" value={rarity} onChange={(value) => update<Rarity>(setRarity, value)}>
            <option value="all">전체 등급</option>
            {RARITIES.map((item) => <option key={item} value={item}>{RARITY_STYLES[item].label}</option>)}
          </Filter>
          <Filter label="포지션" value={position} onChange={(value) => update<Position>(setPosition, value)}>
            <option value="all">전체 포지션</option>
            {POSITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </Filter>
          <Filter label="리그" value={league} onChange={(value) => update<string>(setLeague, value)}>
            <option value="all">전체 리그</option>
            {LEAGUES.map((item) => <option key={item} value={item}>{item}</option>)}
          </Filter>
          <Filter label="팀" value={club} onChange={(value) => update<string>(setClub, value)}>
            <option value="all">전체 팀</option>
            {clubs.map((item) => <option key={item} value={item}>{item}</option>)}
          </Filter>
          <Filter label="국가" value={nation} onChange={(value) => update<string>(setNation, value)}>
            <option value="all">전체 국가</option>
            {nations.map((item) => <option key={item} value={item}>{item}</option>)}
          </Filter>
          <div className="flex items-end">
            <button onClick={reset} className="h-11 w-full rounded-lg bg-white/5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
              필터 초기화
            </button>
          </div>
        </div>
      </section>

      {matches.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {matches.slice(0, limit).map((player) => <DirectoryCard key={player.id} player={player} />)}
          </div>
          {limit < matches.length && (
            <div className="flex justify-center pt-2">
              <button onClick={() => setLimit((current) => current + PAGE_SIZE)} className="rounded-lg bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10">
                선수 더 보기 · {Math.min(PAGE_SIZE, matches.length - limit)}명
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="border-y border-white/10 py-16 text-center text-sm text-slate-500">조건에 맞는 선수가 없습니다.</div>
      )}
    </div>
  )
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-emerald-400">
        {children}
      </select>
    </label>
  )
}

function DirectoryCard({ player }: { player: PlayerDef }) {
  return <PlayerCard player={player} level={1} size="sm" className="w-full" />
}
