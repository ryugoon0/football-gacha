import { OPERATOR, PRIVACY, PRIVACY_VERSION, TERMS, TERMS_VERSION, type LegalSection } from '../lib/legal'

/** One of the two legal texts, laid out for reading; the placeholders show until the operator fills them in. */
export default function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const sections: LegalSection[] = kind === 'terms' ? TERMS : PRIVACY
  const title = kind === 'terms' ? '이용약관' : '개인정보처리방침'
  const version = kind === 'terms' ? TERMS_VERSION : PRIVACY_VERSION
  return (
    <article className="space-y-5">
      <header>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Club Season</div>
        <h1 className="mt-1 text-2xl font-black text-white">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">시행일 {version} · 운영: {OPERATOR.name}</p>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="panel p-4">
          <h2 className="text-sm font-black text-slate-100">{section.title}</h2>
          <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-slate-300">
            {section.body.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </section>
      ))}
      <p className="text-[11px] text-slate-500">
        {kind === 'terms' ? <a href="/privacy" className="text-emerald-300 hover:underline">개인정보처리방침 보기</a> : <a href="/terms" className="text-emerald-300 hover:underline">이용약관 보기</a>}
        {' · '}
        <a href="/odds" className="text-emerald-300 hover:underline">확률 안내</a>
      </p>
    </article>
  )
}
