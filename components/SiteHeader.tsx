import Link from 'next/link'
import { BRAND_MARK, BRAND_NAME } from '../lib/brand'

type Section = 'home' | 'league' | 'cards' | 'clubs'

const LINKS: { href: string; label: string; section: Section }[] = [
  { href: '/', label: '리그센터', section: 'home' },
  { href: '/clubs', label: '스카우트', section: 'clubs' },
  { href: '/cards', label: '선수 도감', section: 'cards' },
  { href: '/news', label: '소식', section: 'league' },
]

export default function SiteHeader({ active = 'home' }: { active?: Section }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-5 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${BRAND_NAME} 홈`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg btn-primary text-xs font-black">
            {BRAND_MARK}
          </span>
          <span className="hidden text-sm font-black tracking-wide text-white sm:block">{BRAND_NAME}</span>
        </Link>

        <nav className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 border-b-2 px-2.5 py-5 text-xs font-bold transition sm:px-3 sm:text-sm ${
                active === item.section
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/game"
          className="shrink-0 rounded-lg btn-primary px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm"
        >
          게임 시작
        </Link>
      </div>
    </header>
  )
}
