import PublicClubDirectory from '../../components/PublicClubDirectory'
import SiteHeader from '../../components/SiteHeader'

export default function ClubsPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader active="clubs" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="border-b border-white/10 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">SCOUTING BOARD</p>
          <h1 className="mt-2 text-3xl font-black text-white">같은 리그의 타 클럽 스쿼드</h1>
          <p className="mt-2 text-sm text-slate-400">
            리그(디비전)를 골라 그 등급에서 감독들이 공개한 선발 명단과 벤치를 살펴보세요. 아직 리그가
            실제 상대와 매칭되지 않아, 이번 시즌 진짜 대진 상대가 아니라 같은 등급의 다른 감독들을
            보여줍니다.
          </p>
        </section>
        <div className="mt-6"><PublicClubDirectory /></div>
      </div>
    </main>
  )
}
