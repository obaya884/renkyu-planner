import { T, candidateText, formatPeriod, leaveDaysUsed, monthGapSummary, restSummary, shortText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { CandidateBlock, CandidateRow } from '@/domain/view/quarterView'

type Props = { workMinutes: number; onAdd: (leaveDays: readonly IsoDate[]) => void }

function Row({ row, workMinutes, onAdd }: { row: CandidateRow } & Props) {
  const second = [
    formatPeriod(row.run),
    row.leaveDays.length >= 2 ? leaveDaysUsed(row.leaveDays.length) : null,
    row.nextGrantYear ? T.nextGrantYear : null,
  ].filter((s) => s !== null)
  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <div>
          {candidateText(row)}
          {row.long && <span className="ml-2 rounded bg-long-bg px-1.5 text-sm text-long-ink">{T.long}</span>}
          {row.unconfirmed && <span className="ml-2 text-sm text-sub">{T.unconfirmed}</span>}
        </div>
        <div className="text-sm text-sub">
          {second.join('・')}
          {row.shortMinutes !== null && (
            <span className="ml-2 font-bold text-warn-ink">{shortText(row.shortMinutes, workMinutes)}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(row.leaveDays)}
        className="min-h-11 shrink-0 rounded-lg border border-primary px-3 text-sm text-primary"
      >
        {T.addToPlan}
      </button>
    </li>
  )
}

const SUMMARY_CLASS = 'flex min-h-11 cursor-pointer items-center rounded-lg bg-card px-3 text-sm'

/** §3.7。まとめた行と祝日のない月の行は標準の <details> で開閉する（状態は持たない） */
export function CandidateList({ blocks, workMinutes, onAdd }: { blocks: readonly CandidateBlock[] } & Props) {
  if (blocks.length === 0) return <p className="text-sm text-sub">{T.noCandidates}</p>
  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        if (block.kind === 'monthGap') {
          const runDays = Math.min(...block.rows.map((r) => r.run.days))
          return (
            <details key={`gap-${block.month}`}>
              <summary className={SUMMARY_CLASS}>{monthGapSummary(block.month, runDays, block.rows.length)}</summary>
              <ul className="mt-1 divide-y divide-line">
                {block.rows.map((row) => (
                  <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
                ))}
              </ul>
            </details>
          )
        }
        return (
          <div key={`group-${block.core}`}>
            <ul className="divide-y divide-line">
              {block.primary.map((row) => (
                <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
              ))}
            </ul>
            {block.rest.length > 0 && (
              <details>
                <summary className={SUMMARY_CLASS}>
                  {restSummary(block.rest.length)}
                  {block.restHasLong && <span className="ml-2 rounded bg-long-bg px-1.5 text-long-ink">{T.restHasLong}</span>}
                </summary>
                <ul className="mt-1 divide-y divide-line">
                  {block.rest.map((row) => (
                    <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )
      })}
    </div>
  )
}
