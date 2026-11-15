import { Card, MoreRow, StripRow } from '@/app/components/CandidateCard'
import { T, togetherHeading, togetherRest, togetherTake } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { Strip, TogetherBlock, TogetherRow } from '@/domain/view/quarterView'

type OnAdd = (leaveDays: readonly IsoDate[], leaveTypeId: string) => void

function Row({ row, strip, leaveTypeId, onAdd }: { row: TogetherRow; strip: Strip; leaveTypeId: string; onAdd: OnAdd }) {
  const notes = [row.nextGrantYear ? T.nextGrantYear : null, row.unconfirmed ? T.unconfirmed : null].filter((s) => s !== null)
  return (
    <StripRow
      take={togetherTake(row.leaveDays)}
      runDays={row.run.days}
      long={row.long}
      strip={strip}
      notes={notes}
      onAdd={() => onAdd(row.leaveDays, leaveTypeId)}
    />
  )
}

/** §3.7（試作 D 案）。まとめて取る休暇の組を種類ごとにカードにする。先頭の 1 件、残りを標準の <details> にまとめる（状態は持たない） */
export function TogetherList({ blocks, onAdd }: { blocks: readonly TogetherBlock[]; onAdd: OnAdd }) {
  if (blocks.length === 0) return null
  return (
    <div className="space-y-3.5">
      {blocks.map((block) => (
        <Card key={block.leaveTypeId} heading={togetherHeading(block.leaveTypeName, block.days)}>
          <ul>
            <Row row={block.primary} strip={block.primaryStrip} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
          </ul>
          {block.rest.length > 0 && (
            <MoreRow summary={togetherRest(block.rest.length)}>
              {block.rest.map((row, i) => (
                <Row key={row.leaveDays.join()} row={row} strip={block.restStrips[i]} leaveTypeId={block.leaveTypeId} onAdd={onAdd} />
              ))}
            </MoreRow>
          )}
        </Card>
      ))}
    </div>
  )
}
