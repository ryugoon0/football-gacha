'use client'

import { useCallback, useEffect, useState } from 'react'
import { SIGNAL_LABELS, riskOf, type WatchRow } from '../../lib/monitor'
import { friendlyError, getSupabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/board'
import { buildLabel } from '../../lib/build'
import { probeDrawServer } from '../../lib/serverDraw'

interface Health {
  saves_24h?: number
  rejects_24h?: number
  flags_24h?: number
  players_24h?: number
  watchlist?: number
  watchlist_multi?: number
  posts_24h?: number
}

const RISK_TONE: Record<string, string> = {
  high: 'border-rose-500/50 bg-rose-500/10',
  medium: 'border-amber-400/40 bg-amber-400/10',
  low: 'border-white/10 bg-white/5',
}

const RISK_LABEL: Record<string, string> = { high: '높음', medium: '중간', low: '낮음' }

function Stat({ label, value, tone = '' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/5 px-3 py-2">
      <div className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`text-lg font-black tabular-nums ${tone || 'text-slate-100'}`}>{value}</div>
    </div>
  )
}

export default function MonitorPanel() {
  const [rows, setRows] = useState<WatchRow[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [probe, setProbe] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [list, stats] = await Promise.all([
      supabase.rpc('watchlist_for_admin'),
      supabase.rpc('health_for_admin'),
    ])
    setLoading(false)
    if (list.error) {
      setError(friendlyError(list.error.message))
      return
    }
    setError(null)
    setRows((list.data ?? []) as WatchRow[])
    setHealth((stats.data ?? {}) as Health)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">모니터링</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            서로 다른 신호가 겹치는 계정이 위로 올라옵니다.
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">보고 계신 빌드 {buildLabel()}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={async () => {
              setProbing(true)
              setProbe(await probeDrawServer())
              setProbing(false)
            }}
            disabled={probing}
            className="whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 disabled:opacity-40"
          >
            {probing ? '확인 중...' : '뽑기 서버 점검'}
          </button>
          <button
            onClick={() => void load()}
            className="whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white"
          >
            새로고침
          </button>
        </div>
      </div>

      {health && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Stat label="24h 접속" value={health.players_24h ?? 0} />
          <Stat label="24h 저장" value={health.saves_24h ?? 0} />
          <Stat
            label="24h 거부"
            value={health.rejects_24h ?? 0}
            tone={(health.rejects_24h ?? 0) > 0 ? 'text-rose-300' : ''}
          />
          <Stat
            label="신호 2개 이상"
            value={health.watchlist_multi ?? 0}
            tone={(health.watchlist_multi ?? 0) > 0 ? 'text-amber-300' : ''}
          />
        </div>
      )}

      {probe && (
        <p className="mt-3 break-words rounded-lg bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
          뽑기 서버: {probe}
        </p>
      )}

      {error && <p className="mt-3 text-[11px] font-semibold text-rose-400">{error}</p>}

      {loading ? (
        <p className="mt-3 text-[11px] text-slate-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate-500">
          걸린 계정이 없습니다. 신호가 잡히면 여기에 나타납니다.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((row) => {
            const risk = riskOf(row)
            return (
              <li
                key={row.user_id}
                className={`rounded-xl border p-2.5 ${RISK_TONE[risk] ?? RISK_TONE.low}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black ${
                      risk === 'high'
                        ? 'bg-rose-500 text-white'
                        : risk === 'medium'
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-white/15 text-slate-300'
                    }`}
                  >
                    위험 {RISK_LABEL[risk]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-100">
                    {row.email ?? row.user_id}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-slate-500">
                    {row.last_at ? timeAgo(row.last_at) : ''}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(row.kinds ?? []).map((kind) => (
                    <span
                      key={kind}
                      className="whitespace-nowrap rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-slate-300"
                    >
                      {SIGNAL_LABELS[kind] ?? kind}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{row.detail}</p>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        한 가지 신호는 우연일 수 있습니다. 조치하기 전에 감사 기록(save_audit)에서 그 계정의
        흐름을 직접 확인하세요.
      </p>
    </section>
  )
}
