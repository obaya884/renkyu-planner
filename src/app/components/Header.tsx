import Link from 'next/link'
import { APP_NAME } from '@/app/site'
import { T } from '@/app/texts'

/** §3.1。題と、右端の「設定」（S-2 へ）。画面の上に固定しない */
export function Header() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <h1 className="text-lg font-bold">{APP_NAME}</h1>
      <Link href="/settings" className="inline-flex min-h-11 items-center text-primary">
        {T.settings}
      </Link>
    </header>
  )
}
