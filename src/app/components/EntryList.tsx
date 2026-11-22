import { T, amountText, formatDay, joinNotes, runHeading, runHeadingParts } from '@/app/texts'
import type { EntryBlock, EntryRow } from '@/domain/view/quarterView'

type RowProps = {
  workMinutes: number
  onOpen: (id: string) => void
}

/** inBlock: 連休の見出しの下の行。連休は見出しに出すので、2 行目には添えない（§3.8） */
function Row({ row, inBlock, workMinutes, onOpen }: { row: EntryRow; inBlock: boolean } & RowProps) {
  const { entry, taken, overlap, run, leaveTypeName } = row
  const first = [formatDay(entry.date), amountText(entry.amount, workMinutes), entry.title].filter((s) => s !== '').join(' ')
  const status = taken ? T.done : T.planned
  const second = [status, leaveTypeName, run === null || inBlock ? null : runHeading(run)].filter(
    (s) => s !== null,
  )
  return (
    <li className="flex items-center">
      <button type="button" onClick={() => onOpen(entry.id)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between py-1 text-left">
        <span className="min-w-0">
          <span className="block">{first}</span>
          <span className="block text-sm text-sub">
            <span>{joinNotes(second)}</span>

            {overlap && <span className="ml-2 text-warn-ink">{T.overlap}</span>}
          </span>
        </span>
        <span aria-hidden className="ml-2 text-sub">›</span>
      </button>
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
                <div className="pt-1 text-sm font-bold">
                  {runHeadingParts(block.run).lead}
                  <span className={block.long ? 'text-long-ink' : undefined}>{runHeadingParts(block.run).days}</span>
                </div>
              )}
              <ul>
                {block.rows.map((row) => (
                  <Row key={row.entry.id} row={row} inBlock={block.run !== null} {...rowProps} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
