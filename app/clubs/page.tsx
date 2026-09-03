import PublicClubDirectory from '../../components/PublicClubDirectory'
import SiteHeader from '../../components/SiteHeader'

export default function ClubsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader active="clubs" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="border-b border-white/10 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">SCOUTING BOARD</p>
          <h1 className="mt-2 text-3xl font-black text-white">공개 스쿼드</h1>
          <p className="mt-2 text-sm text-slate-400">감독이 공개한 선발 명단과 벤치를 살펴보고, 다가올 리그를 준비하세요.</p>
        </section>
        <div className="mt-6"><PublicClubDirectory /></div>
      </div>
    </main>
  )
}
