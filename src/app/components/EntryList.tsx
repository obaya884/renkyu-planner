import { T, amountText, formatDay, runHeading } from '@/app/texts'
import type { LeaveType } from '@/domain/types'
import type { EntryBlock, EntryRow } from '@/domain/view/quarterView'

/** 「長め」の札を付ける連休の日数（R-14）。組み立て側の定数と同じ値 */
const LONG_RUN_DAYS = 5

type RowProps = {
  workMinutes: number
  leaveTypes: readonly LeaveType[]
  onOpen: (id: string) => void
  onMarkDone: (id: string) => void
}

function Row({ row, workMinutes, leaveTypes, onOpen, onMarkDone }: { row: EntryRow } & RowProps) {
  const { entry, overdue, overlap, run } = row
  const typeName = leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name
  const first = [formatDay(entry.date), amountText(entry.amount, workMinutes), entry.title].filter((s) => s !== '').join(' ')
  const status = entry.done ? T.done : T.planned
  const second = [status, overdue ? T.overdue : null, entry.leaveTypeId === 'paid' ? null : (typeName ?? null), run === null ? null : runHeading(run)].filter(
    (s) => s !== null,
  )
  return (
    <li className="flex items-center">
      <button type="button" onClick={() => onOpen(entry.id)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between py-1 text-left">
        <span className="min-w-0">
          <span className="block">{first}</span>
          <span className="block text-sm text-sub">
            <span className={overdue ? 'text-warn-ink' : ''}>{second.join('・')}</span>

            {overlap && <span className="ml-2 text-warn-ink">{T.overlap}</span>}
          </span>
        </span>
        {!overdue && <span aria-hidden className="ml-2 text-sub">›</span>}
      </button>
      {overdue && (
        <button
          type="button"
          onClick={() => onMarkDone(entry.id)}
          className="ml-2 min-h-11 shrink-0 rounded-lg bg-warn-bg px-3 text-sm text-warn-ink"
        >
          {T.markDone}
        </button>
      )}
    </li>
  )
}

/** §3.8。1 日 1 行。同じ連休に入る日程が 2 件以上なら連休の見出しを 1 行置く */
export function EntryList({ blocks, onAddDay, ...rowProps }: { blocks: readonly EntryBlock[]; onAddDay: () => void } & RowProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{T.entries}</h3>
        <button type="button" onClick={onAddDay} className="min-h-11 px-1 text-sm text-primary">
          {T.addDay}
        </button>
      </div>
      {blocks.length === 0 ? (
        <p className="text-sm text-sub">{T.noEntries}</p>
      ) : (
        <ul className="divide-y divide-line">
          {blocks.map((block) => (
            <li key={block.rows[0].entry.id}>
              {block.run !== null && (
                <div className="pt-1 text-sm font-bold text-long-ink">
                  {runHeading(block.run)}
                  {block.run.days >= LONG_RUN_DAYS && <span className="ml-2 rounded bg-long-bg px-1.5">{T.long}</span>}
                </div>
              )}
              <ul>
                {block.rows.map((row) => (
                  <Row key={row.entry.id} row={row} {...rowProps} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
