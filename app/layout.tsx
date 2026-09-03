import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { BRAND_NAME } from '../lib/brand'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${BRAND_NAME} — 축구 클럽 매니저`,
  description:
    '스쿼드를 만들고 리그를 오르며 같은 시즌을 함께하는 축구 클럽 매니저.',
}

export const viewport: Viewport = {
  themeColor: '#070d16',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}
