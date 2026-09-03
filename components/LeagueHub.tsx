import Image from 'next/image'
import Link from 'next/link'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'
import PublicClubDirectory from './PublicClubDirectory'

const FEATURES = [
  { value: '20', label: '클럽이 겨루는 리그' },
  { value: '5', label: '승강제가 있는 디비전' },
  { value: 'LIVE', label: '실시간 매치데이 준비 중' },
]

export default function LeagueHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">SEASON HUB · PRESEASON</p>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl">
              내 클럽의 한 시즌이
              <span className="block text-emerald-300">리그의 기록이 됩니다.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">{BRAND_NAME}은 스쿼드를 만들고, 경기를 준비하고, 같은 리그의 감독들과 시즌을 쌓아 가는 축구 클럽 매니저입니다. {BRAND_TAGLINE}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/game" className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">감독실 열기</Link>
              <Link href="/cards" className="rounded-lg border border-white/15 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:bg-white/5">선수 도감 보기</Link>
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden border border-white/10 bg-slate-900/70 lg:aspect-[16/10]">
            <Image
              src="/images/club-season-locker-room.png"
              alt="경기 전 전술판과 유니폼이 준비된 클럽 라커룸"
              fill
              priority
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/85 p-5 backdrop-blur-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">NEXT MILESTONE</p>
                  <p className="mt-1 text-lg font-black text-white">실유저 리그 매칭</p>
                </div>
                <span className="border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-200">시즌 준비</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">실시간 일정, 서버 판정 경기, 리그 전체 개인 타이틀을 순서대로 연결합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-3 border-x border-white/10">
        {FEATURES.map((item) => (
          <div key={item.label} className="border-b border-r border-white/10 px-4 py-5 last:border-r-0 sm:px-6 sm:py-7">
            <div className="text-xl font-black text-emerald-300 sm:text-2xl">{item.value}</div>
            <div className="mt-1 text-[11px] font-semibold leading-tight text-slate-500 sm:text-xs">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">SCOUTING BOARD</p>
              <h2 className="mt-1 text-2xl font-black text-white">공개 스쿼드</h2>
            </div>
            <Link href="/clubs" className="shrink-0 text-sm font-bold text-emerald-300 hover:text-emerald-200">전체 보기</Link>
          </div>
          <div className="mt-4"><PublicClubDirectory compact /></div>
        </div>

        <div className="border border-white/10 bg-slate-900/55 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">SEASON DESK</p>
          <h2 className="mt-2 text-xl font-black text-white">이번 시즌의 준비</h2>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="border-l-2 border-emerald-400 pl-3 text-slate-300"><strong className="block text-white">경기 판정 서버화</strong><span className="text-xs text-slate-500">경기 결과와 보상을 서버가 확정합니다.</span></li>
            <li className="border-l-2 border-sky-400 pl-3 text-slate-300"><strong className="block text-white">동일 리그 실유저 매칭</strong><span className="text-xs text-slate-500">20팀 리그에 유저와 AI가 함께 편성됩니다.</span></li>
            <li className="border-l-2 border-amber-400 pl-3 text-slate-300"><strong className="block text-white">개인 타이틀</strong><span className="text-xs text-slate-500">득점왕, 도움왕, 베스트11이 시즌 기록으로 남습니다.</span></li>
          </ul>
        </div>
      </section>
    </main>
  )
}
