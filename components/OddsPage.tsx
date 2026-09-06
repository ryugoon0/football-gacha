'use client'

import { useEffect, useState } from 'react'
import { LIMITED_SCHEDULE, formatKst } from '../lib/limited'
import { PITY, exchangeRows, loadPublicOdds, oddsRows, packSummaries } from '../lib/odds'
import { RARITY_STYLES } from '../lib/rarity'

/**
 * 확률 안내 — the odds of every paid or gold-priced random draw, readable
 * without a login. This is the page the shop and the scout screen link to,
 * and the one the store listing points at.
 */
export default function OddsPage() {
  const [loaded, setLoaded] = useState<boolean | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void loadPublicOdds().then((ok) => {
      setLoaded(ok)
      setTick((n) => n + 1)
    })
  }, [])

  const rows = oddsRows()
  const packs = packSummaries()
  const exchange = exchangeRows()
  void tick

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">확률 안내</div>
        <h1 className="mt-1 text-2xl font-black text-white">스카우트 · 교환 확률</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          게임 안 모든 확률형 뽑기의 확률입니다. 뽑기는 서버가 아래 확률로 판정하며, 이 페이지는 지금 적용 중인 값을 그대로
          보여 줍니다. 값이 바뀌면 이 페이지와 게임 안 표시가 함께 바뀝니다.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {loaded === null ? '서버 값을 불러오는 중…' : loaded ? '서버에 저장된 현재 값입니다.' : '서버에 연결하지 못해 기본값을 보여 줍니다(서버도 같은 기본값으로 판정합니다).'}
        </p>
      </header>

      <section className="panel p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">등급별 확률 (한 장 기준)</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3">등급</th>
                <th className="py-1.5 pr-3 text-right">일반 스카우트</th>
                <th className="py-1.5 text-right">프리미엄 스카우트</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rarity} className="border-t border-white/5">
                  <td className="py-1.5 pr-3 font-bold">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${RARITY_STYLES[row.rarity].chip ?? 'bg-white/10 text-slate-100'}`}>{row.label}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-right font-black tabular-nums text-white">{row.basic}%</td>
                  <td className="py-1.5 text-right font-black tabular-nums text-white">{row.premium}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          같은 등급 안에서는 그 등급의 모든 현역 카드가 같은 확률로 나옵니다. 월드 카드는 프리미엄 스카우트에서만 나옵니다. 미공개·은퇴
          카드는 풀에 없습니다.
        </p>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">상품과 보장</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3">상품</th>
                <th className="py-1.5 pr-3 text-right">가격</th>
                <th className="py-1.5 pr-3 text-right">장수</th>
                <th className="py-1.5">보장</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr key={pack.id} className="border-t border-white/5">
                  <td className="py-1.5 pr-3 font-bold text-slate-100">{pack.name}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pack.cost.toLocaleString('ko-KR')}G</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pack.count}</td>
                  <td className="py-1.5 text-slate-300">{pack.guarantee ? `${pack.guarantee} 이상 1장 보장` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-slate-300">
          <li>
            <b className="text-white">천장</b>: {PITY.label} 이상이 나오지 않은 채 {PITY.limit}장째가 되면 그 장은 {PITY.label} 이상이 확정됩니다. 카운트는 일반·프리미엄을
            합쳐 세고, {PITY.label} 이상이 나오면 0으로 돌아갑니다.
          </li>
          <li>
            <b className="text-white">10연속 보장</b>: 10장 중 보장 등급 이상이 한 장도 없으면 한 장을 보장 등급 카드로 바꿉니다.
          </li>
          <li>
            <b className="text-white">이번 주 픽업</b>: 매주 정해진 픽업 선수가 있습니다. 그 선수와 같은 등급이 나올 때 절반 확률로 픽업 선수가 나옵니다(등급
            확률 자체는 위 표와 같습니다).
          </li>
          <li>
            <b className="text-white">리미티드 카드</b>: 기간 한정 카드가 열려 있으면 픽업 자리를 리미티드 카드가 차지합니다. 같은 등급이 나올 때 절반이 리미티드 카드
            중 한 장입니다. 기간이 끝나면 풀에서 빠지고 받은 카드는 남습니다.
            {LIMITED_SCHEDULE.length > 0 && (
              <span className="text-slate-500">
                {' '}
                (다음 일정: {LIMITED_SCHEDULE[0].label} · {formatKst(LIMITED_SCHEDULE[0].from)} ~ {formatKst(LIMITED_SCHEDULE[0].to)})
              </span>
            )}
          </li>
          <li>
            <b className="text-white">프리미엄 스카우트 티켓</b>: 티켓 1장은 프리미엄 스카우트 1회와 같은 확률·같은 규칙입니다. 상점에서 팔지 않고 선물·보상으로만 받습니다.
          </li>
          <li>
            <b className="text-white">무료 스카우트</b>: 하루 한 번 무료 일반 스카우트는 유료와 같은 확률입니다.
          </li>
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">조각 교환 (등급 확정)</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
          조각은 카드를 방출하면 얻습니다. 교환은 등급이 확정되고, 그 등급 안에서 어떤 선수가 나올지는 같은 확률입니다.
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3">등급</th>
                <th className="py-1.5 text-right">조각</th>
              </tr>
            </thead>
            <tbody>
              {exchange.map((row) => (
                <tr key={row.rarity} className="border-t border-white/5">
                  <td className="py-1.5 pr-3 font-bold text-slate-100">{row.label} 확정</td>
                  <td className="py-1.5 text-right tabular-nums">{row.cost.toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">그 밖의 무작위 요소</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slate-300">
          <li>경기 결과는 카드 능력치·전술·컨디션에 시드 난수를 더해 서버가 판정합니다. 구매로 결과를 바꿀 수 없습니다.</li>
          <li>경쟁 리그·이벤트·선물로 받는 카드와 골드는 확률이 아니라 정해진 보상입니다.</li>
          <li>승급 합성은 현재 유저 화면에서 제공하지 않습니다.</li>
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">문의: support@clubseason.kr 또는 게임 안 게시판.</p>
      </section>
    </div>
  )
}
