import OddsPage from '../../components/OddsPage'
import SiteHeader from '../../components/SiteHeader'

export const metadata = { title: '확률 안내' }

export default function Odds() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader active="odds" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <OddsPage />
      </div>
    </main>
  )
}
