import { unassignedChange, unassignedLabel } from '@/app/texts'
import { isShort } from '@/domain/leave/amount'
import type { GrantYearDelta } from '@/domain/view/addPreview'

/** §5.1・§5.2: 未割り当ての前後の行。付与年ごとに 1 行。足りなくなる行は警告の色で出す（F-211）。M-1 と M-2 の期間で使う */
export function UnassignedLines({ deltas, workMinutes }: { deltas: readonly GrantYearDelta[]; workMinutes: number }) {
  return (
    <>
      {deltas.map((d) => (
        <p key={d.grantYearStart} className={isShort(d.after) ? 'font-bold text-warn-ink' : ''}>
          {unassignedChange(unassignedLabel(d.position, deltas.length), d.before, d.after, workMinutes)}
        </p>
      ))}
    </>
  )
}
