import Link from 'next/link'
import SiteHeader from '../../components/SiteHeader'

export default function NewsPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader active="league" />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">CLUB BULLETIN</p>
        <h1 className="mt-2 text-3xl font-black text-white">시즌 소식</h1>
        <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
          <article className="py-5"><p className="text-xs font-bold text-emerald-300">개발 소식</p><h2 className="mt-1 text-lg font-black text-white">공개 리그센터와 스카우트 보드가 열렸습니다</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">선수 도감 검색과 공개 동의 기반 스쿼드 열람을 먼저 제공하고, 이후 서버 리그 일정과 실제 순위를 연결합니다.</p></article>
          <article className="py-5"><p className="text-xs font-bold text-amber-300">시즌 준비</p><h2 className="mt-1 text-lg font-black text-white">실유저 리그 매칭을 준비하고 있습니다</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">경기 결과를 서버가 확정한 뒤, 같은 리그의 감독들과 경쟁하는 시즌제를 도입합니다.</p></article>
        </div>
        <Link href="/game" className="mt-8 inline-block rounded-lg btn-primary px-4 py-2.5 text-sm font-black">감독실로 이동</Link>
      </div>
    </main>
  )
}
