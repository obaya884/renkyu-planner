import { Card, MoreRow, StripRow } from '@/app/components/CandidateCard'
import { togetherDays, togetherHeading, togetherNotes, togetherRest } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { TogetherBlock, TogetherRow } from '@/domain/view/quarterView'

type OnAdd = (leaveDays: readonly IsoDate[], leaveTypeId: string) => void

function Row({ row, leaveTypeId, onAdd }: { row: TogetherRow; leaveTypeId: string; onAdd: OnAdd }) {
  return (
    <StripRow
      days={togetherDays(row.leaveDays)}
      run={row.run}
      long={row.long}
      strip={row.strip}
      notes={togetherNotes(row)}
      onAdd={() => onAdd(row.leaveDays, leaveTypeId)}
    />
  )
}

/** §3.7。まとめて取る休暇の組を種類ごとにカードにする。先頭の 1 件、残りを標準の <details> にまとめる（状態は持たない） */
export function TogetherList({ blocks, onAdd }: { blocks: readonly TogetherBlock[]; onAdd: OnAdd }) {
  if (blocks.length === 0) return null
  return (
    <div className="space-y-3.5">
      {blocks.map((block) => (
        <Card key={block.leaveTypeId} heading={togetherHeading(block.leaveTypeName, block.days)}>
          <ul>
            <Row row={block.primary} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
          </ul>
          {block.rest.length > 0 && (
            <MoreRow summary={togetherRest(block.rest.length)}>
              {block.rest.map((row) => (
                <Row key={row.leaveDays.join()} row={row} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
              ))}
            </MoreRow>
          )}
        </Card>
      ))}
    </div>
  )
}
