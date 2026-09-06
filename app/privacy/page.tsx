import LegalDocument from '../../components/LegalDocument'
import SiteHeader from '../../components/SiteHeader'

export const metadata = { title: '개인정보처리방침' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LegalDocument kind="privacy" />
      </div>
    </main>
  )
}
