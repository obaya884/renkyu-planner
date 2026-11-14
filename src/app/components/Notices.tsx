import { T } from '@/app/texts'

/** §3.11（N-08）と D-5。ヘッダーのすぐ下に 1 行ずつ出す */
export function Notices({ canSave, unreadable }: { canSave: boolean; unreadable: boolean }) {
  if (canSave && !unreadable) return null
  return (
    <div className="space-y-1">
      {!canSave && <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">{T.cannotSave}</p>}
      {unreadable && <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">{T.unreadable}</p>}
    </div>
  )
}
