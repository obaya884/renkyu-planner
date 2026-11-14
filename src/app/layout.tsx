import type { Metadata } from 'next'
import { APP_DESCRIPTION, APP_TITLE } from './site'
import './globals.css'

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
}

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
