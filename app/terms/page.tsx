import LegalDocument from '../../components/LegalDocument'
import SiteHeader from '../../components/SiteHeader'

export const metadata = { title: '이용약관' }

export default function TermsPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LegalDocument kind="terms" />
      </div>
    </main>
  )
}
