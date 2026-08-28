import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Football Day — 축구 카드 매니저',
  description:
    '카드팩을 뽑고 스쿼드를 짜고 리그를 올라가는 축구 카드 수집 게임. 풋볼데이 스타일 클론.',
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
