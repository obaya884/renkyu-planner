import { T } from '@/app/texts'

/** §3.9。設定なしのとき、持ち分のカードの場所に置く。ボタンは M-3 を開く（Task 9） */
export function InviteCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-primary bg-primary-soft px-3 py-2">
      <div className="font-bold">{T.inviteTitle}</div>
      <p className="text-sm text-sub">{T.inviteBody}</p>
      <button type="button" onClick={onOpen} className="mt-2 min-h-11 rounded-md bg-primary px-4 text-sm font-bold text-white">
        {T.inviteButton}
      </button>
    </div>
  )
}
