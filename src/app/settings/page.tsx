import Link from 'next/link'
import holidays from '@/data/holidays.json'
import { HolidayAbout } from '@/app/components/HolidayAbout'
import { T } from '@/app/texts'
import { SettingsScreen } from './SettingsScreen'

export const metadata = { title: T.settingsPageTitle, robots: { index: false } }

/** 設定画面（S-2、画面定義書 §6）。「祝日について」はサーバーで描き、HTML に入れる */
export default function SettingsPage() {
  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/" className="inline-flex min-h-11 items-center text-primary">
          {T.backToMain}
        </Link>
        <h1 className="text-lg font-bold">{T.settings}</h1>
      </header>
      <main className="mx-auto max-w-[640px] space-y-6 px-4 py-4">
        <SettingsScreen holidays={holidays} />
        <HolidayAbout confirmedUntil={holidays.confirmedUntil} />
      </main>
    </>
  )
}
