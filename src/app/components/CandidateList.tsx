import { Card, MoreRow, StripRow } from '@/app/components/CandidateCard'
import { T, candidateTake, coreHeading, leaveDaysUsed, monthGapLine, restSummary, shortText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { CandidateBlock, CandidateRow } from '@/domain/view/quarterView'

type Props = { workMinutes: number; onAdd: (leaveDays: readonly IsoDate[]) => void }

function Row({ row, workMinutes, onAdd }: { row: CandidateRow } & Props) {
  const notes = [
    row.leaveDays.length >= 2 ? leaveDaysUsed(row.leaveDays.length) : null,
    row.nextGrantYear ? T.nextGrantYear : null,
    row.unconfirmed ? T.unconfirmed : null,
  ].filter((s) => s !== null)
  return (
    <StripRow
      take={candidateTake(row.leaveDays)}
      runDays={row.run.days}
      long={row.long}
      strip={row.strip}
      notes={notes}
      warn={row.shortMinutes === null ? null : shortText(row.leaveTypeName, row.shortMinutes, workMinutes)}
      onAdd={() => onAdd(row.leaveDays)}
    />
  )
}

/** §3.7（試作 D 案）。組ごとにカードにし、祝日のない月はカード 1 枚にまとめる。開く行は標準の <details>（状態は持たない） */
export function CandidateList({ blocks, workMinutes, onAdd }: { blocks: readonly CandidateBlock[] } & Props) {
  if (blocks.length === 0) return null
  const groups = blocks.filter((b) => b.kind === 'group')
  const gaps = blocks.filter((b) => b.kind === 'monthGap')
  return (
    <div className="space-y-3.5">
      {groups.map((block) => (
        <Card key={`group-${block.core}`} heading={coreHeading(block.head)}>
          <ul>
            {block.primary.map((row) => (
              <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
            ))}
          </ul>
          {block.rest.length > 0 && (
            <MoreRow summary={restSummary(block.rest.length)} tag={block.restHasLong ? T.restHasLong : null}>
              {block.rest.map((row) => (
                <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
              ))}
            </MoreRow>
          )}
        </Card>
      ))}
      {gaps.length > 0 && (
        <Card heading={T.noHolidayMonths}>
          {gaps.map((block) => (
            <MoreRow key={`gap-${block.month}`} summary={monthGapLine(block.month, block.runDays, block.rows.length)}>
              {block.rows.map((row) => (
                <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
              ))}
            </MoreRow>
          ))}
        </Card>
      )}
    </div>
  )
}
