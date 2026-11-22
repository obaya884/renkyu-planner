import type { Metadata, Viewport } from 'next'
import { APP_THEME_COLOR } from './appIcon'
import { APP_DESCRIPTION, APP_NAME, APP_TITLE } from './site'
import './globals.css'

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  // 試作: ホーム画面に追加したとき（iOS）の名前と、アドレスの欄の無い表示
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
}

// 試作: ホーム画面のアプリの上の帯の色
export const viewport: Viewport = { themeColor: APP_THEME_COLOR }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
