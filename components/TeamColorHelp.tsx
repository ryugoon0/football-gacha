'use client'

import { COLOR_CAPS, COLOR_LABELS, COLOR_TIERS, type ColorKind } from '../lib/teamColor'

/**
 * The team-colour rules in one place — testers asked for them spelled out
 * after working out by trial that two half-squads used to beat one full one.
 */
export default function TeamColorHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-4 text-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">팀 컬러 규칙</h3>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300">
            닫기
          </button>
        </div>

        <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
          <li>
            <b className="text-white">선발 11명만 봅니다.</b> 벤치와 부상으로 결장한 선수는 세지 않습니다.
          </li>
          <li>
            <b className="text-white">클럽 · 리그 · 국가 세 종류가 각각 따로 발동</b>하고, 셋은 서로 더해집니다.
            같은 클럽 11명은 자동으로 같은 리그 11명이기도 해서 클럽과 리그가 함께 붙습니다.
          </li>
          <li>
            <b className="text-white">같은 종류 안에서는 가장 큰 그룹 하나만 발동합니다.</b> 클럽 A 5명 + 클럽 B 5명이면
            A(또는 B) 5명 보너스 하나뿐입니다. 두 클럽을 섞어서 7명 보너스를 넘기는 길은 없습니다.
          </li>
          <li>
            <b className="text-white">더 많이 모을수록 단계가 오릅니다.</b> 클럽은 3·5·7·9·11명, 리그와 국가는 5·8·11명 단계입니다.
            한 종류 안에서 단계는 바뀌는 것이지 겹치지 않습니다(7명이면 7명 단계 하나).
          </li>
          <li>
            <b className="text-white">보너스는 전력(공격·미드·수비 각각)과 케미에 붙습니다.</b> 케미는 100이 상한이고, 포지션이
            맞는 선발(주 포지션 9점·부 포지션 6점 기준)과 특성 효과에 팀 컬러 케미가 더해집니다.
          </li>
          <li>
            합계 상한은 전력 +{COLOR_CAPS.rating} · 케미 +{COLOR_CAPS.chemistry}입니다. 같은 클럽·리그·국가 11명이 정확히 이
            값입니다.
          </li>
        </ol>

        <div className="mt-4 space-y-3">
          {(Object.keys(COLOR_TIERS) as ColorKind[]).map((kind) => (
            <div key={kind}>
              <div className="text-[11px] font-bold text-slate-400">{COLOR_LABELS[kind]}</div>
              <table className="mt-1 w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-0.5">인원</th>
                    <th className="py-0.5 text-right">전력</th>
                    <th className="py-0.5 text-right">케미</th>
                  </tr>
                </thead>
                <tbody>
                  {COLOR_TIERS[kind].map((tier) => (
                    <tr key={tier.count} className="border-t border-white/5">
                      <td className="py-0.5 tabular-nums">{tier.count}명</td>
                      <td className="py-0.5 text-right font-bold tabular-nums text-emerald-300">+{tier.rating}</td>
                      <td className="py-0.5 text-right font-bold tabular-nums text-sky-300">+{tier.chemistry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          예) 같은 클럽 7명 + 다른 클럽 4명 = 클럽 +8(7명 단계) 하나. 같은 클럽 11명 = 클럽 +14, 여기에 같은 리그 11명 +4,
          같은 국가면 +4가 더 붙습니다.
        </p>
      </div>
    </div>
  )
}
