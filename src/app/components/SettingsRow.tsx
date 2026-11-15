import type { ReactNode } from 'react'
import { T } from '@/app/texts'

/** §6 の行の共通の形。高さ 44px 以上。行のあいだに線を引く */
export const ROW_CLASS = 'flex min-h-11 w-full flex-wrap items-center gap-x-3 border-b border-line py-2 text-left'

/** §6: 押すとモーダルが開く行。右端に「›」を出す */
export function TapRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {children}
      <span aria-hidden="true" className="ml-auto text-sub">
        {T.rowChevron}
      </span>
    </button>
  )
}
