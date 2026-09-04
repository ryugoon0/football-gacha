import CardDirectory from '../../components/CardDirectory'
import SiteHeader from '../../components/SiteHeader'

export default function CardsPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader active="cards" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><CardDirectory /></div>
    </main>
  )
}
