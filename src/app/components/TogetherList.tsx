import { T, formatPeriod, joinNotes, togetherHeading, togetherRest, togetherText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { TogetherBlock, TogetherRow } from '@/domain/view/quarterView'

type OnAdd = (leaveDays: readonly IsoDate[], leaveTypeId: string) => void

function Row({ row, leaveTypeId, onAdd }: { row: TogetherRow; leaveTypeId: string; onAdd: OnAdd }) {
  const second = [formatPeriod(row.run), row.nextGrantYear ? T.nextGrantYear : null].filter((s) => s !== null)
  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <div>
          {togetherText(row)}
          {row.long && <span className="ml-2 rounded bg-long-bg px-1.5 text-sm text-long-ink">{T.long}</span>}
          {row.unconfirmed && <span className="ml-2 text-sm text-sub">{T.unconfirmed}</span>}
        </div>
        <div className="text-sm text-sub">{joinNotes(second)}</div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(row.leaveDays, leaveTypeId)}
        className="min-h-11 shrink-0 rounded-lg border border-primary px-3 text-sm text-primary"
      >
        {T.addToPlan}
      </button>
    </li>
  )
}

/** §3.7。まとめて取る休暇の組。種類ごとに見出し、先頭の 1 件、残りを標準の <details> にまとめる（状態は持たない） */
export function TogetherList({ blocks, onAdd }: { blocks: readonly TogetherBlock[]; onAdd: OnAdd }) {
  if (blocks.length === 0) return null
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <div key={block.leaveTypeId}>
          <h4 className="text-sm font-bold">{togetherHeading(block.leaveTypeName, block.days)}</h4>
          <ul className="divide-y divide-line">
            <Row row={block.primary} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
          </ul>
          {block.rest.length > 0 && (
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center rounded-lg bg-card px-3 text-sm">{togetherRest(block.rest.length)}</summary>
              <ul className="mt-1 divide-y divide-line">
                {block.rest.map((row) => (
                  <Row key={row.leaveDays.join()} row={row} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}
