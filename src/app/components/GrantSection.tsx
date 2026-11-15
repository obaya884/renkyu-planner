import { T, grantDayText, grantYearPeriod, grantYearRowText } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import type { GrantSectionView, GrantYearRow } from '@/domain/view/settingsView'

const ROW_CLASS = 'flex min-h-11 w-full flex-wrap items-center gap-x-3 py-2 text-left'

function RowBody({ row, isNext, workMinutes }: { row: GrantYearRow; isNext: boolean; workMinutes: number }) {
  return (
    <>
      <span>{grantYearPeriod(row.start, row.end)}</span>
      <span className="text-sub">{grantYearRowText(row, isNext, workMinutes)}</span>
    </>
  )
}

/** §6 の有休の節。付与年の行の文は texts.ts、並びは domain/view の組み立てのまま描く */
export function GrantSection({
  view,
  workMinutes,
  onOpen,
  onFirst,
}: {
  view: GrantSectionView | null
  workMinutes: number
  onOpen: (grantYearStart: IsoDate) => void
  onFirst: () => void
}) {
  if (view === null) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={onFirst} className={ROW_CLASS}>
          <span>{T.grantDayRowLabel}</span>
          <span className="text-sub">{T.grantDayUnset}</span>
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {/* 付与日の行を押したときの動きは、別のタスクで足す */}
      <div className={ROW_CLASS}>
        <span>{T.grantDayRowLabel}</span>
        <span>{grantDayText(view.grantDay)}</span>
      </div>
      {[view.current, view.next].map((row, i) => (
        <button key={row.start} type="button" onClick={() => onOpen(row.start)} className={ROW_CLASS}>
          <RowBody row={row} isNext={i === 1} workMinutes={workMinutes} />
        </button>
      ))}
      {view.past.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">{T.viewPastGrantYears}</summary>
          {view.past.map((row) => (
            <div key={row.start} className={ROW_CLASS}>
              <RowBody row={row} isNext={false} workMinutes={workMinutes} />
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
