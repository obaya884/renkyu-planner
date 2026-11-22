import { Card, MoreRow, StripRow } from '@/app/components/CandidateCard'
import { T, candidateDays, candidateNotes, coreHeading, monthGapLine, restLongestText, restSummary, shortNote } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { CandidateGroupView, CandidateRow, MonthGapBlock } from '@/domain/view/quarterView'

type Props = { workMinutes: number; onAdd: (leaveDays: readonly IsoDate[]) => void }

function Row({ row, workMinutes, onAdd }: { row: CandidateRow } & Props) {
  return (
    <StripRow
      days={candidateDays(row.leaveDays)}
      run={row.run}
      long={row.long}
      strip={row.strip}
      notes={candidateNotes(row)}
      warn={shortNote(row, workMinutes)}
      onAdd={() => onAdd(row.leaveDays)}
    />
  )
}

/** §3.7。組ごとにカードにし、祝日のない月はカード 1 枚にまとめる。開く行は標準の <details>（状態は持たない） */
export function CandidateList({ groups, monthGaps, workMinutes, onAdd }: { groups: readonly CandidateGroupView[]; monthGaps: readonly MonthGapBlock[] } & Props) {
  if (groups.length === 0 && monthGaps.length === 0) return null
  return (
    <div className="space-y-3.5">
      {groups.map((group) => (
        <Card key={`group-${group.core}`} heading={coreHeading(group.head)}>
          <ul>
            {group.primary.map((row) => (
              <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
            ))}
          </ul>
          {group.rest.length > 0 && (
            <MoreRow summary={restSummary(group.rest.length)} tag={{ text: restLongestText(group.restLongest.days), long: group.restLongest.long }}>
              {group.rest.map((row) => (
                <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
              ))}
            </MoreRow>
          )}
        </Card>
      ))}
      {monthGaps.length > 0 && (
        <Card heading={T.noHolidayMonths}>
          {monthGaps.map((gap) => (
            <MoreRow key={`gap-${gap.month}`} summary={monthGapLine(gap.month, gap.runDays, gap.rows.length)}>
              {gap.rows.map((row) => (
                <Row key={row.leaveDays.join()} row={row} workMinutes={workMinutes} onAdd={onAdd} />
              ))}
            </MoreRow>
          ))}
        </Card>
      )}
    </div>
  )
}
