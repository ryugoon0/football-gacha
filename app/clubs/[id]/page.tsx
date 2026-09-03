import PublicSquadProfile from '../../../components/PublicSquadProfile'
import SiteHeader from '../../../components/SiteHeader'

export default function ClubProfilePage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader active="clubs" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><PublicSquadProfile clubId={params.id} /></div>
    </main>
  )
}
