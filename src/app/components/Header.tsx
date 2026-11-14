import { APP_NAME } from '@/app/site'

/** §3.1。題だけ（「設定」は計画 3）。画面の上に固定しない */
export function Header() {
  return (
    <header className="border-b border-line px-4 py-3">
      <h1 className="text-lg font-bold">{APP_NAME}</h1>
    </header>
  )
}
